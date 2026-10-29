import test from 'node:test';
import assert from 'node:assert/strict';
import {CATEGORY_TREE,categoryName,subcategoriesFor,validateClassification,upgradeTaxonomy} from '../js/categories.js';
import {createSeed,selectDeals} from '../js/model.js';
import * as P from '../js/platform-model.js';
const form={title:'Angebot mit Unterkategorie',category:'Telekommunikation & Internet',subcategory:'DSL & Glasfaser',cashback:100,budget:1000,price:'29,99 € / Monat',description:'Ein neues Angebot mit klarer Zuordnung für den Test.',conditions:'Bestätigter Vertrag nach erfüllten Bedingungen.',region:'Deutschland',validUntil:'2027-12-31',payoutDays:14};
test('the supplied ten groups contain all 108 children and legacy category names resolve consistently',()=>{
 assert.deepEqual(CATEGORY_TREE.slice(0,10).map(g=>g.subcategories.length),[9,9,11,10,12,11,12,10,11,13]);
 assert.equal(CATEGORY_TREE.slice(0,10).flatMap(g=>g.subcategories).length,108);
 assert.equal(new Set(CATEGORY_TREE.map(g=>g.name)).size,19);
 assert.equal(categoryName('Versicherungen'),'Banken & Versicherungen');assert.equal(categoryName('Banken & Finanzen'),'Banken & Versicherungen');
 assert.ok(subcategoriesFor('Immobilien').includes('Umzug & Transport'));
 assert.ok(subcategoriesFor('Job & Karriere').includes('Gesundheit & Pflegeberufe'));
 assert.deepEqual(subcategoriesFor('Haustiere'),[]);
});
test('market search and dependent filters find the correct legacy and newly classified offers',()=>{
 const s=createSeed();
 const telecom=P.availableOffers(s,{category:'Telekommunikation & Internet',subcategory:'DSL & Glasfaser'});
 assert.equal(telecom.length,1);assert.equal(telecom[0].title,'Glasfaser Zuhause');
 assert.equal(P.availableOffers(s,{category:'Energie & Strom',subcategory:'DSL & Glasfaser'}).length,0);
 assert.equal(P.availableOffers(s,{q:'Hausrat & Wohngebäude'})[0].title,'Hausrat Komfort');
 const finance=P.availableOffers(s,{category:'Banken & Versicherungen'});assert.ok(finance.some(o=>o.title==='Kfz-Komfortschutz'));assert.ok(finance.some(o=>o.title==='Hausrat Komfort'));
});
test('offer creation rejects missing or mismatched children without changing money or offers',()=>{
 const s=createSeed(),before=JSON.stringify(s);
 assert.throws(()=>P.createOffer(s,'A-101',{...form,subcategory:''}),/Unterkategorie/);
 assert.throws(()=>P.createOffer(s,'A-101',{...form,subcategory:'Ökostrom'}),/gehört nicht/);
 assert.throws(()=>P.createOffer(s,'A-101',{...form,category:'Frei erfunden'}),/Hauptkategorie/);
 assert.equal(JSON.stringify(s),before);
 const o=P.createOffer(s,'A-101',form);assert.equal(o.category,form.category);assert.equal(o.subcategory,'DSL & Glasfaser');
 const edited=P.createOffer(s,'A-101',{...form,category:'Haustiere',subcategory:undefined},o.id);assert.equal(edited.subcategory,'');
 assert.throws(()=>validateClassification('Haustiere','DSL & Glasfaser'));
});
test('accepted deal classification remains fixed after provider changes the offer',()=>{
 const s=createSeed(),o=P.createOffer(s,'A-101',form);P.moderateOffer(s,o.id,true,'');
 const d=P.acceptOffer(s,o.id,s.members[0].id),snapshot=structuredClone(d.snapshot);
 P.createOffer(s,'A-101',{...form,category:'Energie & Strom',subcategory:'Ökostrom'},o.id);
 assert.equal(d.category,'Telekommunikation & Internet');assert.equal(d.subcategory,'DSL & Glasfaser');assert.deepEqual(d.snapshot,snapshot);
 assert.equal(selectDeals(s,{category:'Telekommunikation & Internet',subcategory:'DSL & Glasfaser'}).some(x=>x.id===d.id),true);
});
test('existing local records are enriched without rewriting accepted snapshots or assigning custom offers',()=>{
 const s=createSeed();for(const o of s.offers)delete o.subcategory;for(const d of s.deals){delete d.subcategory;delete d.snapshot.category;delete d.snapshot.subcategory;}
 s.offers.push({...s.offers[0],id:'OF-900',title:'Eigener älterer Tarif'});s.auth={version:1,accounts:[]};
 const snapshots=JSON.stringify(s.deals.map(d=>d.snapshot)),deals=JSON.stringify(s.deals),auth=JSON.stringify(s.auth),before=s.offers.length;
 upgradeTaxonomy(s);assert.equal(s.offers.find(o=>o.id==='OF-119').subcategory,'Mobilfunkverträge');assert.equal(s.offers.find(o=>o.id==='OF-900').subcategory,undefined);
 assert.equal(JSON.stringify(s.deals.map(d=>d.snapshot)),snapshots);assert.equal(JSON.stringify(s.deals.map(({subcategory,...rest})=>rest)),deals);assert.equal(JSON.stringify(s.auth),auth);assert.equal(s.offers.length,before);
 assert.ok(selectDeals(s,{category:'Telekommunikation & Internet',subcategory:'DSL & Glasfaser'}).length>0);
});
