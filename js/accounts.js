import {walletSummary,offerUsed,activity} from './platform-model.js';
import {fileStore} from './attachments.js';
export function accountContext(state,type,id){
 if(!['member','provider'].includes(type))return null;
 const account=(type==='member'?state.members:state.providers).find(x=>x.id===id);
 if(!account)return null;
 const deals=state.deals.filter(d=>type==='member'?d.userId===id:d.providerId===id);
 const dealIds=new Set(deals.map(d=>d.id));
 const tickets=state.tickets.filter(t=>dealIds.has(t.dealId));
 const offers=type==='provider'?state.offers.filter(o=>o.providerId===id):[];
 const reviews=state.reviews.filter(r=>type==='member'?r.userId===id:r.providerId===id);
 const events=deals.flatMap(d=>d.events.map(e=>({...e,dealId:d.id,offer:d.offer}))).sort((a,b)=>b.at.localeCompare(a.at));
 return {account,type,deals,tickets,offers,reviews,events,wallet:type==='member'?walletSummary(state,id):null,budget:type==='provider'?{credit:account.credit,total:offers.reduce((s,o)=>s+o.budget,0),used:offers.reduce((s,o)=>s+offerUsed(state,o.id),0)}:null};
}

function requireAdmin(state,actor){
 if(actor?.role!=='admin'||!state.auth?.accounts?.some(a=>a.role==='admin'&&a.id===actor.id))throw Error('Nur angemeldete Administratoren können Konten löschen.');
}
function referencedFiles(state){
 return new Set([...(state.offers||[]).flatMap(o=>o.attachments||[]),...(state.deals||[]).flatMap(d=>[...(d.attachments||[]),...(d.snapshot?.attachments||[])])].map(a=>a.id));
}

// This deletes fictional browser-local accounts only. Supabase Auth is separate.
// Plan against a clone so validation or a failed storage write cannot partly delete data.
export function planAccountDeletion(state,type,id,actor){
 requireAdmin(state,actor);
 const context=accountContext(state,type,id);
 if(!context)throw Error('Konto nicht gefunden.');
 const offerIds=new Set(context.offers.map(o=>o.id));
 const dealIds=new Set(context.deals.map(d=>d.id));
 const affectedOrders=(state.orders||[]).filter(o=>type==='member'?o.userId===id:o.items.some(l=>l.providerId===id||offerIds.has(l.offerId)||dealIds.has(l.dealId)));
 const fingerprint=JSON.stringify({type,id,account:context.account,deals:context.deals,offers:context.offers,orders:affectedOrders});
 const next=structuredClone(state),beforeFiles=referencedFiles(state);
 next[type==='member'?'members':'providers']=next[type==='member'?'members':'providers'].filter(a=>a.id!==id);
 next.auth.accounts=next.auth.accounts.filter(a=>!(a.id===id&&a.role===type));
 next.offers=next.offers.filter(o=>!offerIds.has(o.id));
 next.deals=next.deals.filter(d=>!dealIds.has(d.id));
 next.tickets=next.tickets.filter(t=>!dealIds.has(t.dealId));
 next.reviews=next.reviews.filter(r=>!dealIds.has(r.dealId)&&!(type==='member'?r.userId===id:r.providerId===id));
 next.legalRequests=(next.legalRequests||[]).filter(r=>!(r.actorRole===type&&r.actorId===id));
 next.orders=(next.orders||[]).flatMap(order=>{
  if(type==='member'&&order.userId===id)return [];
  const items=order.items.filter(l=>!dealIds.has(l.dealId)&&!offerIds.has(l.offerId)&&!(type==='provider'&&l.providerId===id));
  if(!items.length)return [];
  if(items.length===order.items.length)return [order];
  return [{...order,items,totalCents:items.reduce((n,l)=>n+l.totalCents,0),cashbackCents:items.reduce((n,l)=>n+l.cashbackCents,0),status:order.status==='failed'?'failed':items.every(l=>l.status==='refunded')?'refunded':items.some(l=>l.status==='refunded')?'partial_refund':'paid'}];
 });
 next.payouts=next.payouts.flatMap(p=>{
  if(type==='member'&&p.userId===id)return [];
  const ids=p.dealIds.filter(d=>!dealIds.has(d));
  if(!ids.length)return [];
  if(ids.length===p.dealIds.length)return [p];
  const deals=next.deals.filter(d=>ids.includes(d.id));
  return [{...p,dealIds:ids,amount:Math.round(deals.reduce((n,d)=>n+d.cashback,0)*100)/100,status:deals.some(d=>d.payment==='processing')?'processing':deals.some(d=>d.payment==='failed')?'failed':'paid'}];
 });
 if(next.carts){
  if(type==='member')delete next.carts[id];
  for(const owner of Object.keys(next.carts))next.carts[owner]=next.carts[owner].filter(l=>!offerIds.has(l.offerId));
 }
 next.activity=next.activity.filter(a=>a.actor!==context.account.name&&!a.actor?.startsWith(context.account.name+' · ')&&!a.detail?.includes(context.account.name));
 activity(next,'Demokonto gelöscht',id+' · '+type,'Ejdat Akyol · Admin');
 const remaining=referencedFiles(next),unusedFiles=[...beforeFiles].filter(id=>!remaining.has(id));
 next.pendingAccountFileDeletes=[...new Set([...(next.pendingAccountFileDeletes||[]),...unusedFiles])];
 return {state:next,account:context.account,fingerprint,summary:{deals:dealIds.size,offers:offerIds.size,orders:affectedOrders.length,files:unusedFiles.length}};
}

// Persist the account removal first; interrupted blob cleanup remains queued for retry.
export async function purgeDeletedAccountFiles({context,save,store=fileStore}){
 const first=context();requireAdmin(first.state,first.actor);
 const pending=first.state.pendingAccountFileDeletes||[];
 if(!pending.length)return first.state;
 const referenced=referencedFiles(first.state),unused=pending.filter(id=>!referenced.has(id));
 await store.remove(unused);
 const latest=context(),next=structuredClone(latest.state);
 next.pendingAccountFileDeletes=(next.pendingAccountFileDeletes||[]).filter(id=>!pending.includes(id));
 save(next);return next;
}
export async function submitAccountDeletion({context,type,id,confirmation,fingerprint,save,store=fileStore}){
 const current=context(),plan=planAccountDeletion(current.state,type,id,current.actor);
 if(confirmation!==id)throw Error('Bitte die Kontonummer zur Bestätigung genau eingeben.');
 if(fingerprint!==plan.fingerprint)throw Error('Die Kontodaten oder Testvorgänge haben sich geändert. Bitte den Löschdialog erneut öffnen.');
 save(plan.state);
 let cleanupPending=false;
 try{await purgeDeletedAccountFiles({context,save,store});}catch{cleanupPending=true;}
 return {state:context().state,cleanupPending};
}
