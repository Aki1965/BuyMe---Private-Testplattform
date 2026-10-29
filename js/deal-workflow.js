import {changeDeal,event} from './model.js';

const now=()=>new Date().toISOString();
function text(value,min,max,label){const result=String(value??'').trim();if(result.length<min||result.length>max)throw Error('Bitte gültige Angaben mit passender Textlänge eingeben.');return result;}
function party(state,role,id){
 if(!['member','provider'].includes(role))throw Error('Ungültige Dealrolle.');
 const account=(role==='member'?state.members:state.providers).find(a=>a.id===id);
 if(!account||account.status!=='active'||(role==='provider'&&!account.verified))throw Error('Ein aktives Konto ist erforderlich.');
 return account;
}
function providerDeal(state,id,pid){party(state,'provider',pid);const d=state.deals.find(x=>x.id===id&&x.providerId===pid);if(!d)throw Error('Deal nicht gefunden.');if(!['requested','review'].includes(d.status)||d.payment!=='pending')throw Error('Dieser Deal kann nicht mehr bearbeitet werden.');return d;}
function accepted(d){if(d.providerReview?.decision!=='accepted')throw Error('Bitte zuerst die Angebotsannahme bestätigen.');}
export function providerStage(d){
 if(d.status==='cancelled')return {key:'cancelled',label:'Deal beendet'};
 if(['confirmed','completed'].includes(d.status))return {key:'confirmed',label:'Anbieterfreigabe erteilt'};
 if(d.providerReview?.decision!=='accepted')return {key:'new',label:'Neue Angebotsannahme'};
 if(d.providerReview?.correction?.status==='open')return {key:'correction',label:'Rückfrage an Mitglied offen'};
 return d.proof?{key:'ready',label:'Bereit zur Abschlussprüfung'}:{key:'proof',label:'Wartet auf Nachweis'};
}
export function acceptProviderDeal(state,id,pid,note=''){
 const d=providerDeal(state,id,pid);if(d.providerReview?.decision==='accepted')throw Error('Die Angebotsannahme wurde bereits bestätigt.');
 note=text(note,0,1500,'Hinweis');const at=now();d.providerReview={...d.providerReview,decision:'accepted',acceptedAt:at,updatedAt:at,note};
 event(d,'deal','Angebotsannahme bestätigt',note||'Der Anbieter hat die Anfrage übernommen. Der Abschluss und das Cashback sind noch nicht freigegeben.',d.provider+' · Anbieter');return d;
}
export function saveProviderWork(state,id,pid,form){
 const d=providerDeal(state,id,pid);accepted(d);
 const reference=text(form.reference,3,120,'Bearbeitungsreferenz'),note=text(form.note,0,1500,'Bearbeitungshinweis');
 Object.assign(d.providerReview,{reference,note,updatedAt:now()});
 event(d,'deal','Bearbeitung aktualisiert',reference+(note?' · '+note:''),d.provider+' · Anbieter');return d;
}
export function requestProviderCorrection(state,id,pid,reason){
 const d=providerDeal(state,id,pid);accepted(d);reason=text(reason,5,1500,'Rückfrage');const at=now();
 d.providerReview.correction={status:'open',text:reason,at};d.providerReview.updatedAt=at;
 d.messages.push({from:'provider',text:reason,at});event(d,'message','Nachbesserung angefordert',reason,d.provider+' · Anbieter');return d;
}
export function rejectProviderDeal(state,id,pid,reason){
 const d=providerDeal(state,id,pid);reason=text(reason,5,1500,'Ablehnungsgrund');
 changeDeal(state,id,'cancelled',reason,d.provider+' · Anbieter');
 d.providerReview={...d.providerReview,decision:'declined',declinedAt:now(),declineReason:reason,updatedAt:now()};
 d.messages.push({from:'provider',text:reason,at:now()});return d;
}
export function confirmProviderDeal(state,id,pid,form={}){
 const d=providerDeal(state,id,pid);accepted(d);
 if(d.status!=='review'||!d.proof)throw Error('Der Deal muss mit Nachweis zur Prüfung vorliegen.');
 if(d.providerReview.correction?.status==='open')throw Error('Das Mitglied muss zuerst die angeforderte Nachbesserung einreichen.');
 if(!d.funded)throw Error('Vor der Anbieterfreigabe muss das Prämienbudget gedeckt sein.');
 if(form.conditionsChecked!==true&&form.conditionsChecked!=='on')throw Error('Bitte Nachweis und Prämienbedingungen ausdrücklich prüfen.');
 const reference=text(form.reference??d.providerReview.reference,3,120,'Bearbeitungsreferenz'),note=text(form.note,5,1500,'Prüfvermerk');
 changeDeal(state,id,'confirmed','Anbieterfreigabe: '+reference+' · '+note,d.provider+' · Anbieter');
 Object.assign(d.providerReview,{reference,note,confirmedAt:now(),updatedAt:now()});
 if(Number.isFinite(d.snapshot?.payoutDays))d.due=new Date(Date.now()+d.snapshot.payoutDays*864e5).toISOString();
 return d;
}

// Reviews written before the two-sided workflow were member-to-provider reviews.
export const reviewAuthorRole=r=>r.authorRole||'member';
export const reviewTargetRole=r=>r.targetRole||(reviewAuthorRole(r)==='member'?'provider':'member');
export function reviewsForDeal(state,id){return state.reviews.filter(r=>r.dealId===id).sort((a,b)=>b.at.localeCompare(a.at));}
export function visibleReviews(state,role,id){
 if(!['member','provider'].includes(role))return [];
 const deals=new Set(state.deals.filter(d=>role==='member'?d.userId===id:d.providerId===id).map(d=>d.id));
 return state.reviews.filter(r=>deals.has(r.dealId)).sort((a,b)=>b.at.localeCompare(a.at));
}
export function reviewsAbout(state,role,id){return state.reviews.filter(r=>reviewTargetRole(r)===role&&(role==='member'?r.userId===id:r.providerId===id));}
export function canReview(state,d,role,id){return ['member','provider'].includes(role)&&d.status==='completed'&&(role==='member'?d.userId===id:d.providerId===id)&&!state.reviews.some(r=>r.dealId===d.id&&reviewAuthorRole(r)===role);}
export function submitDealReview(state,id,role,actorId,rating,value){
 party(state,role,actorId);const d=state.deals.find(x=>x.id===id&&(role==='member'?x.userId===actorId:x.providerId===actorId));
 if(!d||d.status!=='completed')throw Error('Bewertungen sind nach einem abgeschlossenen Deal möglich.');
 if(!canReview(state,d,role,actorId))throw Error('Du hast diesen Deal bereits bewertet.');
 rating=Number(rating);if(!Number.isInteger(rating)||rating<1||rating>5)throw Error('Bitte 1 bis 5 ganze Sterne auswählen.');
 const review={id:'RV-'+(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)),dealId:id,providerId:d.providerId,userId:d.userId,authorRole:role,authorId:actorId,targetRole:role==='member'?'provider':'member',targetId:role==='member'?d.providerId:d.userId,name:role==='member'?d.user:d.provider,rating,text:text(value,5,1500,'Bewertung'),at:now()};
 state.reviews.unshift(review);event(d,'message',role==='member'?'Anbieter bewertet':'Mitglied bewertet',rating+' von 5 Sternen · Für beide Dealparteien sichtbar.',review.name);return review;
}
