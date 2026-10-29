import test from 'node:test';
import assert from 'node:assert/strict';
import {DICTIONARY} from '../js/i18n-data.js';
import {LANGUAGES,LANGUAGE_KEY,getLanguage,setLanguage,translateText,localeFor,validLanguage} from '../js/i18n.js';
import {CATEGORY_TREE} from '../js/categories.js';
import {userText} from '../js/ui.js';
import {createSeed} from '../js/model.js';
import {availableOffers} from '../js/platform-model.js';
test('all six requested languages and all five translations per phrase are available',()=>{
 assert.deepEqual(LANGUAGES.map(l=>l.code),['de','en','fr','sv','it','tr']);assert.equal(validLanguage('es'),false);
 assert.ok(Object.keys(DICTIONARY).length>900);
 for(const [key,row] of Object.entries(DICTIONARY)){assert.equal(row.length,5,key);assert.ok(row.every(value=>typeof value==='string'&&value.trim()),key);}
 for(const group of CATEGORY_TREE)for(const label of [group.name,...group.subcategories])assert.ok(DICTIONARY[label],label);
});
test('language selection persists while invalid language codes cannot overwrite it',()=>{
 const data=new Map();globalThis.localStorage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 setLanguage('tr');assert.equal(getLanguage(),'tr');assert.equal(data.get(LANGUAGE_KEY),'tr');assert.equal(setLanguage('xx'),false);assert.equal(getLanguage(),'tr');setLanguage('de');
});
test('navigation, registration, validation and taxonomy render in each requested language',()=>{
 assert.equal(translateText('Anmelden','en'),'Sign in');assert.equal(translateText('Registrieren','fr'),'S’inscrire');assert.equal(translateText('Meine Deals','sv'),'Mina affärer');assert.equal(translateText('Passwort','it'),'Password');assert.equal(translateText('Anmelden','tr'),'Giriş yap');
 assert.equal(translateText('WILLKOMMEN BEI BUYME','tr'),'BUYME’YE HOŞ GELDİN');
 assert.equal(translateText('Telekommunikation & Internet › DSL & Glasfaser','en'),'Telecommunications & Internet › DSL & fibre');
 assert.equal(translateText('3 Angebote','en'),'3 offers');assert.equal(translateText('1 Angebot','fr'),'1 offre');
 assert.equal(translateText('Name ist zu kurz (mindestens 3 Zeichen).','en'),'Name must have at least 3 characters.');
 assert.equal(translateText('Budget muss zwischen 1 und 1000 liegen.','sv'),'Budget måste vara mellan 1 och 1000.');
});
test('display localization never changes taxonomy values or stored deal and payment data',()=>{
 const s=createSeed(),before=JSON.stringify(s);
 for(const language of LANGUAGES.map(l=>l.code)){setLanguage(language);translateText('Bestätigt',language);translateText('In Auszahlung',language);assert.equal(availableOffers(s,{category:'Telekommunikation & Internet',subcategory:'DSL & Glasfaser'}).length,1);}
 assert.equal(JSON.stringify(s),before);setLanguage('de');
});
test('money and dates use the selected locale without currency conversion or identifier rewriting',()=>{
 for(const code of ['en','fr','sv','it','tr']){assert.equal(translateText('1.234,50 €',code),new Intl.NumberFormat(localeFor(code),{style:'currency',currency:'EUR'}).format(1234.5));assert.equal(translateText('BM-2026-0042 · OF-119 · PSP-DEMO-0042',code),'BM-2026-0042 · OF-119 · PSP-DEMO-0042');}
 assert.equal(translateText('25.10.2026','sv'),'2026-10-25');assert.equal(translateText('Anmelden','de'),'Anmelden');
});
test('user content is escaped and explicitly excluded from translation; phrase boundaries are respected',()=>{
 assert.equal(userText('Anmelden <script>'),'<span translate="no">Anmelden &lt;script&gt;</span>');
 assert.equal(translateText('Abmeldentest','en'),'Abmeldentest');assert.equal(translateText('Anmelden (Mitglied)','en'),'Sign in (Member)');
});
