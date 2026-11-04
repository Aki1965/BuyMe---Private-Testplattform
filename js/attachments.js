// Browser-local file storage for this private prototype. No remote upload service.
export const MAX_FILE_BYTES=5*1024*1024,MAX_ATTACHMENT_BYTES=25*1024*1024,MAX_ATTACHMENTS=10;
export const FILE_TYPES={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',pdf:'application/pdf',txt:'text/plain',csv:'text/csv',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
export const FILE_ACCEPT=Object.keys(FILE_TYPES).map(x=>'.'+x).join(',');
export const isImage=a=>['image/jpeg','image/png','image/webp','image/gif'].includes(a?.type);
export const fileSize=n=>n<1024*1024?Math.max(1,Math.ceil(n/1024))+' KB':(n/1024/1024).toFixed(1).replace('.',',')+' MB';
const uid=()=> 'UP-'+(crypto.randomUUID?.()||'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(Number(c)^crypto.getRandomValues(new Uint8Array(1))[0]&15>>Number(c)/4).toString(16)));
export function activeActor(s,actor){
  if(!actor||!['member','provider','admin'].includes(actor.role))throw Error('Bitte mit einem gültigen Testkonto anmelden.');
  if(actor.role==='admin'){if(!s.auth?.accounts?.some(a=>a.role==='admin'&&a.id===actor.id))throw Error('Nur registrierte Administratoren haben Zugriff.');return actor;}
  const person=(actor.role==='member'?s.members:s.providers).find(x=>x.id===actor.id&&x.status==='active');
  if(!person)throw Error('Dieses Testkonto ist nicht aktiv.');return actor;
}
export function canReadOffer(s,o,actor){
  if(!o)return false;
  if(actor)try{activeActor(s,actor);if(actor.role==='admin'||actor.role==='provider'&&actor.id===o.providerId)return true;}catch{return false;}
  return o.status==='active'&&s.providers.some(p=>p.id===o.providerId&&p.status==='active'&&p.verified);
}
export function requireDeal(s,id,actor){
  activeActor(s,actor);const d=s.deals.find(x=>x.id===id);
  if(!d||!(actor.role==='admin'||actor.role==='member'&&actor.id===d.userId||actor.role==='provider'&&actor.id===d.providerId))throw Error('Diese Unterlagen gehören zu einem anderen Testkonto.');return d;
}
function validateMetadata(a){
  const extension=String(a?.name||'').split('.').at(-1).toLowerCase();
  if(!/^UP-[a-f0-9-]{36}$/.test(a?.id||'')||!a.name||a.name.length>180||/[\u0000-\u001f\u007f/\\]/.test(a.name)||FILE_TYPES[extension]!==a.type||!Number.isInteger(a.size)||a.size<1||a.size>MAX_FILE_BYTES||!['member','provider','admin'].includes(a.uploaderRole)||typeof a.uploaderId!=='string'||!a.uploaderId||!Number.isFinite(Date.parse(a.createdAt)))throw Error('Ungültige Dateiangaben. Bitte die Datei erneut auswählen.');
  return {id:a.id,name:a.name,type:a.type,size:a.size,uploaderRole:a.uploaderRole,uploaderId:a.uploaderId,createdAt:a.createdAt};
}
export function attachmentList(existing=[],added=[],removed=[]){
  if(!Array.isArray(existing)||!Array.isArray(added)||!Array.isArray(removed))throw Error('Dateiliste ist nicht gültig.');
  const ids=new Set(existing.map(a=>a.id));if(removed.some(id=>!ids.has(id)))throw Error('Die zu entfernende Datei gehört nicht zu diesem Angebot.');
  const rows=[...existing.filter(a=>!removed.includes(a.id)),...added].map(validateMetadata);
  if(new Set(rows.map(a=>a.id)).size!==rows.length)throw Error('Die Datei ist bereits zugeordnet.');
  if(rows.length>MAX_ATTACHMENTS||rows.reduce((n,a)=>n+a.size,0)>MAX_ATTACHMENT_BYTES)throw Error('Maximal 10 Dateien und insgesamt 25 MB pro Angebot oder Deal.');return rows;
}
export function setOfferAttachments(s,id,actor,added=[],removed=[]){
  activeActor(s,actor);const o=s.offers.find(x=>x.id===id);
  if(!o||actor.role!=='provider'||o.providerId!==actor.id)throw Error('Nur der zugehörige Anbieter kann Angebotsdateien ändern.');
  if(added.some(a=>a.uploaderRole!==actor.role||a.uploaderId!==actor.id))throw Error('Die Datei ist einem anderen Konto zugeordnet.');
  o.attachments=attachmentList(o.attachments,added,removed);return o.attachments;
}
export function addDealAttachments(s,id,actor,added){
  const d=requireDeal(s,id,actor);
  if(['cancelled','completed'].includes(d.status)&&actor.role!=='admin')throw Error('Dieser Deal ist abgeschlossen. Nur die Administration kann weitere Unterlagen ergänzen.');
  if(!added.length)throw Error('Bitte mindestens eine Datei auswählen.');
  if(added.some(a=>a.uploaderRole!==actor.role||a.uploaderId!==actor.id))throw Error('Die Datei ist einem anderen Konto zugeordnet.');
  d.attachments=attachmentList(d.attachments,added);
  d.events.push({kind:'deal',at:new Date().toISOString(),title:'Unterlagen hinzugefügt',detail:added.length+' Datei(en) · im lokalen Test gespeichert',actor:{member:d.user+' · Mitglied',provider:d.provider+' · Anbieter',admin:'BuyMe Administration'}[actor.role]});return d.attachments;
}
export function visibleAttachments(s,kind,id,actor){
  if(kind==='offer'){const o=s.offers.find(x=>x.id===id);return canReadOffer(s,o,actor)?structuredClone(o.attachments||[]):[];}
  if(!['deal','snapshot'].includes(kind))return [];
  try{const d=requireDeal(s,id,actor);return structuredClone(kind==='snapshot'?d.snapshot?.attachments||[]:d.attachments||[]);}catch{return [];}
}
export function findAttachment(s,kind,id,actor,fileId){
  const row=visibleAttachments(s,kind,id,actor).find(a=>a.id===fileId);if(!row)throw Error('Die Datei ist für dieses Konto nicht verfügbar.');return validateMetadata(row);
}
export async function prepareFiles(files,actor){
  if(files.length>MAX_ATTACHMENTS)throw Error('Bitte höchstens 10 Dateien auswählen.');
  const records=[];
  for(const file of files){
    const name=String(file.name||'').trim(),ext=name.split('.').at(-1).toLowerCase(),type=FILE_TYPES[ext];
    if(!type||/[\u0000-\u001f\u007f/\\]/.test(name)||name.length>180)throw Error('Erlaubt: JPG, PNG, WEBP, GIF, PDF, TXT, CSV, DOCX, XLSX und PPTX.');
    if(!file.size||file.size>MAX_FILE_BYTES)throw Error(name+': Die Datei muss zwischen 1 Byte und 5 MB groß sein.');
    if(file.type&&!['application/octet-stream',type,...(ext==='csv'?['application/vnd.ms-excel','text/plain']:[])].includes(file.type))throw Error(name+': Dateityp und Dateiendung passen nicht zusammen.');
    const bytes=new Uint8Array(await file.arrayBuffer()),head=String.fromCharCode(...bytes.slice(0,12));
    const valid=type==='image/png'?bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='image/gif'?/^GIF8[79]a/.test(head):type==='image/webp'?head.startsWith('RIFF')&&head.slice(8)==='WEBP':type==='application/pdf'?head.startsWith('%PDF-'):['docx','xlsx','pptx'].includes(ext)?head.startsWith('PK\x03\x04'):!bytes.includes(0);
    if(!valid||bytes.length!==file.size)throw Error(name+': Der Dateiinhalt passt nicht zum erlaubten Format.');
    const meta=validateMetadata({id:uid(),name,type,size:file.size,uploaderRole:actor.role,uploaderId:actor.id,createdAt:new Date().toISOString()});
    records.push({...meta,blob:new Blob([bytes],{type})});
  }
  attachmentList([],records);return records;
}
let database;
async function openDB(){
  if(!globalThis.indexedDB)throw Error('Dateispeicher ist in diesem Browser nicht verfügbar. Bitte einen normalen Browsermodus verwenden.');
  if(!database)database=new Promise((resolve,reject)=>{const request=indexedDB.open('buyme-attachments-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'id'});request.onerror=()=>{database=null;reject(request.error);};request.onblocked=()=>{database=null;reject(Error('Bitte andere BuyMe-Tabs schließen und erneut versuchen.'));};request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=null;};resolve(db);};});return database;
}
async function transaction(mode,run){
  const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('files',mode);let result;tx.oncomplete=()=>resolve(result?.result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Dateispeicher konnte nicht aktualisiert werden.'));try{result=run(tx.objectStore('files'));}catch(e){tx.abort();reject(e);}});
}
export const fileStore={
  put:records=>records.length?transaction('readwrite',store=>{for(const record of records)store.add(record);}):Promise.resolve(),
  get:id=>transaction('readonly',store=>store.get(id)),
  remove:ids=>ids.length?transaction('readwrite',store=>{for(const id of ids)store.delete(id);}):Promise.resolve()
};
