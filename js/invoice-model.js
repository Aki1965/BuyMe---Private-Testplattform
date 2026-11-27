import {event} from './model.js';

const invoice = (id, title, issuer, recipient, date, reference, lines) => ({
  id, title, issuer, recipient, date, reference, lines,
  totalCents: lines.reduce((total, line) => total + line.totalCents, 0)
});

function purchaseInvoices(state, memberId) {
  return (state.orders || []).filter(order =>
    order.userId === memberId && ['paid', 'partial_refund', 'refunded'].includes(order.status)
  ).flatMap(order => {
    const sellers = new Map();
    for (const item of order.items) {
      if (!sellers.has(item.providerId)) sellers.set(item.providerId, []);
      sellers.get(item.providerId).push(item);
    }
    return [...sellers].flatMap(([sellerId, items]) => {
      const seller = items[0].sellerName || state.deals.find(deal => deal.id === items[0].dealId)?.provider || sellerId;
      const id = 'TEST-KAUF-' + order.id + '-' + sellerId;
      const recipient = [order.contact.name, order.contact.address,
        [order.contact.postalCode, order.contact.city].filter(Boolean).join(' '), order.contact.country].filter(Boolean).join('\n');
      const original = {...invoice(id, 'Kaufrechnung', seller, recipient, order.created, order.id, items), orderId: order.id};
      const corrections = items.filter(item => item.status === 'refunded').map(item => {
        const date = state.deals.find(deal => deal.id === item.dealId)?.events
          .find(entry => entry.title === 'Kaufpreis erstattet · Simulation')?.at;
        return {...invoice('STORNO-' + id + '-' + item.dealId, 'Rechnungskorrektur', seller, recipient, date, id,
          [{...item, unitCents: -item.unitCents, totalCents: -item.totalCents}]), orderId: order.id};
      });
      return [original, ...corrections];
    });
  });
}

export function canSimulateFee(deal) {
  return deal.status === 'completed' && deal.funded && !deal.demoServiceInvoice &&
    Number.isSafeInteger(Math.round(deal.fee * 100)) && Math.round(deal.fee * 100) > 0;
}

export function simulateFeePayment(state, actor, dealId, date = new Date().toISOString()) {
  const provider = actor?.role === 'provider' && state.providers.find(p => p.id === actor.id && p.status === 'active');
  const deal = provider && state.deals.find(d => d.id === dealId && d.providerId === provider.id);
  if (!deal || !canSimulateFee(deal)) throw Error('Für diesen Deal ist keine Testabrechnung möglich.');
  const cents = Math.round(deal.fee * 100);
  deal.demoServiceInvoice = invoice('TEST-GEB-' + deal.id, 'BuyMe-Servicegebühr', 'BuyMe · Testplattform',
    provider.name, date, deal.id, [{title: 'Servicegebühr für ' + deal.offer, quantity: 1, unitCents: cents, totalCents: cents}]);
  event(deal, 'payment', 'Servicegebühr bezahlt · Simulation', deal.demoServiceInvoice.id, provider.name);
  return deal.demoServiceInvoice;
}

export function demoInvoices(state, actor) {
  if (actor?.role === 'member') return purchaseInvoices(state, actor.id);
  if (actor?.role === 'provider') return state.deals.filter(deal =>
    deal.providerId === actor.id && deal.demoServiceInvoice
  ).map(deal => deal.demoServiceInvoice);
  return [];
}
