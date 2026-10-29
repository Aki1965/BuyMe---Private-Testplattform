import {reviewsForDeal,reviewAuthorRole} from './deal-workflow.js';

export const REVIEW_CASE_LABELS={open:'Offen',review:'In Klärung',resolved:'Abgeschlossen'};
export const reviewCaseFor=(state,dealId)=>(state.reviewDisputes||[]).find(c=>c.dealId===dealId)||null;
export function adminReviewContext(state,dealId){
 const deal=state.deals.find(d=>d.id===dealId);if(!deal)return null;
 const reviews=reviewsForDeal(state,dealId);
 return {deal,member:state.members.find(m=>m.id===deal.userId)||null,provider:state.providers.find(p=>p.id===deal.providerId)||null,reviews,memberReview:reviews.find(r=>reviewAuthorRole(r)==='member')||null,providerReview:reviews.find(r=>reviewAuthorRole(r)==='provider')||null,reviewCase:reviewCaseFor(state,dealId),messages:[...(deal.messages||[])].sort((a,b)=>a.at.localeCompare(b.at)),tickets:state.tickets.filter(t=>t.dealId===dealId),events:[...(deal.events||[])].sort((a,b)=>b.at.localeCompare(a.at))};
}
export function adminReviewRows(state,{q='',direction='',rating='',caseStatus=''}={}){
 const needle=String(q).trim().toLocaleLowerCase('de');
 return state.deals.map(d=>adminReviewContext(state,d.id)).filter(c=>c.reviews.length||c.reviewCase).filter(c=>{
  const searchable=[c.deal.id,c.deal.offer,c.deal.user,c.deal.provider,c.deal.userId,c.deal.providerId,c.reviewCase?.id,...c.reviews.flatMap(r=>[r.name,r.text]),...(c.reviewCase?.notes||[]).map(n=>n.text)].join(' ').toLocaleLowerCase('de');
  return (!needle||searchable.includes(needle))&&(!direction||c.reviews.some(r=>reviewAuthorRole(r)===direction))&&(!rating||c.reviews.some(r=>rating==='low'?r.rating<=2:r.rating===Number(rating)))&&(!caseStatus||(caseStatus==='none'?!c.reviewCase:c.reviewCase?.status===caseStatus));
 }).sort((a,b)=>{
  const stamp=c=>c.reviewCase?.updatedAt||c.reviews[0]?.at||c.deal.created;
  return stamp(b).localeCompare(stamp(a));
 });
}
export function adminReviewStats(state){return {total:state.reviews.length,members:state.reviews.filter(r=>reviewAuthorRole(r)==='member').length,providers:state.reviews.filter(r=>reviewAuthorRole(r)==='provider').length,openCases:(state.reviewDisputes||[]).filter(c=>c.status!=='resolved').length};}
export function saveAdminReviewCase(state,dealId,actor,values){
 if(actor?.role!=='admin'||!state.auth?.accounts?.some(a=>a.id===actor.id&&a.role==='admin'))throw Error('Nur die Administration darf Streitfälle dokumentieren.');
 if(!state.deals.some(d=>d.id===dealId))throw Error('Deal nicht gefunden.');
 if(!Object.hasOwn(REVIEW_CASE_LABELS,values.status))throw Error('Bitte einen gültigen Fallstatus auswählen.');
 const note=String(values.note||'').trim();if(note.length<5||note.length>3000)throw Error('Bitte eine Prüfnotiz mit 5 bis 3.000 Zeichen eingeben.');
 const existing=reviewCaseFor(state,dealId),at=new Date().toISOString(),entry={id:'BF-'+dealId,dealId,status:values.status,createdAt:existing?.createdAt||at,updatedAt:at,notes:[...(existing?.notes||[]),{id:globalThis.crypto?.randomUUID?.()||'note-'+Date.now()+'-'+Math.random().toString(36).slice(2),at,actorId:actor.id,actor:actor.name||actor.email||'Administration',previousStatus:existing?.status||null,status:values.status,text:note}]};
 // Case assessments are private admin records, separate from participant timelines and reviews.
 if(existing)state.reviewDisputes[state.reviewDisputes.indexOf(existing)]=entry;
 else {state.reviewDisputes=state.reviewDisputes||[];state.reviewDisputes.unshift(entry);}
 return entry;
}
