import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed,changeDeal,releasePayment} from '../js/model.js';
import * as P from '../js/platform-model.js';
import {providerWorkflowPanel,dealReviewsPanel,reviewCard} from '../js/deal-workflow-ui.js';
import {allowedRoute} from '../js/auth.js';
const setup=()=>{const s=createSeed(),d=P.acceptOffer(s,'OF-119','U-2108');return {s,d,pid:d.providerId,uid:d.userId};};
const confirmation={reference:'TEST-VERTRAG-100',note:'Referenz und vereinbarte Prämienbedingungen vollständig geprüft.',conditionsChecked:true};
const confirm=({s,d,pid,uid})=>{P.acceptProviderDeal(s,d.id,pid);P.attachProof(s,d.id,uid,'DEMO-NACHWEIS-100');P.confirmProviderDeal(s,d.id,pid,confirmation);};
test('provider accepts and edits only own pending deals without changing accepted terms or finances',()=>{
 const {s,d,pid}=setup(),snapshot=structuredClone(d.snapshot),reserved=d.reserved;
 assert.equal(P.providerStage(d).key,'new');const before=JSON.stringify(d);
 assert.throws(()=>P.acceptProviderDeal(s,d.id,'A-102'));assert.equal(JSON.stringify(d),before);
 P.acceptProviderDeal(s,d.id,pid,'Wir prüfen die Annahme.');assert.equal(P.providerStage(d).key,'proof');
 assert.throws(()=>P.acceptProviderDeal(s,d.id,pid));
 P.saveProviderWork(s,d.id,pid,{reference:'VERTRAG-01',note:'Kundenangaben zugeordnet.'});
 P.saveProviderWork(s,d.id,pid,{reference:'VERTRAG-02',note:'Referenz korrigiert.'});
 assert.equal(d.providerReview.reference,'VERTRAG-02');assert.deepEqual(d.snapshot,snapshot);
 assert.equal(d.reserved,reserved);assert.equal(d.payment,'pending');assert.equal(d.status,'requested');
 const valid=JSON.stringify(d);assert.throws(()=>P.saveProviderWork(s,d.id,pid,{reference:'X',note:'a'.repeat(1600)}));assert.equal(JSON.stringify(d),valid);
 assert.equal(d.events.filter(e=>e.title==='Bearbeitung aktualisiert').length,2);
});
test('correction request is shared and blocks confirmation until the member resubmits proof',()=>{
 const {s,d,pid,uid}=setup();P.acceptProviderDeal(s,d.id,pid);P.attachProof(s,d.id,uid,'DEMO-ALT-123');
 P.requestProviderCorrection(s,d.id,pid,'Bitte die aktivierte Vertragsnummer ergänzen.');
 assert.equal(P.providerStage(d).key,'correction');assert.equal(d.messages.at(-1).from,'provider');
 assert.throws(()=>P.confirmProviderDeal(s,d.id,pid,confirmation),/Nachbesserung/);
 assert.throws(()=>P.attachProof(s,d.id,'wrong','DEMO-NEU-123'));
 assert.throws(()=>P.attachProof(s,d.id,uid,'x'.repeat(501)));assert.equal(d.providerReview.correction.status,'open');
 P.attachProof(s,d.id,uid,'DEMO-NEU-123');assert.equal(d.providerReview.correction.status,'resolved');
 assert.equal(P.providerStage(d).key,'ready');P.confirmProviderDeal(s,d.id,pid,confirmation);
 assert.equal(d.status,'confirmed');assert.equal(d.proof.reference,'DEMO-NEU-123');assert.equal(d.payment,'pending');
 assert.ok(d.events.some(e=>e.title==='Nachbesserung eingereicht'));
 assert.throws(()=>P.saveProviderWork(s,d.id,pid,{reference:'VERTRAG-03',note:'Zu spät.'}));
});
test('provider release requires acceptance, proof, covered budget and explicit checked conditions',()=>{
 const {s,d,pid,uid}=setup();P.attachProof(s,d.id,uid,'DEMO-PROOF-100');
 assert.throws(()=>P.confirmProviderDeal(s,d.id,pid,confirmation),/Angebotsannahme/);P.acceptProviderDeal(s,d.id,pid);
 assert.throws(()=>P.confirmProviderDeal(s,d.id,pid,{...confirmation,conditionsChecked:false}));
 assert.throws(()=>P.confirmProviderDeal(s,d.id,pid,{...confirmation,note:'a'}));
 d.funded=false;assert.throws(()=>P.confirmProviderDeal(s,d.id,pid,confirmation),/Prämienbudget/);d.funded=true;
 s.providers.find(p=>p.id===pid).status='blocked';assert.throws(()=>P.confirmProviderDeal(s,d.id,pid,confirmation));s.providers.find(p=>p.id===pid).status='active';
 const snapshot=structuredClone(d.snapshot);P.confirmProviderDeal(s,d.id,pid,confirmation);
 assert.deepEqual(d.snapshot,snapshot);assert.ok(Date.parse(d.due)>Date.now()+13*864e5);
 assert.throws(()=>P.confirmProviderDeal(s,d.id,pid,confirmation));assert.throws(()=>releasePayment(s,d.id));
 assert.equal(P.walletSummary(s,uid).available,0);changeDeal(s,d.id,'completed','Fristprüfung in der Demo dokumentiert.');releasePayment(s,d.id);
 assert.equal(P.walletSummary(s,uid).available,d.cashback);
});
test('reasoned rejection stops cashback and frees exactly the reserved offer budget',()=>{
 const {s,d,pid}=setup(),o=s.offers.find(o=>o.id===d.offerId),before=P.offerAvailable(s,o),reserved=d.reserved;
 assert.throws(()=>P.rejectProviderDeal(s,d.id,pid,'kurz'));assert.equal(d.status,'requested');
 P.rejectProviderDeal(s,d.id,pid,'Die Neukundenbedingung ist nicht erfüllt.');
 assert.equal(d.status,'cancelled');assert.equal(d.payment,'stopped');assert.equal(d.providerReview.decision,'declined');
 assert.equal(P.offerAvailable(s,o),Math.round((before+reserved)*100)/100);assert.equal(d.messages.at(-1).text,d.providerReview.declineReason);
 assert.throws(()=>P.rejectProviderDeal(s,d.id,pid,'Nochmal ablehnen.'));assert.throws(()=>P.submitDealReview(s,d.id,'provider',pid,5,'Nicht bewertbar.'));
});
test('both parties can review a completed deal independently and see the same pair of reviews',()=>{
 const context=setup(),{s,d,pid,uid}=context;confirm(context);
 assert.throws(()=>P.submitDealReview(s,d.id,'member',uid,5,'Noch nicht abgeschlossen.'));
 changeDeal(s,d.id,'completed','Fristprüfung und Abschluss dokumentiert.');
 P.submitDealReview(s,d.id,'member',uid,4,'Guter Ablauf mit dem Anbieter.');P.submitDealReview(s,d.id,'provider',pid,5,'Das Mitglied hat alle Nachweise ergänzt.');
 assert.equal(P.reviewsForDeal(s,d.id).length,2);assert.equal(P.canReview(s,d,'member',uid),false);assert.equal(P.canReview(s,d,'provider',pid),false);
 assert.throws(()=>P.submitDealReview(s,d.id,'provider',pid,4,'Doppelte Bewertung.'));
 const filter=rows=>rows.filter(r=>r.dealId===d.id).map(r=>r.id).sort();assert.deepEqual(filter(P.visibleReviews(s,'member',uid)),filter(P.visibleReviews(s,'provider',pid)));
 assert.equal(filter(P.visibleReviews(s,'provider','A-102')).length,0);assert.equal(filter(P.visibleReviews(s,'member','U-2107')).length,0);
 assert.equal(P.reviewsAbout(s,'provider',pid).length,1);assert.equal(P.reviewsAbout(s,'member',uid).length,1);
 const saved=JSON.parse(JSON.stringify(s));assert.equal(P.reviewsForDeal(saved,d.id).length,2);assert.equal(saved.deals[0].providerReview.reference,confirmation.reference);
});
test('legacy reviews remain member-to-provider and do not block the provider counterpart',()=>{
 const s=createSeed(),d=s.deals.find(d=>d.id==='BM-2026-0039'),legacy=structuredClone(s.reviews[0]);
 assert.equal(P.reviewAuthorRole(legacy),'member');assert.equal(P.reviewTargetRole(legacy),'provider');
 assert.equal(P.canReview(s,d,'member',d.userId),false);assert.equal(P.canReview(s,d,'provider',d.providerId),true);
 P.submitDealReview(s,d.id,'provider',d.providerId,4,'Gute Kommunikation und vollständige Angaben.');
 assert.deepEqual(s.reviews.find(r=>r.id===legacy.id),legacy);assert.equal(P.reviewsAbout(s,'provider',d.providerId).length,1);
 assert.equal(P.providerStage(s.deals.find(d=>d.status==='confirmed')).key,'confirmed');
});
test('review validation rejects wrong roles, wrong participants, duplicate ratings and malformed scores atomically',()=>{
 const s=createSeed(),d=s.deals.find(d=>d.id==='BM-2026-0039'),before=JSON.stringify(s);
 for(const args of [['admin',d.providerId,5,'Ein Text'],['provider','A-101',5,'Ein Text'],['provider',d.providerId,3.5,'Ein Text'],['provider',d.providerId,0,'Ein Text'],['provider',d.providerId,6,'Ein Text'],['provider',d.providerId,5,'Kurz'],['provider',d.providerId,5,'a'.repeat(1501)]])assert.throws(()=>P.submitDealReview(s,d.id,...args));
 assert.equal(JSON.stringify(s),before);assert.equal(allowedRoute('reviews','member'),true);assert.equal(allowedRoute('reviews','provider'),true);assert.equal(allowedRoute('reviews',null),false);
});
test('participant UI exposes provider processing and both review directions without translating user content',()=>{
 const context=setup(),{s,d,pid,uid}=context;P.acceptProviderDeal(s,d.id,pid);P.requestProviderCorrection(s,d.id,pid,'Bitte <Nachweis> ergänzen.');
 const member=providerWorkflowPanel(s,d,'member'),provider=providerWorkflowPanel(s,d,'provider');assert.match(member,/Bitte &lt;Nachweis&gt; ergänzen/);assert.match(member,/data-action="proof"/);assert.doesNotMatch(member,/data-action="provider-confirm"/);assert.match(provider,/data-action="provider-confirm"[^>]*disabled/);
 P.attachProof(s,d.id,uid,'DEMO-PROOF-100');P.confirmProviderDeal(s,d.id,pid,confirmation);changeDeal(s,d.id,'completed','Geprüft und abgeschlossen.');
 const r=P.submitDealReview(s,d.id,'provider',pid,4,'Gut <script> Beispiel.');const card=reviewCard(s,r);assert.match(card,/Anbieter → Mitglied/);assert.match(card,/translate="no"/);assert.match(card,/&lt;script&gt;/);
 assert.match(dealReviewsPanel(s,d,'member',uid),/Bewerte den Anbieter/);assert.match(dealReviewsPanel(s,d,'provider',pid),/Deine Bewertung ist gespeichert/);
});
