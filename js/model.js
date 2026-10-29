import {categoryName,sameCategory} from './categories.js';
import {enrichSeed} from './seed.js';
export const DEAL_LABELS={requested:'Angenommen',review:'In Prüfung',confirmed:'Bestätigt',completed:'Abgeschlossen',cancelled:'Storniert'};
export const PAYMENT_LABELS={pending:'Ausstehend',released:'Freigegeben',processing:'In Auszahlung',paid:'Ausgezahlt',failed:'Fehlgeschlagen',stopped:'Gestoppt'};
export const ALLOWED={requested:['review','cancelled'],review:['confirmed','cancelled'],confirmed:['completed','cancelled'],completed:[],cancelled:[]};
export const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n);
export const date=s=>new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(s));
export const time=s=>new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}).format(new Date(s));
const rows=[
 ['0042','Lena Berger','Nordlicht Mobil','Premium 5G · 30 GB','Telekommunikation',250,'confirmed','pending','2026-10-21',true],
 ['0041','Daniel Weiss','GrünVolt Energie','Ökostrom Zuhause','Energie',120,'review','pending','2026-10-20',false],
 ['0040','Mira Scholz','Hanse Direkt','Kfz-Komfortschutz','Versicherungen',180,'completed','failed','2026-10-19',true],
 ['0039','Jonas Richter','Reisezeit Plus','Familienreise Türkei','Reisen',200,'completed','paid','2026-10-18',true],
 ['0038','Amira Yilmaz','Wohnwerk Immobilien','Eigentumswohnung Stuttgart','Immobilien',500,'confirmed','pending','2026-10-18',true],
 ['0037','Paul Neumann','AutoQuartier','Jahreswagen Kompakt','Mobilität',300,'completed','released','2026-10-17',true],
 ['0036','Sofia Klein','Nordlicht Mobil','Glasfaser Zuhause','Telekommunikation',150,'review','pending','2026-10-16',true],
 ['0035','Tim Fischer','Frischemarkt','Lebensmittelkarte 100 €','Einzelhandel',10,'completed','processing','2026-10-16',true],
 ['0034','Emma Hoffmann','GrünVolt Energie','Ökostrom Flex','Energie',100,'requested','pending','2026-10-15',false],
 ['0033','Noah Wagner','KarriereWerk','Fachkraft Logistik','Job & Karriere',2000,'review','pending','2026-10-14',true],
 ['0032','Lea Braun','Nordlicht Mobil','Premium 5G · 30 GB','Telekommunikation',250,'cancelled','stopped','2026-10-13',true],
 ['0031','Ben Hartmann','Hanse Direkt','Hausrat Komfort','Versicherungen',80,'cancelled','stopped','2026-10-12',false]
];
const stamp='2026-10-23T08:40:00.000Z';
function createAdminSeed(){
 const deals=rows.map((r,i)=>({id:'BM-2026-'+r[0],user:r[1],provider:r[2],offer:r[3],category:r[4],cashback:r[5],status:r[6],payment:r[7],created:r[8]+'T08:10:00Z',funded:r[9],userId:'U-'+(2108-i),providerId:'A-'+({ 'Nordlicht Mobil':101,'GrünVolt Energie':102,'Hanse Direkt':103,'Reisezeit Plus':104,'Wohnwerk Immobilien':105,'AutoQuartier':106,'Frischemarkt':107,'KarriereWerk':108}[r[2]]),contract:'V-2026-'+(8402-i),paymentRef:'OPP-DEMO-'+(72042-i),due:i===2?'2026-10-22T10:00:00Z':'2026-10-28T10:00:00Z',fee:Math.round(r[5]*0.1*100)/100,events:[{id:'seed-'+i+'-a',at:r[8]+'T08:10:00Z',kind:'deal',title:'Deal angenommen',detail:'Angebot durch das Mitglied angenommen.',actor:r[1]},...(r[6]!=='requested'?[{id:'seed-'+i+'-b',at:r[8]+'T10:20:00Z',kind:'deal',title:DEAL_LABELS[r[6]],detail:r[6]==='cancelled'?'Widerruf des Mitglieds dokumentiert. Cashback gestoppt.':r[6]==='review'?'Vertragsnachweis wird durch den Anbieter geprüft.':'Vertragsnachweis durch den Anbieter bestätigt.',actor:r[2]}]:[]),...(r[7]==='failed'?[{id:'seed-'+i+'-c',at:'2026-10-22T13:10:00Z',kind:'payment',title:'Auszahlung fehlgeschlagen',detail:'Empfängerkonto nicht verifiziert. Kein Geld abgeflossen.',actor:'Zahlungsdienst · Demo'}]:[]),...(r[7]==='paid'?[{id:'seed-'+i+'-d',at:'2026-10-22T09:20:00Z',kind:'payment',title:'Cashback ausgezahlt',detail:money(r[5])+' an das Mitglied ausgezahlt.',actor:'Zahlungsdienst · Demo'}]:[])]}));
 for(const d of deals){
  const day=d.created.slice(0,10),at=t=>day+'T'+t+':00Z';
  const add=(kind,title,detail,when,actor)=>d.events.push({id:'seed-'+d.id+'-'+title,at:when,kind,title,detail,actor});
  if(['confirmed','completed'].includes(d.status))add('deal','In Prüfung','Vertragsnachweis zur Prüfung übernommen.',at('09:00'),d.provider);
  if(d.status==='completed')add('deal','Bestätigt','Vertrag und Prämienbedingungen durch den Anbieter bestätigt.',at('10:00'),d.provider);
  if(['released','processing','failed','paid'].includes(d.payment))add('payment','Cashback freigegeben','Anbieterbudget gedeckt und Prämienbedingungen erfüllt.',at('11:00'),'Zahlungsdienst · Demo');
  if(['processing','failed','paid'].includes(d.payment))add('payment','Auszahlung beauftragt','Auszahlung an das verknüpfte Mitgliedskonto angestoßen.',at('12:00'),'Zahlungsdienst · Demo');
 }
 const tickets=[
 {id:'AN-108',dealId:deals[0].id,subject:'Wann wird mein Cashback freigegeben?',role:'user',status:'open',priority:'normal',messages:[{from:'user',text:'Mein Mobilfunkvertrag ist bereits aktiv. Wann stehen die 250 € in meiner Wallet zur Verfügung?',at:'2026-10-23T08:40:00Z'}]},
 {id:'AN-107',dealId:deals[1].id,subject:'Vertragsnachweis fehlt',role:'provider',status:'open',priority:'high',messages:[{from:'provider',text:'Für die Bestätigung fehlt uns noch die Kundennummer. Könnt ihr beim Mitglied nachfragen?',at:'2026-10-23T08:05:00Z'}]},
 {id:'AN-106',dealId:deals[2].id,subject:'Auszahlung nicht angekommen',role:'user',status:'open',priority:'high',messages:[{from:'user',text:'In meiner Wallet werden 180 € angezeigt, aber die Auszahlung ist fehlgeschlagen. Was muss ich tun?',at:'2026-10-22T14:20:00Z'},{from:'admin',text:'Wir prüfen den Zahlungsstatus. Bitte kontrolliere in deinem Profil, ob dein Auszahlungskonto vollständig verifiziert ist.',at:'2026-10-22T14:45:00Z'}]},
 {id:'AN-105',dealId:deals[3].id,subject:'Prämie erhalten – vielen Dank',role:'user',status:'resolved',priority:'normal',messages:[{from:'user',text:'Die Reiseprämie ist auf meinem Konto angekommen. Danke für die Unterstützung!',at:'2026-10-22T10:05:00Z'},{from:'admin',text:'Vielen Dank für die Rückmeldung. Wir haben die Anfrage als erledigt markiert.',at:'2026-10-22T10:15:00Z'}]},
 {id:'AN-104',dealId:deals[10].id,subject:'Stornierung bestätigt',role:'provider',status:'resolved',priority:'normal',messages:[{from:'provider',text:'Der Vertrag wurde widerrufen. Bitte den Deal stornieren.',at:'2026-10-20T08:00:00Z'},{from:'admin',text:'Die Stornierung ist dokumentiert. Für diesen Deal erfolgt keine Cashbackauszahlung.',at:'2026-10-20T08:20:00Z'}]}
 ];
 return {version:1,deals,tickets,lastSaved:stamp};
}
export function attention(state,d){return d.payment==='failed'||state.tickets.some(t=>t.dealId===d.id&&t.status==='open');}
export function selectDeals(state,{q='',dealStatus='',paymentStatus='',category='',subcategory='',scope='all',sort='newest'}={}){
 const needle=q.trim().toLocaleLowerCase('de');
 return state.deals.filter(d=>(!needle||[d.id,d.user,d.provider,d.offer,d.userId,d.providerId,categoryName(d.category),d.subcategory||''].some(s=>s.toLocaleLowerCase('de').includes(needle)))&&(!dealStatus||d.status===dealStatus)&&(!paymentStatus||d.payment===paymentStatus)&&(!category||sameCategory(d.category,category))&&(!subcategory||d.subcategory===subcategory)&&(scope!=='attention'||attention(state,d))&&(scope!=='completed'||d.status==='completed')).sort((a,b)=>sort==='cashback'?b.cashback-a.cashback:sort==='oldest'?a.created.localeCompare(b.created):b.created.localeCompare(a.created));
}
export function stats(s){return {total:s.deals.length,active:s.deals.filter(d=>!['completed','cancelled'].includes(d.status)).length,outstanding:s.deals.filter(d=>!['paid','stopped'].includes(d.payment)).reduce((v,d)=>v+d.cashback,0),open:s.tickets.filter(t=>t.status==='open').length,attention:s.deals.filter(d=>attention(s,d)).length};}
export function event(d,kind,title,detail,actor='Ejdat Akyol · Admin'){d.events.push({id:globalThis.crypto?.randomUUID?.()||'evt-'+Date.now()+'-'+Math.random().toString(36).slice(2),at:new Date().toISOString(),kind,title,detail,actor});}
export function changeDeal(s,id,next,reason,actor='Ejdat Akyol · Admin'){
 const d=s.deals.find(x=>x.id===id);
 if(!d||!(ALLOWED[d.status]||[]).includes(next))throw Error('Dieser Statuswechsel ist nicht möglich.');
 if(reason.trim().length<5)throw Error('Bitte einen nachvollziehbaren Grund mit mindestens 5 Zeichen angeben.');
 if(next==='confirmed'&&!d.proof)throw Error('Vor der Bestätigung ist ein Nachweis erforderlich.');
 if(next==='cancelled'&&['processing','paid'].includes(d.payment))throw Error('Eine laufende oder erfolgte Auszahlung muss zuerst mit dem Zahlungsdienst geklärt werden.');
 const prev=d.status;d.status=next;event(d,'deal',DEAL_LABELS[prev]+' → '+DEAL_LABELS[next],reason.trim(),actor);
 if(next==='cancelled'){d.payment='stopped';event(d,'payment','Cashback gestoppt','Deal storniert. Budgetreservierung freigegeben.',actor);if(d.purchase&&d.purchase.status==='paid'){d.purchase.status='refunded';const o=s.orders?.find(o=>o.id===d.purchase.orderId),item=o?.items.find(l=>l.key===d.purchase.itemKey);if(item)item.status='refunded';if(o)o.status=o.items.every(l=>l.status==='refunded')?'refunded':'partial_refund';event(d,'purchase','Kaufpreis erstattet · Simulation',money(d.purchase.totalCents/100)+' als erstattet dokumentiert. Keine echte Geldbewegung.',actor);}}
}
export function releasePayment(s,id){const d=s.deals.find(x=>x.id===id);if(!d||d.status!=='completed'||!d.funded||d.payment!=='pending')throw Error('Freigabe erfordert einen abgeschlossenen, gedeckten Deal mit ausstehender Zahlung.');d.payment='released';event(d,'payment','Cashback freigegeben · Simulation','Freigabe über '+money(d.cashback)+' dokumentiert. Es wurde kein echter Zahlungsauftrag ausgelöst.');}
export function reply(s,id,text,internal=false){const t=s.tickets.find(x=>x.id===id);if(!t)throw Error('Anfrage nicht gefunden.');if(!text.trim())throw Error('Bitte eine Nachricht eingeben.');if(text.length>3000)throw Error('Die Nachricht darf höchstens 3.000 Zeichen enthalten.');t.messages.push({from:internal?'internal':'admin',text:text.trim(),at:new Date().toISOString()});event(s.deals.find(d=>d.id===t.dealId),'message',internal?'Interne Notiz hinzugefügt':'Antwort an '+(t.role==='user'?'Mitglied':'Anbieter')+' · Demo',t.id+' · '+(internal?'Nur für die Administration sichtbar.':'Im Prototyp gespeichert.'));}
export function setTicketStatus(s,id,status){const t=s.tickets.find(x=>x.id===id);if(!t||!['open','resolved'].includes(status))throw Error('Ungültiger Anfragestatus.');if(t.status===status)return;t.status=status;event(s.deals.find(d=>d.id===t.dealId),'message',status==='resolved'?'Anfrage erledigt':'Anfrage wieder geöffnet',t.id+' · '+t.subject);}

export function createSeed(){return enrichSeed(createAdminSeed());}
