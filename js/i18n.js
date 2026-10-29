import {DICTIONARY} from './i18n-data.js';
export const LANGUAGE_KEY='buyme-language-v1';
export const LANGUAGES=[
 {code:'de',name:'Deutsch',locale:'de-DE'}, {code:'en',name:'English',locale:'en-GB'},
 {code:'fr',name:'Français',locale:'fr-FR'}, {code:'sv',name:'Svenska',locale:'sv-SE'},
 {code:'it',name:'Italiano',locale:'it-IT'}, {code:'tr',name:'Türkçe',locale:'tr-TR'}
];
export function validLanguage(code){return LANGUAGES.some(l=>l.code===code);}
let language='de';
try{const saved=globalThis.localStorage?.getItem(LANGUAGE_KEY);if(validLanguage(saved))language=saved;}catch{}
export const getLanguage=()=>language;
export const localeFor=code=>LANGUAGES.find(l=>l.code===code)?.locale||'de-DE';
const expanded={...DICTIONARY};
for(const [key,values] of Object.entries(DICTIONARY)){
 const upper=key.toLocaleUpperCase('de-DE');
 if(!expanded[upper])expanded[upper]=values.map((v,i)=>v.toLocaleUpperCase(LANGUAGES[i+1].locale));
}
const escapeRegex=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const keys=Object.keys(expanded).sort((a,b)=>b.length-a.length);
const phraseRegex=new RegExp('(?<![\\p{L}\\p{N}])(?:'+keys.map(escapeRegex).join('|')+')(?![\\p{L}\\p{N}])','gu');
const nouns={
 Angebot:[['offer','offers'],['offre','offres'],['erbjudande','erbjudanden'],['offerta','offerte'],['teklif','teklif']],
 Deal:[['deal','deals'],['transaction','transactions'],['affär','affärer'],['operazione','operazioni'],['işlem','işlem']],
 Unterkategorie:[['subcategory','subcategories'],['sous-catégorie','sous-catégories'],['underkategori','underkategorier'],['sottocategoria','sottocategorie'],['alt kategori','alt kategori']],
 Bewertung:[['review','reviews'],['avis','avis'],['omdöme','omdömen'],['recensione','recensioni'],['değerlendirme','değerlendirme']],
 Nachricht:[['message','messages'],['message','messages'],['meddelande','meddelanden'],['messaggio','messaggi'],['mesaj','mesaj']],
 Vorgang:[['transaction','transactions'],['opération','opérations'],['ärende','ärenden'],['operazione','operazioni'],['kayıt','kayıt']]
};
function translatedCount(value,index){
 const m=value.match(/^(\d+) (Angebote?|Deals?|Unterkategorien?|Bewertungen?|Nachrichten?|Vorgänge|Vorgang)$/u);
 if(!m)return null;
 const forms={Angebote:'Angebot',Deals:'Deal',Unterkategorien:'Unterkategorie',Bewertungen:'Bewertung',Nachrichten:'Nachricht',Vorgänge:'Vorgang'};
 const noun=forms[m[2]]||m[2],pair=nouns[noun]?.[index];return pair?m[1]+' '+pair[Number(m[1])===1?0:1]:null;
}
export function translateText(value,code=language){
 const source=String(value??'');if(code==='de'||!validLanguage(code))return source;
 const index=LANGUAGES.findIndex(l=>l.code===code)-1,trimmed=source.trim(),count=translatedCount(trimmed,index);
 const exact=expanded[trimmed]?.[index];
 let result=exact?source.replace(trimmed,exact):count?source.replace(trimmed,count):source.replace(phraseRegex,key=>expanded[key][index]);
 const short=trimmed.match(/^(.+) ist zu kurz \(mindestens (\d+) Zeichen\)\.$/);
 if(short){const field=translateText(short[1],code),n=short[2];result=[`${field} must have at least ${n} characters.`,`${field} doit comporter au moins ${n} caractères.`,`${field} måste innehålla minst ${n} tecken.`,`${field} deve contenere almeno ${n} caratteri.`,`${field} en az ${n} karakter olmalı.`][index];}
 const range=trimmed.match(/^(.+) muss zwischen ([\d.]+) und ([\d.]+) liegen\.$/);
 if(range){const field=translateText(range[1],code),a=range[2],b=range[3];result=[`${field} must be between ${a} and ${b}.`,`${field} doit être compris entre ${a} et ${b}.`,`${field} måste vara mellan ${a} och ${b}.`,`${field} deve essere compreso tra ${a} e ${b}.`,`${field} ${a} ile ${b} arasında olmalı.`][index];}
 const locale=localeFor(code);
 result=result.replace(/(?<![\p{L}\p{N}])(-?\d[\d.]*)(?:,(\d{2}))?\s*€/gu,(_,whole,cents)=>new Intl.NumberFormat(locale,{style:'currency',currency:'EUR'}).format(Number(whole.replaceAll('.',''))+((Number(whole)<0?-1:1)*Number(cents||0)/100)));
 result=result.replace(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g,(_,d,m,y)=>new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Berlin'}).format(new Date(Date.UTC(Number(y),Number(m)-1,Number(d),12))));
 return result;
}
export function setLanguage(code,persist=true){
 if(!validLanguage(code))return false;language=code;
 if(persist)try{globalThis.localStorage?.setItem(LANGUAGE_KEY,code);}catch{}
 if(typeof document!=='undefined'){document.documentElement.lang=code;localizePage();document.dispatchEvent(new CustomEvent('buyme:languagechange',{detail:{language:code}}));}
 return true;
}
const textSources=new WeakMap(),attributeSources=new WeakMap();
const protectedContent='[translate="no"], [data-i18n-ignore], script, style, code, .language-picker';
const skip=protectedContent+', textarea';
let observer,queued=false,applying=false;
const originalTitle=typeof document!=='undefined'?document.title:'';
function sourceForText(node){
 const old=textSources.get(node),value=node.nodeValue;
 if(!old||value!==old.last){const entry={source:value,last:value};textSources.set(node,entry);return entry;}return old;
}
function updatePicker(){
 const label=LANGUAGES.find(l=>l.code===language),selector=document.querySelector('.language-picker');
 if(!selector)return;
 selector.querySelector('.language-current').textContent=label.name;
 selector.querySelector('.language-code').textContent=language.toUpperCase();
 selector.querySelector('summary').setAttribute('aria-label',translateText('Sprache auswählen')+': '+label.name);
 for(const button of selector.querySelectorAll('[data-language]')){const selected=button.dataset.language===language;button.setAttribute('aria-checked',String(selected));button.classList.toggle('selected',selected);}
}
function mountPicker(){
 const host=document.querySelector('.site-header .header-inner, .topbar-right');if(!host||host.querySelector('.language-picker'))return;
 const details=document.createElement('details');details.className='language-picker';details.setAttribute('translate','no');
 details.innerHTML=`<summary aria-label="Sprache auswählen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18M12 3c-5 5-5 13 0 18"/></svg><span class="language-current"></span><span class="language-code"></span><span class="language-chevron" aria-hidden="true">⌄</span></summary><div class="language-options" role="menu">${LANGUAGES.map(l=>`<button type="button" role="menuitemradio" aria-checked="false" data-language="${l.code}" lang="${l.code}" aria-label="${l.name}"><span>${l.name}</span><span class="language-check" aria-hidden="true">✓</span></button>`).join('')}</div>`;
 host.append(details);updatePicker();
}
export function localizePage(root=typeof document!=='undefined'?document.body:null){
 if(!root||applying)return;applying=true;observer?.disconnect();
 try{
  mountPicker();document.documentElement.lang=language;document.title=translateText(originalTitle);updatePicker();
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode())){if(!node.parentElement||node.parentElement.closest(skip)||!node.nodeValue.trim())continue;const entry=sourceForText(node),next=translateText(entry.source);if(node.nodeValue!==next)node.nodeValue=next;entry.last=next;}
  for(const element of root.querySelectorAll('[aria-label], [title], [placeholder], img[alt]')){
   if(element.closest(protectedContent))continue;let sources=attributeSources.get(element);if(!sources){sources={};attributeSources.set(element,sources);}
   for(const name of ['aria-label','title','placeholder','alt']){if(!element.hasAttribute(name))continue;const current=element.getAttribute(name);if(!sources[name]||sources[name].last!==current)sources[name]={source:current,last:current};const next=translateText(sources[name].source);if(next!==current)element.setAttribute(name,next);sources[name].last=next;}
  }
 }finally{applying=false;observer?.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder','alt']});}
}
function schedule(){if(queued||applying)return;queued=true;queueMicrotask(()=>{queued=false;localizePage();});}
if(typeof document!=='undefined'){
 observer=new MutationObserver(schedule);
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-language]');
  if(button){event.preventDefault();event.stopImmediatePropagation();const details=button.closest('details');setLanguage(button.dataset.language);details.open=false;details.querySelector('summary').focus();return;}
  for(const menu of document.querySelectorAll('.language-picker[open]'))if(!menu.contains(event.target))menu.open=false;
 },true);
 document.addEventListener('keydown',event=>{
  const menu=event.target.closest('.language-picker');if(!menu)return;
  if(event.key==='Escape'&&menu.open){event.preventDefault();event.stopImmediatePropagation();menu.open=false;menu.querySelector('summary').focus();}
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();menu.open=true;const items=[...menu.querySelectorAll('[data-language]')],at=items.indexOf(document.activeElement);items[event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(at+1)%items.length:(at-1+items.length)%items.length].focus();}
 },true);
 window.addEventListener('storage',event=>{if(event.key===LANGUAGE_KEY)setLanguage(validLanguage(event.newValue)?event.newValue:'de',false);});
 if(document.body)localizePage();else document.addEventListener('DOMContentLoaded',()=>localizePage(),{once:true});
}
