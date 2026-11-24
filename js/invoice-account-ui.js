import {invoiceFilename, showInvoiceFile} from './invoice-files.js';
import {esc} from './ui.js';

const pageSize = 25;
const labels = {fee: 'BuyMe-Servicegebühr', purchase: 'Kaufrechnung'};

export async function loadAccountInvoices(client, panel) {
  const status = panel.querySelector('[role=status]');
  const more = panel.querySelector('[data-invoice-more]');
  const list = panel.querySelector('ul');
  const known = new Map();
  let last;
  let busy = false;
  const next = async () => {
    if (busy) return;
    busy = true;
    more.disabled = true;
    status.textContent = 'Rechnungen werden geladen …';
    try {
      let query = client.from('buyme_invoice_documents')
        .select('id,issuer_name,number,reference,issued_on,kind,format,corrects_id')
        .order('issued_on', {ascending: false}).order('id', {ascending: false}).limit(pageSize + 1);
      if (last) query = query.or(`issued_on.lt.${last.issued_on},and(issued_on.eq.${last.issued_on},id.lt.${last.id})`);
      const {data, error} = await query;
      if (error) throw error;
      if (!panel.isConnected) return;
      for (const invoice of data.slice(0, pageSize)) {
        known.set(invoice.id, invoice);
        last = invoice;
        list.insertAdjacentHTML('beforeend', `<li>
          <strong>${(invoice.corrects_id ? 'Rechnungskorrektur · ' : '') + esc(labels[invoice.kind])} · ${esc(invoice.number)}</strong>
          <small>${esc(invoice.issuer_name)} · ${esc(invoice.issued_on.split('-').reverse().join('.'))} · ${esc(invoice.reference)}</small>
          <div class="invoice-actions" data-invoice-id="${esc(invoice.id)}">
            <button type="button" class="btn secondary" data-invoice-file="pdf">${invoice.format === 'xrechnung' ? 'PDF-Ansicht herunterladen' : invoice.format === 'zugferd' ? 'ZUGFeRD-PDF herunterladen' : 'PDF herunterladen'}</button>
            <button type="button" class="btn secondary" data-invoice-file="print">Druckansicht</button>
            ${invoice.format === 'xrechnung' ? '<button type="button" class="btn secondary" data-invoice-file="xml">XRechnung herunterladen</button>' : ''}
          </div>
        </li>`);
      }
      status.textContent = known.size ? '' : 'Für dein Konto sind noch keine Rechnungen hinterlegt.';
      more.textContent = 'Weitere Rechnungen laden';
      more.hidden = data.length <= pageSize;
    } catch {
      status.textContent = 'Rechnungen konnten nicht geladen werden.';
      more.textContent = 'Erneut versuchen';
      more.hidden = false;
    } finally {
      more.disabled = false;
      busy = false;
    }
  };
  more.addEventListener('click', next);
  panel.addEventListener('click', async event => {
    const button = event.target.closest('[data-invoice-file]');
    if (!button || button.disabled) return;
    const invoice = known.get(button.closest('[data-invoice-id]')?.dataset.invoiceId);
    if (!invoice) return;
    const mode = button.dataset.invoiceFile;
    const extension = mode === 'xml' ? 'xml' : 'pdf';
    if (extension === 'xml' && invoice.format !== 'xrechnung') return;
    const path = invoice.id + (extension === 'xml' ? '/original.xml' : '/print.pdf');
    button.disabled = true;
    try {
      await showInvoiceFile(async () => {
        const {data, error} = await client.storage.from('buyme-invoices').download(path, {}, {cache: 'no-store'});
        if (error || !data || !panel.isConnected) throw Error('Die Rechnungsdatei konnte nicht geladen werden.');
        if (extension === 'pdf' && await data.slice(0, 5).text() !== '%PDF-') {
          throw Error('Für diese Rechnung ist die PDF-Datei beschädigt.');
        }
        return new Blob([data], {type: extension === 'pdf' ? 'application/pdf' : 'application/octet-stream'});
      }, invoiceFilename(invoice.number, extension), mode === 'print');
      status.textContent = mode === 'print' ? 'Wähle im geöffneten PDF die Druckfunktion.' : '';
    } catch (error) {
      status.textContent = error.message;
    } finally { button.disabled = false; }
  });
  await next();
}

export const accountInvoicePanel = `<section class="invoice-panel" data-account-invoices aria-labelledby="account-invoices-title">
  <h2 id="account-invoices-title">Meine Rechnungen</h2>
  <p>Öffne die Druckansicht und drucke die Rechnung im PDF-Viewer. Bei einer XRechnung steht zusätzlich die Originaldatei zum Download bereit.</p>
  <p role="status"></p><ul class="invoice-list"></ul>
  <button type="button" class="btn secondary" data-invoice-more hidden>Weitere Rechnungen laden</button>
</section>`;
