import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../js/model.js';
import {initializeAuth,registerAccount,allowedRoute} from '../js/auth.js';
import {LEGAL_VERSION,TEST_TERMS_VERSION,LEGAL_DOCS} from '../js/legal-content.js';
import {submitLegalRequest,legalReceiptText,legalRequestsFor,launchReadiness,publicReviewSummary,participantDataExport} from '../js/legal-model.js';
import {legalPage,legalAdminPage,publicRatingPanel} from '../js/legal-ui.js';

test('legal information and rights forms are accessible without signing in and launch stays blocked',()=>{
 for(const r of ['legal',...Object.keys(LEGAL_DOCS),'withdraw-request','cancel-request','content-request','legal-receipt:demo'])assert.equal(allowedRoute(r,null),true);
 assert.equal(allowedRoute('wallet',null),false);
 const ready=launchReadiness();assert.equal(ready.canGoLive,false);assert.equal(ready.liveCommerceEnabled,false);
 assert.ok(ready.blockers.some(x=>x.id==='insurance'));assert.ok(ready.blockers.some(x=>x.id==='payments'));assert.ok(ready.blockers.some(x=>x.id==='warranty'));
});
test('withdrawal records only a local simulation without changing contracts, money or messages',()=>{
 const s=createSeed(),before=JSON.stringify(s),request={kind:'withdrawal',name:'Alex Demo',email:'alex@example.test',reference:'BEST-DEMO-123 · nur Tablet',detail:'Unnecessary reason is not retained',token:'test-unique-token'};
 const r=submitLegalRequest(s,request,{role:'member',id:s.members[0].id});
 const {legalRequests,...rest}=s;assert.equal(JSON.stringify(rest),before);assert.equal(legalRequests.length,1);assert.equal(r.detail,'');assert.equal(r.delivery,'not-sent');assert.equal(r.simulation,true);
 const same=submitLegalRequest(s,request,{role:'member',id:s.members[0].id});assert.equal(same.id,r.id);assert.equal(s.legalRequests.length,1);
 const receipt=legalReceiptText(r);assert.match(receipt,/KEINE ECHTE ZUSTELLUNG/);assert.ok(receipt.includes(r.created));assert.ok(receipt.includes(request.reference));assert.ok(receipt.includes(request.email));
});
test('invalid or incomplete requests do not mutate state; ordinary termination needs no reason',()=>{
 const s=createSeed(),before=JSON.stringify(s);
 for(const form of [{kind:'unknown'},{kind:'withdrawal',name:'Alex Demo',email:'bad',reference:'123'},{kind:'content',reference:'OF-100',detail:'Das Angebot ist nach meiner Auffassung rechtswidrig.'}])assert.throws(()=>submitLegalRequest(s,form));
 assert.equal(JSON.stringify(s),before);
 const r=submitLegalRequest(s,{kind:'cancellation',name:'Alex Demo',email:'alex@example.test',reference:'VERTRAG-123',cancellationType:'ordinary'});
 assert.equal(r.detail,'');assert.equal(r.requestedDate,'zum nächstmöglichen Zeitpunkt');
});
test('local requests are isolated by role and account while administrators can review them',()=>{
 const s=createSeed(),actor={role:'member',id:s.members[0].id};submitLegalRequest(s,{kind:'withdrawal',name:'Alex Demo',email:'alex@example.test',reference:'BEST-123'},actor);
 assert.equal(legalRequestsFor(s,actor).length,1);assert.equal(legalRequestsFor(s,{role:'member',id:'other'}).length,0);assert.equal(legalRequestsFor(s,{role:'provider',id:actor.id}).length,0);assert.equal(legalRequestsFor(s,null).length,0);assert.equal(legalRequestsFor(s,{role:'admin',id:'ADMIN-1'}).length,1);
 const html=legalAdminPage(s,{role:'admin',id:'ADMIN-1'});assert.match(html,/nicht zugestellt/);assert.match(html,/BEST-123/);
 const receiptRoute='legal-receipt:'+s.legalRequests[0].id;assert.ok(legalPage(receiptRoute,s,actor).includes('BEST-123'));assert.ok(!legalPage(receiptRoute,s,{role:'member',id:'other'}).includes('BEST-123'));assert.ok(!legalPage(receiptRoute,s,null).includes('BEST-123'));
});
test('new registration records the test terms version without inventing a live or marketing consent',async()=>{
 const s=createSeed();await initializeAuth(s);const original=s.auth.accounts[0];assert.equal(original.legal,undefined);
 const u=await registerAccount(s,{role:'member',name:'Robin Beispiel',email:'robin-legal@example.test',city:'Stuttgart',password:'DemoPassword!2026',passwordConfirm:'DemoPassword!2026',testConsent:'on'});
 const record=s.auth.accounts.find(a=>a.id===u.id);assert.equal(record.legal.scope,'local-test-only');assert.equal(record.legal.testTermsVersion,TEST_TERMS_VERSION);assert.equal(record.legal.liveDraftVersion,LEGAL_VERSION);assert.equal(record.legal.privacyConsent,false);assert.ok(record.legal.recordedAt);
});
test('public provider ratings expose an aggregate without private review text or member names',()=>{
 const s=createSeed(),pid=s.providers[0].id;s.reviews=[{providerId:pid,authorRole:'member',rating:5,name:'Secret Member',text:'Private comment'},{providerId:pid,authorRole:'member',rating:3,name:'Other Member',text:'Other private comment'},{providerId:pid,authorRole:'provider',rating:1,name:'Provider',text:'Rating about a member'}];
 assert.deepEqual(publicReviewSummary(s,pid),{count:2,average:4});const html=publicRatingPanel(s,pid);assert.match(html,/4,0 \/ 5/);assert.ok(!html.includes('Secret Member'));assert.ok(!html.includes('Private comment'));assert.equal(s.reviews.length,3);
});
test('rights form collects no withdrawal reason and legal pages preserve drafts and escape request content',()=>{
 const s=createSeed();const form=legalPage('withdraw-request',s,null);assert.ok(!form.includes('name="detail"'));assert.ok(!form.includes('name="address"'));assert.match(form,/Nur|NUR/);assert.match(form,/Angaben prüfen/);
 const member=legalPage('terms-member',s,null);assert.match(member,/Arbeitsentwurf/);assert.match(member,/nicht von der Mitgliedsprämie abgezogen/);assert.match(member,/Schweigen/);
 submitLegalRequest(s,{kind:'content',reference:'<script>bad</script>',detail:'<img src=x onerror=alert(1)>',goodFaith:'on'});const html=legalAdminPage(s,{role:'admin',id:'ADMIN-1'});assert.ok(!html.includes('<script>bad'));assert.ok(html.includes('&lt;script&gt;bad'));
});
test('participant data export excludes unrelated accounts, credentials and internal case notes',()=>{
 const s=createSeed(),actor={role:'member',id:s.members[0].id};s.auth={accounts:[{password:{hash:'SECRET-HASH'}}]};s.reviewCases=[{internalNote:'ADMIN-SECRET'}];
 const ownDeal=s.deals.find(d=>d.userId===actor.id);s.tickets.push({id:'OWN-REQUEST',dealId:ownDeal.id,role:'user',messages:[{from:'user',text:'Meine Frage'},{from:'internal',text:'HIDDEN-INTERNAL'},{from:'admin',text:'Antwort für das Mitglied'}]});
 const result=participantDataExport(s,actor),serialized=JSON.stringify(result);assert.equal(result.profile.id,actor.id);assert.ok(result.deals.every(d=>d.userId===actor.id));assert.ok(result.tickets.some(t=>t.id==='OWN-REQUEST'));assert.ok(serialized.includes('Antwort für das Mitglied'));assert.ok(!serialized.includes('HIDDEN-INTERNAL'));assert.ok(!serialized.includes('SECRET-HASH'));assert.ok(!serialized.includes('ADMIN-SECRET'));assert.ok(!Object.hasOwn(result,'auth'));assert.ok(!Object.hasOwn(result,'members'));assert.throws(()=>participantDataExport(s,null));
});
