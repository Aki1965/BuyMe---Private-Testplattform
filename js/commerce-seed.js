import {categoryName} from './categories.js';
// Additive demo catalog migration. Existing offers, purchases and account data stay intact.
export function upgradeCommerce(s){
 if(s.commerceVersion===1)return s;
 const providers=[
  {id:'A-SHOP-MODE',name:'Stadtmode',description:'Schuhe und ausgewählte Mode für deinen Alltag. Fiktiver Anbieter im privaten Test.',art:'shop',email:'mode@example.test'},
  {id:'A-SHOP-TISCH',name:'Tischzeit',description:'Kulinarische Erlebnisse und Menüs für gemeinsame Abende. Fiktiver Anbieter im privaten Test.',art:'shop',email:'gastro@example.test'}
 ];
 for(const item of providers)if(!s.providers.some(p=>p.id===item.id))s.providers.push({...item,region:'Deutschland',city:'Stuttgart',address:'Demostraße 12',postalCode:'70173',country:'Deutschland',contactName:'Demo-Partnerteam',credit:10000,verified:true,status:'active',createdAt:'2026-10-26T10:00:00Z'});
 const examples=[
  ['TABLET','A-101','Tablet Air 11 · 128 GB','Einzelhandel','Smartphones & Tablets',39900,2500,'tablet','product',5,['WLAN · Blau'],'11-Zoll-Display, 128 GB Speicher und WLAN. Versand innerhalb Deutschlands inklusive. Fiktives Beispielgerät ohne Herstellerbindung.','Versand in 3–5 Werktagen'],
  ['EBIKE','A-106','City E-Bike Urban 500','Mobilität','Fahrräder & E-Bikes',189900,12000,'bike','product',2,['Rahmen M','Rahmen L'],'City-E-Bike mit 500-Wh-Akku und Gepäckträger. Fiktives Beispielmodell mit kostenlosem Versand innerhalb Deutschlands.','Versand in 5–7 Werktagen'],
  ['REISE','A-104','Mallorca · 7 Nächte für zwei','Reisen','Pauschalreisen',149000,10000,'holiday','travel',1,['02.–09.06.2027 · 2 Erwachsene'],'Festes Beispielpaket: 7 Nächte im Doppelzimmer, Halbpension und Hin- und Rückflug ab Stuttgart. Reisepreis gesamt für zwei Erwachsene.','02.–09.06.2027 · 2 Erwachsene'],
  ['SCHUHE','A-SHOP-MODE','Sneaker Everyday','Mode','Schuhe',7990,800,'shoes','product',5,['Größe 38','Größe 39','Größe 40','Größe 41','Größe 42','Größe 43'],'Bequeme Alltagssneaker in Weiß. Wähle deine Größe. Kostenloser Versand innerhalb Deutschlands. Fiktives Beispielprodukt.','Versand in 3–5 Werktagen'],
  ['MENUE','A-SHOP-TISCH','Dinner für zwei · 3-Gänge-Menü','Gastronomie','Abendessen & Menüs',6900,700,'dining','voucher',3,['Gutschein · 2 Personen'],'Digitaler Menügutschein für zwei Personen bei Tischzeit Stuttgart. Drei Gänge, Getränke separat. Reservierung nach dem Kauf; im Test sechs Monate gültig.','Digitaler Gutschein nach Anbieterbestätigung']
 ];
 for(const [sku,providerId,title,category,subcategory,unitCents,cashbackCents,art,kind,maxQty,variants,description,fulfilment] of examples){
  const id='OF-SHOP-'+sku;if(s.offers.some(o=>o.id===id))continue;
  s.offers.unshift({id,providerId,title,category:categoryName(category),subcategory,cashback:cashbackCents/100,price:new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(unitCents/100)+' Gesamtpreis',description,conditions:'Bezahlte Bestellung, Bestätigung der Lieferung oder Leistung durch den Anbieter und kein Widerruf oder Rücktritt. Cashback wird nach separater Prüfung freigegeben.',budget:10000,region:'Deutschland',validUntil:'2027-12-31',status:'active',art,created:'2026-10-26T10:00:00Z',payoutDays:14,moderationNote:'Fiktives Kaufangebot für Warenkorb und Testzahlung.',purchase:{sku,kind,unitCents,maxQty,variants,fulfilment,shippingCents:0}});
 }
 s.carts=s.carts||{};s.orders=s.orders||[];s.commerceVersion=1;return s;
}
