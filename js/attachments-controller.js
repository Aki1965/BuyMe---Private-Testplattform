import {activeActor,attachmentList,setOfferAttachments,addDealAttachments,requireDeal,prepareFiles,fileStore} from './attachments.js';
import {createOffer,acceptOffer,attachProof} from './platform-model.js';
import {checkout} from './commerce.js';

export function planAttachmentAction(state,actor,{kind,id,data={},added=[],removed=[]}){
  activeActor(state,actor);const s=structuredClone(state);let target=null,message='Unterlagen gespeichert.',keepUploads=true;
  if(kind==='offer'){
    if(actor.role!=='provider')throw Error('Bitte mit einem Anbieterkonto anmelden.');
    const prev=id?s.offers.find(o=>o.id===id&&o.providerId===actor.id):null;
    attachmentList(prev?.attachments,added,removed);
    const o=createOffer(s,actor.id,data,id||null);setOfferAttachments(s,o.id,actor,added,removed);target='offers';message='Angebot mit Bildern und Dateien zur Freigabe eingereicht.';
  }else if(kind==='accept'){
    if(actor.role!=='member')throw Error('Bitte mit einem Mitgliedskonto anmelden.');
    if(data.accepted!==true&&data.accepted!=='on')throw Error('Bitte die Prämienbedingungen bestätigen.');
    attachmentList([],added);const d=acceptOffer(s,id,actor.id);
    if(added.length){addDealAttachments(s,d.id,actor,added);attachProof(s,d.id,actor.id,proofReference(data,added),added.map(a=>a.id));}
    target='deal:'+d.id;message=added.length?'Deal mit deinen Unterlagen angelegt. Der Anbieter kann jetzt prüfen.':'Deal angelegt. Du kannst die Unterlagen später im Deal ergänzen.';
  }else if(kind==='proof'||kind==='deal'){
    const d=requireDeal(s,id,actor);
    if(kind==='proof'&&(actor.role!=='member'||!['requested','review'].includes(d.status)))throw Error('Für diesen Deal kann kein neuer Mitgliedsnachweis eingereicht werden.');
    if(added.length)addDealAttachments(s,id,actor,added);else if(kind==='deal')throw Error('Bitte mindestens eine Datei auswählen.');
    if(actor.role==='member'&&['requested','review'].includes(d.status)){
      attachProof(s,id,actor.id,proofReference(data,added),(d.attachments||[]).filter(a=>a.uploaderRole==='member'&&a.uploaderId===actor.id).map(a=>a.id));
    }message='Unterlagen im Deal gespeichert und für die Beteiligten sichtbar.';
  }else if(kind==='purchase-checkout'){
    if(actor.role!=='member')throw Error('Bitte mit einem Mitgliedskonto anmelden.');
    attachmentList([],added);const reused=s.orders?.some(o=>o.userId===actor.id&&o.token===data.token),order=checkout(s,actor.id,data);
    keepUploads=order.status==='paid'&&!reused;
    if(keepUploads&&added.length)for(const item of order.items)addDealAttachments(s,item.dealId,actor,added);
    target=order.status==='paid'?'order:'+order.id:null;message=order.status==='paid'?'Testbestellung und Unterlagen gespeichert.':'Die Testzahlung ist fehlgeschlagen. Es wurden keine Unterlagen gespeichert.';
  }else throw Error('Dateiaktion nicht verfügbar.');
  return {state:s,target,message,keepUploads,failedPayment:kind==='purchase-checkout'&&!target};
}
function proofReference(data,added){const value=String(data.reference||'').trim();if(value)return value;if(!added.length)throw Error('Bitte eine Datei oder eine Bestell-/Vertragsreferenz angeben.');return ('Dateinachweis: '+added.map(a=>a.name).join(', ')).slice(0,500);}

// Blobs commit before metadata; metadata is planned again against the latest state.
// Failed validation, a changed account or failed LocalStorage write rolls back new blobs.
export async function submitAttachmentAction({context,action,files=[],removed=[],save,store=fileStore,prepare=prepareFiles}){
  const first=context(),actor=first.actor;activeActor(first.state,actor);
  const records=await prepare(files,actor),added=records.map(({blob,...meta})=>meta);
  const latest=()=>{const c=context();if(c.actor?.id!==actor.id||c.actor?.role!==actor.role)throw Error('Das angemeldete Konto wurde geändert. Bitte erneut speichern.');return c;};
  let written=false;
  try{
    const pre=planAttachmentAction(latest().state,actor,{...action,added,removed});
    if(pre.keepUploads&&records.length){await store.put(records);written=true;}
    const result=planAttachmentAction(latest().state,actor,{...action,added,removed});
    save(result.state);
    if(written&&!result.keepUploads)try{await store.remove(records.map(a=>a.id));}catch{}
    return result;
  }catch(error){if(written)try{await store.remove(records.map(a=>a.id));}catch{}if(error?.name==='QuotaExceededError')throw Error('Der lokale Speicher ist voll. Bitte kleinere Dateien verwenden oder nicht benötigte Website-Daten entfernen.');throw error;}
}
