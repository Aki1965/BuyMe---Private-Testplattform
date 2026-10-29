import {LEGAL_VERSION,TEST_TERMS_VERSION,LAUNCH_RISKS} from './legal-content.js';
export const LIVE_COMMERCE_ENABLED=false;
export const LEGAL_REQUEST_TYPES={withdrawal:'Widerruf',cancellation:'Kündigung',content:'Inhaltemeldung',accessibility:'Barriere melden'};
const now=()=>new Date().toISOString();
const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
function text(value,min,max,label){const s=String(value||'').trim();if(s.length<min||s.length>max)throw Error(label+' bitte vollständig und innerhalb der Zeichenbegrenzung angeben.');return s;}
export function testTermsRecord(role){return {scope:'local-test-only',testTermsVersion:TEST_TERMS_VERSION,liveDraftVersion:LEGAL_VERSION,role,recordedAt:now(),privacyConsent:false};}
export function launchReadiness(){return {canGoLive:false,liveCommerceEnabled:LIVE_COMMERCE_ENABLED,version:LEGAL_VERSION,blockers:LAUNCH_RISKS.map(r=>({...r}))};}
export function publicReviewSummary(s,providerId){const rows=(s.reviews||[]).filter(r=>r.providerId===providerId&&(r.authorRole||'member')==='member');return {count:rows.length,average:rows.length?rows.reduce((a,r)=>a+Number(r.rating),0)/rows.length:null};}
export function submitLegalRequest(s,form,actor=null){
 const kind=String(form.kind||'');if(!Object.hasOwn(LEGAL_REQUEST_TYPES,kind))throw Error('Unbekannte Anfrageart.');
 const reference=text(form.reference,3,240,'Vertragskennung oder Fundstelle');
 const isContract=['withdrawal','cancellation'].includes(kind);
 const name=text(form.name,isContract?2:0,100,'Name');
 const email=text(form.email,isContract?6:0,180,'E-Mail-Adresse');
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Bitte eine gültige Empfangs-E-Mail angeben.');
 const detail=kind==='withdrawal'?'':text(form.detail,kind==='content'||kind==='accessibility'?10:0,3000,'Beschreibung');
 if(kind==='content'&&form.goodFaith!=='on')throw Error('Bitte die gewissenhafte Richtigkeit der Meldung bestätigen.');
 const cancellationType=kind==='cancellation'?String(form.cancellationType||'ordinary'):null;
 if(cancellationType&&!['ordinary','extraordinary'].includes(cancellationType))throw Error('Bitte die Art der Kündigung wählen.');
 const requestedDate=kind==='cancellation'?text(form.requestedDate||'zum nächstmöglichen Zeitpunkt',3,120,'Gewünschter Beendigungszeitpunkt'):null;
 // Creating a notice never silently cancels contracts, refunds money or changes cashback.
 const token=String(form.token||'');
 if(token){const existing=(s.legalRequests||[]).find(r=>r.token===token&&r.actorId===(actor?.id||null));if(existing)return existing;}
 const r={id:'RECHT-'+uid(),token:token||uid(),kind,reference,name,email,detail,cancellationType,requestedDate,created:now(),actorId:actor?.id||null,actorRole:actor?.role||null,simulation:true,delivery:'not-sent',status:'local-test-recorded',version:LEGAL_VERSION,events:[]};
 r.events.push({at:r.created,label:'Lokale Simulation gespeichert – kein Zugang bei einem echten Empfänger'});
 if(!s.legalRequests)s.legalRequests=[];s.legalRequests.unshift(r);return r;
}
export function legalReceiptText(r){return ['BUYME – SIMULIERTER VORGANG / KEINE ECHTE ZUSTELLUNG',LEGAL_REQUEST_TYPES[r.kind],r.id,'Gespeichert: '+r.created,'Name: '+(r.name||'Nicht angegeben'),'Empfangskontakt: '+(r.email||'Nicht angegeben'),'Vertragskennung / Fundstelle: '+r.reference,r.cancellationType?'Art: '+(r.cancellationType==='ordinary'?'ordentliche Kündigung':'außerordentliche Kündigung'):'',r.requestedDate?'Gewünschte Beendigung: '+r.requestedDate:'',r.detail?'Beschreibung: '+r.detail:'','Dieser Beleg bestätigt nur die Speicherung in diesem Browser. Es wurde nichts an einen Händler, BuyMe-Server oder eine Behörde versandt. Keine rechtliche Fristwahrung und keine automatische Vertragsbeendigung oder Rückzahlung.','Textfassung: '+r.version].filter(Boolean).join('\n');}
export function legalRequestsFor(s,actor){if(actor?.role==='admin')return [...(s.legalRequests||[])];if(!actor)return [];return (s.legalRequests||[]).filter(r=>r.actorId===actor.id&&r.actorRole===actor.role);}
export function participantDataExport(s,actor){
 if(!actor||!['member','provider'].includes(actor.role))throw Error('Bitte mit einem Mitglieds- oder Anbieterkonto anmelden.');
 const isMember=actor.role==='member',profile=(isMember?s.members:s.providers).find(x=>x.id===actor.id);
 if(!profile)throw Error('Konto nicht gefunden.');
 const deals=s.deals.filter(d=>isMember?d.userId===actor.id:d.providerId===actor.id),ids=new Set(deals.map(d=>d.id));
 const result={scope:'local-test-data',exportedAt:now(),profile:structuredClone(profile),deals:structuredClone(deals),reviews:structuredClone((s.reviews||[]).filter(r=>ids.has(r.dealId))),tickets:structuredClone((s.tickets||[]).filter(t=>ids.has(t.dealId)&&t.role===(isMember?'user':'provider'))),legalRequests:structuredClone(legalRequestsFor(s,actor))};
 for(const t of result.tickets)t.messages=t.messages.filter(m=>m.from!=='internal');
 // No credentials, unrelated accounts or administration-only case notes.
 return result;
}
