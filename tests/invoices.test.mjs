import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../js/model.js';
import {addToCart, checkout} from '../js/commerce.js';
import {cancelMemberDeal} from '../js/platform-model.js';
import {demoInvoices, simulateFeePayment} from '../js/invoice-model.js';
import {ordersPage} from '../js/commerce-ui.js';
import {demoInvoicePdf} from '../js/invoice-pdf.js';

const buyer = {role: 'member', id: 'U-2108'};
const form = {
  token: 'invoices-checkout-test', name: 'Lena Muster', email: 'lena@example.test',
  address: 'Demostraße 12', postalCode: '01234', city: 'Teststadt', method: 'card', accepted: true
};

test('only paid items appear in one customer invoice per seller; refunds preserve the original', async () => {
  const state = createSeed();
  for (const id of ['OF-SHOP-TABLET', 'OF-SHOP-SCHUHE']) {
    const offer = state.offers.find(candidate => candidate.id === id);
    addToCart(state, buyer.id, id, offer.purchase.variants[0]);
  }
  checkout(state, buyer.id, {...form, outcome: 'failed'});
  assert.equal(demoInvoices(state, buyer).length, 0);
  const order = checkout(state, buyer.id, {...form, token: form.token + '-retry', outcome: 'success'});
  const originals = demoInvoices(state, buyer);
  assert.equal(originals.length, 2);
  assert.equal(originals.reduce((total, invoice) => total + invoice.totalCents, 0), order.totalCents);
  assert.equal(demoInvoices(state, {role: 'member', id: 'U-2107'}).length, 0);
  assert.equal(demoInvoices(state, {role: 'provider', id: order.items[0].providerId}).length, 0);
  assert.match(ordersPage(state, 'member', buyer.id, order.id), /PDF herunterladen/);
  assert.doesNotMatch(ordersPage(state, 'provider', order.items[0].providerId, order.id), /PDF herunterladen/);
  const item = order.items[0];
  state.providers.find(provider => provider.id === item.providerId).name = 'Neuer Firmenname';
  cancelMemberDeal(state, item.dealId, buyer.id, 'Testbestellung widerrufen.');
  const afterRefund = demoInvoices(state, buyer);
  assert.deepEqual(afterRefund.filter(invoice => invoice.title === 'Kaufrechnung').map(invoice => invoice.issuer),
    originals.map(invoice => invoice.issuer));
  const correction = afterRefund.find(invoice => invoice.title === 'Rechnungskorrektur');
  assert.equal(correction.reference, originals.find(invoice => invoice.issuer === item.sellerName).id);
  assert.equal(correction.totalCents, -item.totalCents);
  assert.ok(correction.date);
  const pdf = await demoInvoicePdf(afterRefund[0]);
  assert.equal(await pdf.slice(0, 5).text(), '%PDF-');
});

test('a provider can record a demo service-fee payment once, without touching the cashback or budget', () => {
  const state = createSeed();
  const deal = state.deals.find(deal => deal.status === 'completed' && deal.funded && deal.fee > 0);
  const seller = {role: 'provider', id: deal.providerId};
  const differentSeller = {role: 'provider', id: state.providers.find(provider => provider.id !== seller.id).id};
  const provider = state.providers.find(provider => provider.id === seller.id);
  const before = [deal.cashback, deal.payment, deal.reserved, provider.credit];
  assert.throws(() => simulateFeePayment(state, buyer, deal.id));
  assert.throws(() => simulateFeePayment(state, differentSeller, deal.id));
  assert.equal(demoInvoices(state, seller).length, 0);
  const invoice = simulateFeePayment(state, seller, deal.id);
  assert.equal(invoice.totalCents, Math.round(deal.fee * 100));
  assert.equal(invoice.recipient, provider.name);
  assert.deepEqual([deal.cashback, deal.payment, deal.reserved, provider.credit], before);
  assert.throws(() => simulateFeePayment(state, seller, deal.id));
  assert.equal(demoInvoices(state, differentSeller).length, 0);
  assert.equal(demoInvoices(state, seller).length, 1);
});
