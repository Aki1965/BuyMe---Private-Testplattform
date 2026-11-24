import {readFile, stat} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';

const bucket = 'buyme-invoices';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const maxBytes = 15 * 1024 * 1024;

function validateMetadata(data) {
  const {id, recipient_id, issuer_key, issuer_name, number, reference, issued_on, kind, format, corrects_id = null} = data;
  if (![id, recipient_id].every(value => typeof value === 'string' && uuid.test(value))
    || (corrects_id !== null && (typeof corrects_id !== 'string' || !uuid.test(corrects_id) || corrects_id === id))) {
    throw Error('Dokument-ID, Empfänger-ID oder Korrekturverweis ist ungültig.');
  }
  for (const [value, limit] of [[issuer_key, 100], [issuer_name, 200], [number, 100], [reference, 150]]) {
    if (typeof value !== 'string' || !value.trim() || value.length > limit) throw Error('Unvollständige Rechnungsreferenzen.');
  }
  const date = new Date(issued_on);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issued_on) || !Number.isFinite(+date) || date.toISOString().slice(0, 10) !== issued_on
    || !['fee', 'purchase'].includes(kind) || !['pdf', 'zugferd', 'xrechnung'].includes(format)) {
    throw Error('Ungültiges Rechnungsdatum, ungültige Belegart oder ungültiges Format.');
  }
  return {id, recipient_id, issuer_key, issuer_name, number, reference, issued_on, kind, format, corrects_id};
}

async function readDocument(file, type) {
  const fileInfo = await stat(file);
  if (!fileInfo.isFile() || !fileInfo.size || fileInfo.size > maxBytes) throw Error('Ungültige Rechnungsdatei oder mehr als 15 MiB.');
  const bytes = await readFile(file);
  if (type === 'application/pdf' && bytes.subarray(0, 5).toString() !== '%PDF-') throw Error('Eine PDF-Datei wurde erwartet.');
  if (type === 'application/xml' && !bytes.toString('utf8', 0, 512).trimStart().startsWith('<')) {
    throw Error('Eine UTF-8-XML-Datei wurde erwartet.');
  }
  return bytes;
}

async function putWithoutOverwrite(storage, path, bytes, contentType) {
  const {error} = await storage.upload(path, bytes, {contentType, cacheControl: '0', upsert: false});
  if (!error) return;
  // A retry is safe only when the stored bytes match the exported original.
  const {data, error: readError} = await storage.download(path);
  if (readError || !data || !bytes.equals(Buffer.from(await data.arrayBuffer()))) {
    throw Error('Rechnungsdatei konnte nicht neu abgelegt werden oder weicht von der vorhandenen Datei ab.');
  }
}

async function main() {
  const [metadataFile, pdfFile, xmlFile, ...extra] = process.argv.slice(2);
  if (!metadataFile || !pdfFile || extra.length) {
    throw Error('Aufruf: node scripts/publish-invoice.mjs metadaten.json Rechnung.pdf [Original.xml]');
  }
  const metadata = validateMetadata(JSON.parse(await readFile(metadataFile, 'utf8')));
  if ((metadata.format === 'xrechnung') !== Boolean(xmlFile)) throw Error('Nur bei XRechnung ist die Original-XML als drittes Argument erforderlich.');
  const pdf = await readDocument(pdfFile, 'application/pdf');
  const xml = xmlFile && await readDocument(xmlFile, 'application/xml');
  const url = process.env.BUYME_INVOICE_IMPORT_SUPABASE_URL;
  const key = process.env.BUYME_INVOICE_IMPORT_SECRET_KEY;
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url || '') || !key) throw Error('Geschützte Import-Konfiguration fehlt.');
  const client = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
  const {data: recipient, error: recipientError} = await client.auth.admin.getUserById(metadata.recipient_id);
  if (recipientError || !recipient?.user?.email_confirmed_at) throw Error('Kein bestätigtes Empfängerkonto gefunden.');
  const table = () => client.from('buyme_invoice_documents');
  const columns = Object.keys(metadata).join(',');
  const find = async () => {
    const {data, error} = await table().select(columns)
      .eq('issuer_key', metadata.issuer_key).eq('number', metadata.number).maybeSingle();
    if (error) throw Error('Rechnungsreferenzen konnten nicht geprüft werden.');
    if (data && !Object.keys(metadata).every(field => metadata[field] === data[field])) {
      throw Error('Diese Rechnungsnummer ist bereits mit abweichenden Daten erfasst.');
    }
    return data;
  };
  const existing = await find();
  const storage = client.storage.from(bucket);
  await putWithoutOverwrite(storage, metadata.id + '/print.pdf', pdf, 'application/pdf');
  if (xml) await putWithoutOverwrite(storage, metadata.id + '/original.xml', xml, 'application/xml');
  if (!existing) {
    const {error} = await table().insert(metadata);
    if (error && !await find()) throw Error('Rechnung konnte nach dem Datei-Upload nicht veröffentlicht werden.');
  }
  console.log(existing ? 'Rechnung bereits mit denselben Daten veröffentlicht.' : 'Rechnung im geschützten Empfängerkonto bereitgestellt.');
}

try { await main(); }
catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
