import {availableOffers,offerAvailable,feeFor} from './platform-model.js';
import {event} from './model.js';
const at=()=>new Date().toISOString();
const cents=n=>Math.round(n*100);
const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
export const PURCHASE_METHODS={card:'Testkarte',paypal:'PayPal · Demo',instant:'Sofortzahlung · Demo'};
export function cartItems(s,owner='guest'){return s.carts?.[owner]||[];}
export const cartCount=(s,owner='guest')=>cartItems(s,owner).reduce((a,l)=>a+l.quantity,0);
function qty(value,max){const n=Number(value);if(!Number.isInteger(n)||n<1||n>max)throw Error('Bitte eine zulässige ganze Menge wählen.');return n;}
function member(s,id){const u=s.members.find(u=>u.id===id&&u.status==='active');if(!u)throw Error('Ein aktives Mitglied ist erforderlich.');return u;}
function offer(s,id){const o=availableOffers(s).find(o=>o.id===id&&o.purchase);if(!o)throw Error('Dieses Kaufangebot ist nicht mehr verfügbar.');return o;}
export function addToCart(s,owner,id,variant,quantity=1){
 if(owner!=='guest')member(s,owner);const o=offer(s,id),p=o.purchase;
 if(!p.variants.includes(variant))throw Error('Bitte eine verfügbare Variante wählen.');
 const lines=cartItems(s,owner),existing=lines.find(l=>l.offerId===id&&l.variant===variant);
 const n=qty(Number(quantity)+(existing?.quantity||0),p.maxQty);
 if(lines.filter(l=>l.offerId===id&&l!==existing).reduce((a,l)=>a+l.quantity,0)+n>p.maxQty)throw Error('Die maximale Menge für dieses Angebot ist erreicht.');
 if(!Number.isSafeInteger(p.unitCents)||p.unitCents<=0)throw Error('Der Kaufpreis ist nicht gültig.');
 const next={key:existing?.key||uid(),offerId:id,variant,quantity:n,unitCents:p.unitCents,cashbackCents:cents(o.cashback)};
 if(!s.carts)s.carts={};s.carts[owner]=existing?lines.map(l=>l===existing?next:l):[...lines,next];return next;
}
export function updateCart(s,owner,key,quantity){
 if(owner!=='guest')member(s,owner);const lines=cartItems(s,owner),line=lines.find(l=>l.key===key);if(!line)throw Error('Warenkorbposition nicht gefunden.');
 if(Number(quantity)===0){s.carts[owner]=lines.filter(l=>l.key!==key);return;}
 const o=offer(s,line.offerId),n=qty(quantity,o.purchase.maxQty);
 if(lines.filter(l=>l.offerId===line.offerId&&l!==line).reduce((a,l)=>a+l.quantity,0)+n>o.purchase.maxQty)throw Error('Die maximale Menge für dieses Angebot ist erreicht.');
 line.quantity=n;
}
export function mergeGuestCart(s,id){member(s,id);const guest=[...cartItems(s)],remaining=[];for(const l of guest){try{addToCart(s,id,l.offerId,l.variant,l.quantity);}catch{remaining.push(l);}}if(s.carts)s.carts.guest=remaining;return remaining.length;}
export function cartSummary(s,owner='guest'){
 const lines=cartItems(s,owner).map(l=>{const o=s.offers.find(o=>o.id===l.offerId),p=o?.purchase;let error='';
  if(!o||!availableOffers(s).some(x=>x.id===o.id)||!p?.variants.includes(l.variant))error='Angebot oder Variante nicht mehr verfügbar.';
  else if(p.unitCents!==l.unitCents||cents(o.cashback)!==l.cashbackCents)error='Konditionen geändert. Bitte entfernen und neu hinzufügen.';
  else if(!Number.isInteger(l.quantity)||l.quantity<1||l.quantity>p.maxQty)error='Menge nicht verfügbar.';
  return {...l,offer:o,provider:s.providers.find(p=>p.id===o?.providerId),totalCents:l.unitCents*l.quantity,totalCashbackCents:l.cashbackCents*l.quantity,error};
 });
 for(const l of lines.filter(l=>l.offer?.purchase)){const grouped=lines.filter(x=>x.offerId===l.offerId);const n=grouped.reduce((a,x)=>a+x.quantity,0),reserve=grouped.reduce((a,x)=>a+x.totalCashbackCents+cents(feeFor(x.totalCashbackCents/100)),0);
  if(n>l.offer.purchase.maxQty)l.error='Menge nicht verfügbar.';else if(cents(offerAvailable(s,l.offer))<reserve)l.error='Prämienbudget dieses Angebots ausgeschöpft.';
 }
 return {lines,totalCents:lines.reduce((a,l)=>a+l.totalCents,0),cashbackCents:lines.reduce((a,l)=>a+l.totalCashbackCents,0),requiresShipping:lines.some(l=>l.offer?.purchase.kind==='product'),valid:lines.length>0&&lines.every(l=>!l.error)};
}
function field(v,min,max){const t=String(v||'').trim();if(t.length<min||t.length>max)throw Error('Bitte die Kontaktdaten vollständig mit Testdaten ausfüllen.');return t;}
export function checkout(s,id,form){
 const u=member(s,id),token=field(form.token,8,150),prev=(s.orders||[]).find(o=>o.userId===id&&o.token===token);if(prev)return prev;
 const summary=cartSummary(s,id);if(!summary.valid)throw Error('Bitte prüfe die markierten Warenkorbpositionen.');
 if(form.accepted!==true&&form.accepted!=='on')throw Error('Bitte Bestellung und Prämienbedingungen bestätigen.');
 if(!Object.hasOwn(PURCHASE_METHODS,form.method)||!['success','failed'].includes(form.outcome))throw Error('Bitte Zahlungsart und Testergebnis wählen.');
 const contact={name:field(form.name,3,100),email:field(form.email,6,150)};if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))throw Error('Bitte eine gültige Demo-E-Mail-Adresse angeben.');
 if(summary.requiresShipping){contact.address=field(form.address,3,150);contact.postalCode=field(form.postalCode,4,10);contact.city=field(form.city,2,100);contact.country='Deutschland';}
 // All validation precedes mutation. Failure creates no deals and reserves no cashback budget.
 const order={id:'BEST-'+uid().slice(0,28),token,userId:id,created:at(),contact,method:form.method,status:form.outcome==='success'?'paid':'failed',totalCents:summary.totalCents,cashbackCents:summary.cashbackCents,items:summary.lines.map(l=>({key:l.key,offerId:l.offerId,providerId:l.offer.providerId,title:l.offer.title,variant:l.variant,quantity:l.quantity,unitCents:l.unitCents,totalCents:l.totalCents,cashbackCents:l.totalCashbackCents,fulfilment:l.offer.purchase.fulfilment,kind:l.offer.purchase.kind,dealId:null})),paymentRef:'KAUF-DEMO-'+uid()};
 if(order.status==='paid')for(const [i,l] of summary.lines.entries()){
  const o=l.offer,p=l.provider,cashback=l.totalCashbackCents/100,fee=feeFor(cashback),id='BM-2026-'+String(s.nextDeal++).padStart(4,'0');
  const d={id,user:u.name,provider:p.name,offer:o.title,category:o.category,subcategory:o.subcategory||'',cashback,status:'review',payment:'pending',created:order.created,funded:true,userId:u.id,providerId:p.id,offerId:o.id,contract:order.id,paymentRef:'CB-DEMO-'+id.slice(-4),due:new Date(Date.now()+o.payoutDays*864e5).toISOString(),fee,reserved:cashback+fee,events:[],messages:[],proof:{reference:order.id+' · '+order.paymentRef,at:order.created,type:'purchase-demo'},snapshot:{category:o.category,subcategory:o.subcategory||'',title:o.title,description:o.description,conditions:o.conditions,price:o.price,provider:p.name,cashback,payoutDays:o.payoutDays},purchase:{orderId:order.id,itemKey:l.key,quantity:l.quantity,variant:l.variant,totalCents:l.totalCents,unitCents:l.unitCents,method:order.method,status:'paid',paymentRef:order.paymentRef,fulfilment:o.purchase.fulfilment}};
  event(d,'deal','Kaufbestellung angelegt',order.id+' · '+l.variant+' · '+l.quantity+' Stück',u.name+' · Mitglied');
  event(d,'purchase','Kaufzahlung erfolgreich · Simulation',new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(l.totalCents/100)+' bezahlt. Cashback bleibt bis zur separaten Prüfung ausstehend.',u.name+' · Mitglied');
  s.deals.unshift(d);order.items[i].dealId=id;
 }
 if(!s.orders)s.orders=[];s.orders.unshift(order);if(order.status==='paid')s.carts[id]=[];return order;
}
export function ordersFor(s,role,id){return (s.orders||[]).filter(o=>role==='admin'||role==='member'&&o.userId===id||role==='provider'&&o.items.some(l=>l.providerId===id)).map(o=>{if(role!=='provider')return o;const items=o.items.filter(l=>l.providerId===id);return {...o,items,totalCents:items.reduce((a,l)=>a+l.totalCents,0),cashbackCents:items.reduce((a,l)=>a+l.cashbackCents,0),status:o.status==='failed'?'failed':items.every(l=>l.status==='refunded')?'refunded':items.some(l=>l.status==='refunded')?'partial_refund':'paid'};});}
