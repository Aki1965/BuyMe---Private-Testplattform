import {upgradeCommerce} from './commerce-seed.js';
import {seedSubcategory,upgradeTaxonomy} from './categories.js';
export {CATEGORIES} from './categories.js';
const companyInfo={
 'A-101':['Mobilfunk, der zu deinem Alltag passt. Klare Tarife, persönliche Beratung.','Stuttgart','mobil'],
 'A-102':['Energie für dein Zuhause. Transparente Tarife und erneuerbare Energie.','Deutschland','energy'],
 'A-103':['Versicherungsschutz mit persönlicher Beratung und nachvollziehbaren Leistungen.','Hamburg','shield'],
 'A-104':['Urlaub, auf den du dich freuen kannst. Reisen für Familien und Entdecker.','Deutschland','travel'],
 'A-105':['Wohnen mit Perspektive. Immobilienangebote mit persönlicher Begleitung.','Stuttgart','home'],
 'A-106':['Dein nächstes Auto. Geprüfte Fahrzeuge und persönliche Beratung.','München','car'],
 'A-107':['Gute Lebensmittel für jeden Tag. Regional einkaufen und profitieren.','Berlin','shop'],
 'A-108':['Neue Möglichkeiten für deinen nächsten Karriereschritt.','Deutschland','work']
};
const extras={
 'Premium 5G · 30 GB':['29,99 € / Monat','30 GB Datenvolumen, 5G und Allnet-Flat. 24 Monate Mindestlaufzeit.','Neukundenvertrag abschließen, Vertrag aktivieren und vereinbarte Widerrufsfrist abwarten.'],
 'Ökostrom Zuhause':['Ab 32 € / Monat','100 % Ökostrom für deinen Haushalt. Beispielabschlag bei 2.500 kWh.','Neukunde, erfolgreicher Lieferbeginn und bestätigter Vertrag.'],
 'Kfz-Komfortschutz':['Ab 39 € / Monat','Ein Schutzpaket für dein Auto mit persönlicher Beratung.','Neuer Versicherungsvertrag und bestätigter Versicherungsbeginn.'],
 'Familienreise Türkei':['Ab 1.490 € / Buchung','Sonne, Meer und gemeinsame Zeit. Beispielreise für zwei Personen.','Bestätigte Buchung, bezahlte Reise und kein Rücktritt.'],
 'Eigentumswohnung Stuttgart':['395.000 € Kaufpreis','Helle 3-Zimmer-Wohnung mit Balkon. Beispielangebot für die Demo.','Wirksamer Kaufabschluss, Bestätigung durch den Anbieter und Erfüllung der Prämienbedingungen. Nur die Prämie wird hier simuliert.'],
 'Jahreswagen Kompakt':['22.900 € Kaufpreis','Ein gepflegter Jahreswagen für Alltag und Freizeit.','Bestätigter Fahrzeugkauf und erfolgte Übergabe. Nur die Prämie wird hier simuliert.'],
 'Glasfaser Zuhause':['39,99 € / Monat','Bis zu 500 Mbit/s im Download. Zuhause entspannt streamen und arbeiten.','Neukundenvertrag, erfolgreicher Anschluss und bestätigter Vertragsbeginn.'],
 'Lebensmittelkarte 100 €':['100 € Kartenwert','Eine Einkaufskarte für frische Lebensmittel im teilnehmenden Markt.','Erster Kauf einer 100-Euro-Einkaufskarte und bestätigte Aktivierung.'],
 'Ökostrom Flex':['Ab 36 € / Monat','Ein flexibler Stromtarif mit monatlicher Kündigungsmöglichkeit.','Bestätigter Lieferbeginn und erfüllte Angebotsbedingungen.'],
 'Fachkraft Logistik':['Vollzeit · Stuttgart','Ein neuer Job in einem modernen Logistikunternehmen.','Arbeitsvertrag und bestätigter Arbeitsbeginn. Prämie nach vereinbarter Beschäftigungsdauer.'],
 'Hausrat Komfort':['Ab 8,90 € / Monat','Schutz für das, was dein Zuhause ausmacht.','Neuvertrag und bestätigter Versicherungsbeginn.']
};
export function enrichSeed(base){
 const s={...base,version:2,offers:[],members:[],providers:[],reviews:[],activity:[],payouts:[],nextDeal:43,nextOffer:120,nextTicket:109};
 const pm=new Map(),um=new Map(),om=new Map();
 for(const d of s.deals){
  if(!pm.has(d.providerId)){const [description,region,art]=companyInfo[d.providerId]||['Dein BuyMe-Partner.','Deutschland','shop'];pm.set(d.providerId,{id:d.providerId,name:d.provider,description,region,art,credit:10000,verified:true,status:'active',contact:'Partnerteam',email:'partner@example.test'});}
  if(!um.has(d.userId))um.set(d.userId,{id:d.userId,name:d.user,email:d.user.toLowerCase().replaceAll(' ','.')+'@example.test',city:'Stuttgart',status:'active',interests:[d.category]});
  const key=d.providerId+'|'+d.offer;
  if(!om.has(key)){const x=extras[d.offer]||['Preis beim Anbieter',d.offer,'Bestätigung durch den Anbieter und erfüllte Prämienbedingungen.'];om.set(key,{id:'OF-'+(101+om.size),providerId:d.providerId,title:d.offer,category:d.category,cashback:d.cashback,price:x[0],description:x[1],conditions:x[2],budget:Math.max(2000,d.cashback*20),region:pm.get(d.providerId).region,validUntil:'2027-12-31',status:'active',art:pm.get(d.providerId).art,created:'2026-10-15T08:00:00Z',payoutDays:14,moderationNote:'Beispielangebot geprüft.'});}
  const o=om.get(key);o.subcategory=seedSubcategory(o);d.subcategory=o.subcategory;d.offerId=o.id;d.snapshot={category:o.category,subcategory:o.subcategory,title:o.title,price:o.price,description:o.description,conditions:o.conditions,provider:d.provider,cashback:d.cashback};d.proof=d.status==='requested'?null:{reference:'DEMO-NACHWEIS-'+d.contract,at:d.created,type:'demo'};d.reserved=Math.round((d.cashback+d.fee)*100)/100;d.messages=d.messages||[];
 }
 s.providers=[...pm.values()];s.members=[...um.values()];s.offers=[...om.values()];
 s.offers.push({id:'OF-119',providerId:'A-101',title:'5G Flex · 60 GB',category:'Telekommunikation',cashback:160,price:'24,99 € / Monat',description:'Mehr Daten. Mehr Freiheit. 60 GB im 5G-Netz, Allnet-Flat und flexible Laufzeit. Ein vollständiges Demoangebot für deinen ersten Testdeal.',conditions:'Neukundenvertrag abschließen und den Vertragsnachweis hinterlegen. Anbieter bestätigt den Abschluss. Nach Prüfung der vereinbarten Frist wird die Prämie freigegeben.',budget:4000,region:'Deutschland',validUntil:'2027-12-31',status:'active',art:'mobil',created:'2026-10-25T08:00:00Z',payoutDays:14,moderationNote:'Testangebot für den vollständigen Ablauf.'});
 s.deals[0].messages=[{from:'user',text:'Hallo, der Vertrag ist aktiv. Benötigt ihr noch weitere Unterlagen?',at:'2026-10-23T09:00:00Z'},{from:'provider',text:'Vielen Dank! Der Nachweis liegt uns vor. Die Bestätigung ist bereits dokumentiert.',at:'2026-10-23T09:30:00Z'}];
 s.tickets.forEach(t=>t.kind='support');
 s.reviews=[{id:'RV-1',dealId:'BM-2026-0039',providerId:'A-104',userId:'U-2105',name:'Jonas Richter',rating:5,text:'Die Prämie wurde wie vereinbart ausgezahlt. Übersichtlicher Ablauf.',at:'2026-10-22T12:00:00Z'}];
 return upgradeCommerce(upgradeTaxonomy(s));
}
