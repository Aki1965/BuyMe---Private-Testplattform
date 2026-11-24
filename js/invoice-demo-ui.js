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
    <p>Musterbelege zur Testbestellung. Wähle in der Druckansicht die Druckfunktion deines Browsers.</p>
    ${demoInvoiceList(invoices, '')}</section>`;
}
