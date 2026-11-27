import {canSimulateFee, demoInvoices} from './invoice-model.js';
import {date, money} from './model.js';
import {esc} from './ui.js';

export function demoInvoiceList(invoices, empty) {
  if (!invoices.length) return '<p>' + esc(empty) + '</p>';
  return `<ul class="invoice-list">${invoices.map(invoice => `
    <li>
      <strong>${esc(invoice.title)} · ${money(invoice.totalCents / 100)}</strong>
      <small>${esc(invoice.issuer)} · ${esc(invoice.reference)}${invoice.date ? ' · ' + esc(date(invoice.date)) : ''}</small>
      <div class="invoice-actions">
        <button type="button" class="btn secondary small" data-action="invoice-pdf" data-id="${esc(invoice.id)}">PDF herunterladen</button>
        <button type="button" class="btn secondary small" data-action="invoice-print" data-id="${esc(invoice.id)}">Druckansicht</button>
      </div>
    </li>`).join('')}</ul>`;
}

export function providerInvoicePanel(state, actor) {
  if (actor?.role !== 'provider') return '';
  const eligible = state.deals.filter(deal => deal.providerId === actor.id && canSimulateFee(deal));
  return `<section class="panel invoice-panel" aria-labelledby="fee-invoices">
    <h2 id="fee-invoices">Rechnungen zur BuyMe-Servicegebühr</h2>
    <p>Musterbelege. Die Gebühr wird getrennt vom Cashback des Mitglieds abgerechnet.</p>
    ${demoInvoiceList(demoInvoices(state, actor), 'Für dein Anbieter-Konto liegen noch keine Musterrechnungen vor.')}
    ${eligible.length ? `<h3>Testzahlung erfassen</h3>
      <ul class="invoice-list">${eligible.map(deal => `<li><strong>${esc(deal.offer)} · ${money(deal.fee)}</strong>
        <small>${esc(deal.id)}</small>
        <button type="button" class="btn secondary small" data-action="invoice-fee" data-id="${esc(deal.id)}">Servicegebühr im Test bezahlen</button>
      </li>`).join('')}</ul>` : ''}
  </section>`;
}

export function purchaseInvoicePanel(invoices) {
  if (!invoices.length) return '';
  return `<section class="invoice-panel"><h3>Kaufrechnungen je Verkäufer</h3>
    <p>Musterbelege zur Testbestellung. Wähle in der Druckansicht „Drucken“.</p>
    ${demoInvoiceList(invoices, '')}</section>`;
}

export function printDemoInvoice(invoice) {
  const tab = window.open('', '_blank');
  if (!tab) throw Error('Bitte Pop-ups für BuyMe erlauben oder die PDF herunterladen und öffnen.');
  tab.opener = null;
  const doc = tab.document;
  doc.documentElement.lang = 'de';
  doc.title = 'BuyMe · Musterrechnung';
  const style = doc.createElement('style');
  style.textContent = `
    body {font: 15px/1.5 system-ui, sans-serif; color: #123563; max-width: 850px; margin: 2rem auto; padding: 1rem; overflow-wrap: anywhere;}
    table {width: 100%; border-collapse: collapse;}
    td, th {padding: 0.5rem; border-bottom: 1px solid #dce5f2; text-align: left;}
    .amount {text-align: right;}
    .parties {display: flex; gap: 2rem; flex-wrap: wrap; white-space: pre-line;}
    .parties > div {flex: 1 1 230px;}
    button {padding: 0.65rem 1rem; font: inherit; cursor: pointer;}
    @media print {button {display: none;} body {margin: 0; padding: 0;}}
  `;
  doc.head.append(style);
  doc.body.innerHTML = `<main>
    <p><strong>MUSTER – KEINE STEUERRECHNUNG</strong></p>
    <h1>${esc(invoice.title)}</h1>
    <p>Belegnummer: ${esc(invoice.id)}<br>Bezug: ${esc(invoice.reference)}
      ${invoice.date ? '<br>Testdatum: ' + esc(date(invoice.date)) : ''}</p>
    <div class="parties"><div><strong>Aussteller im Test</strong><br>${esc(invoice.issuer)}</div>
      <div><strong>Empfänger im Test</strong><br>${esc(invoice.recipient)}</div></div>
    <table><thead><tr><th scope="col">Leistung</th><th scope="col">Menge</th><th scope="col" class="amount">Einzelbetrag</th><th scope="col" class="amount">Betrag</th></tr></thead>
    <tbody>${invoice.lines.map(line => `<tr><td>${esc([line.title, line.variant].filter(Boolean).join(' · '))}</td>
      <td>${esc(line.quantity)}</td><td class="amount">${money(line.unitCents / 100)}</td><td class="amount">${money(line.totalCents / 100)}</td></tr>`).join('')}</tbody></table>
    <p class="amount"><strong>Summe: ${money(invoice.totalCents / 100)}</strong></p>
    <p>Fiktiver Beleg für die BuyMe-Testplattform. Keine echte Zahlung. Kein Umsatzsteuerausweis. Cashback wird getrennt behandelt.</p>
    <button type="button">Drucken</button></main>`;
  doc.querySelector('button').addEventListener('click', () => tab.print());
}
