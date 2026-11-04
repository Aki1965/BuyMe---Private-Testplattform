import {esc,userText} from './ui.js';
import {FILE_ACCEPT,FILE_TYPES,MAX_FILE_BYTES,MAX_ATTACHMENTS,fileSize,isImage,visibleAttachments,findAttachment,fileStore} from './attachments.js';
import {submitAttachmentAction} from './attachments-controller.js';
export function uploadPicker({label='Bilder und Dateien hochladen',existing=[],kind='offer',id='',hint=''}={}){
  return `<section class="upload-picker" data-upload-picker data-upload-kind="${kind}" data-upload-id="${esc(id)}"><h3>${label}</h3><p class="upload-hint">${hint||'JPG, PNG, WEBP, GIF, PDF, TXT, CSV, DOCX, XLSX oder PPTX. Maximal 5 MB je Datei, 10 Dateien und insgesamt 25 MB.'}</p><label class="upload-drop"><span>Dateien auswählen</span><input type="file" multiple accept="${FILE_ACCEPT}" aria-label="${label}"><small>Mehrfachauswahl möglich · Bilder mit Vorschau</small></label><div class="upload-selection" aria-live="polite"></div><div class="upload-existing">${existing.map(a=>`<div class="upload-existing-row" data-existing-file="${esc(a.id)}"><span translate="no">${esc(a.name)} <small>${fileSize(a.size)}</small></span><button type="button" data-upload-remove-existing="${esc(a.id)}" aria-label="${esc(a.name)} aus dem Angebot entfernen">Entfernen</button></div>`).join('')}</div><p class="upload-error" role="alert" tabindex="-1"></p><p class="upload-local">Privater Test: nur fiktive Unterlagen. Dateien bleiben in diesem Browser und sind beim Rollenwechsel sichtbar.</p></section>`;
}
const roles={member:'Mitglied',provider:'Anbieter',admin:'Administration'};
export function attachmentPanel(s,kind,id,actor,{title,upload=false,empty=true}={}){
  const rows=visibleAttachments(s,kind,id,actor);
  if(!rows.length&&!empty&&!upload)return '';
  return `<section class="attachment-panel" aria-label="${title||'Bilder und Unterlagen'}"><div class="attachment-heading"><h3>${title||'Bilder und Unterlagen'}</h3><span>${rows.length} ${rows.length===1?'Datei':'Dateien'}</span></div>${rows.length?`<div class="attachment-grid">${rows.map(a=>`<article class="attachment-card">${isImage(a)?`<img data-upload-image="${esc(a.id)}" data-upload-kind="${kind}" data-upload-id="${esc(id)}" alt="${esc(a.name)}" loading="lazy">`:'<div class="attachment-file-icon" aria-hidden="true">'+esc(a.name.split('.').at(-1).toUpperCase())+'</div>'}<div class="attachment-info"><strong translate="no">${esc(a.name)}</strong><small>${fileSize(a.size)} · ${roles[a.uploaderRole]||'Testkonto'}</small><button type="button" data-upload-download="${esc(a.id)}" data-upload-kind="${kind}" data-upload-id="${esc(id)}">Herunterladen</button></div></article>`).join('')}</div>`:'<p class="upload-hint">Noch keine Dateien hinterlegt.</p>'}${upload?`<form data-upload-form="deal" data-id="${esc(id)}">${uploadPicker({label:'Unterlagen und Dateien hochladen',kind:'deal',id})}<div class="form-error" role="alert" tabindex="-1"></div><button type="submit" class="upload-submit">Unterlagen speichern</button></form>`:''}</section>`;
}
export function dealAttachmentsPanel(s,d,actor){
  const allowed=actor&&(actor.role==='admin'||!['completed','cancelled'].includes(d.status));
  return attachmentPanel(s,'snapshot',d.id,actor,{title:'Angebotsbilder und Unterlagen bei Annahme',empty:false})+attachmentPanel(s,'deal',d.id,actor,{title:'Unterlagen zum Deal',upload:allowed});
}
export function offerImage(o,actor=null){
  const a=(o.attachments||[]).find(isImage);return a?`<img class="uploaded-offer-image" data-upload-image="${esc(a.id)}" data-upload-kind="offer" data-upload-id="${esc(o.id)}" alt="${esc(o.title)}" loading="lazy">`:'';
}
const selections=new WeakMap(),previews=new Map();
function selection(picker){let value=selections.get(picker);if(!value){value={files:[],removed:[],urls:[]};selections.set(picker,value);}return value;}
function revokeDraft(value){for(const url of value.urls)URL.revokeObjectURL(url);value.urls=[];}
function renderSelection(picker){
  const value=selection(picker);revokeDraft(value);const target=picker.querySelector('.upload-selection');
  target.innerHTML=value.files.map((f,i)=>{let preview='';if(['image/jpeg','image/png','image/webp','image/gif'].includes(f.type)){const url=URL.createObjectURL(f);value.urls.push(url);preview=`<img src="${url}" alt="${esc(f.name)}">`;}
    return `<div class="upload-selected-row">${preview}<span translate="no">${esc(f.name)}<small>${fileSize(f.size)} · zum Speichern ausgewählt</small></span><button type="button" data-upload-remove="${i}" aria-label="${esc(f.name)} aus der Auswahl entfernen">Entfernen</button></div>`;}).join('');
}
function pickerError(picker,message){const box=picker.querySelector('.upload-error');box.textContent=message;if(message)box.focus();}
function verifyBasic(file){const ext=String(file.name).split('.').at(-1).toLowerCase();if(!FILE_TYPES[ext])throw Error('Dieses Dateiformat wird nicht unterstützt.');if(!file.size||file.size>MAX_FILE_BYTES)throw Error(file.name+': Maximal 5 MB pro Datei; leere Dateien sind nicht zulässig ('+file.size+' Byte).');}

export function installAttachmentInteractions(root,{context,save,changed,toast}){
  const images=new Map();
  root.addEventListener('change',e=>{
    const input=e.target,picker=input.closest?.('[data-upload-picker]');if(!picker||input.type!=='file')return;
    const value=selection(picker);
    try{
      const added=[...input.files];added.forEach(verifyBasic);const next=[...value.files];
      for(const f of added)if(!next.some(x=>x.name===f.name&&x.size===f.size&&x.lastModified===f.lastModified))next.push(f);
      const existing=picker.querySelectorAll('[data-existing-file]:not([hidden])').length;
      if(next.length+existing>MAX_ATTACHMENTS)throw Error('Maximal 10 Dateien pro Angebot oder Deal.');
      value.files=next;pickerError(picker,'');renderSelection(picker);
    }catch(error){pickerError(picker,error.message);}input.value='';
  });
  root.addEventListener('click',async e=>{
    const remove=e.target.closest?.('[data-upload-remove],[data-upload-remove-existing]');
    if(remove){e.preventDefault();e.stopImmediatePropagation();const picker=remove.closest('[data-upload-picker]'),value=selection(picker);if(remove.dataset.uploadRemove!==undefined){value.files.splice(Number(remove.dataset.uploadRemove),1);renderSelection(picker);}else{value.removed.push(remove.dataset.uploadRemoveExisting);remove.closest('[data-existing-file]').hidden=true;}return;}
    const button=e.target.closest?.('[data-upload-download]');if(!button)return;
    e.preventDefault();e.stopImmediatePropagation();button.disabled=true;
    try{
      let c=context(),meta=findAttachment(c.state,button.dataset.uploadKind,button.dataset.uploadId,c.actor,button.dataset.uploadDownload);
      const record=await fileStore.get(meta.id);c=context();meta=findAttachment(c.state,button.dataset.uploadKind,button.dataset.uploadId,c.actor,meta.id);
      if(!record?.blob||record.blob.size!==meta.size||record.blob.type!==meta.type)throw Error('Die Datei ist in diesem Browser nicht vorhanden. Bitte auf dem Gerät öffnen, auf dem sie gespeichert wurde.');
      const url=URL.createObjectURL(record.blob),a=document.createElement('a');a.href=url;a.download=meta.name;a.rel='noopener';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){toast(error.message);}finally{if(button.isConnected)button.disabled=false;}
  },true);
  root.addEventListener('submit',async e=>{
    const f=e.target,kind=f.dataset.uploadForm||f.dataset.form;
    if(!['offer','accept','proof','deal','purchase-checkout'].includes(kind)||(!f.querySelector('[data-upload-picker]')&&kind!=='deal'))return;
    e.preventDefault();e.stopImmediatePropagation();if(f.dataset.uploadBusy)return;f.dataset.uploadBusy='true';
    const button=f.querySelector('button[type="submit"]'),picker=f.querySelector('[data-upload-picker]'),value=selection(picker),error=f.querySelector('.form-error');
    const data=Object.fromEntries(new FormData(f));
    if(kind==='purchase-checkout'){const c=context();data.token=c.checkoutToken;}
    if(button){button.disabled=true;button.setAttribute('aria-busy','true');}if(error)error.textContent='';
    try{
      if(!f.reportValidity())return;
      const result=await submitAttachmentAction({context:()=>{if(!f.isConnected)throw Error('Das Formular wurde geschlossen. Bitte erneut speichern.');return context();},action:{kind,id:f.dataset.id,data},files:[...value.files],removed:[...value.removed],save});
      revokeDraft(value);changed(result,kind);toast(result.message);
    }catch(err){if(error){error.textContent=err.message;error.focus();}else toast(err.message);}
    finally{delete f.dataset.uploadBusy;if(button?.isConnected){button.disabled=false;button.removeAttribute('aria-busy');}}
  },true);
  function hydrate(){
    for(const [img,url]of images)if(!img.isConnected){URL.revokeObjectURL(url);images.delete(img);}
    for(const [picker,value]of previews)if(!picker.isConnected){revokeDraft(value);previews.delete(picker);}
    for(const picker of root.querySelectorAll('[data-upload-picker]'))if(!previews.has(picker))previews.set(picker,selection(picker));
    for(const img of root.querySelectorAll('img[data-upload-image]')){
      if(img.dataset.uploadLoading)continue;img.dataset.uploadLoading='true';
      void(async()=>{try{let c=context(),meta=findAttachment(c.state,img.dataset.uploadKind,img.dataset.uploadId,c.actor,img.dataset.uploadImage);if(!isImage(meta))return;const record=await fileStore.get(meta.id);if(!img.isConnected)return;c=context();findAttachment(c.state,img.dataset.uploadKind,img.dataset.uploadId,c.actor,meta.id);if(!record?.blob||record.blob.type!==meta.type||record.blob.size!==meta.size)throw Error('Bild nicht auf diesem Gerät gespeichert');const url=URL.createObjectURL(record.blob);images.set(img,url);img.src=url;}catch{img.alt='Bild nur auf dem ursprünglichen Testgerät verfügbar';img.classList.add('upload-unavailable');}})();
    }
  }
  const observer=new MutationObserver(hydrate);observer.observe(root.body||root,{childList:true,subtree:true});
  window.addEventListener('pagehide',()=>{for(const url of images.values())URL.revokeObjectURL(url);images.clear();for(const value of previews.values())revokeDraft(value);previews.clear();});
  hydrate();return hydrate;
}
