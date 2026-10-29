import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../js/model.js';
import {initializeAuth} from '../js/auth.js';
import {submitDealReview} from '../js/deal-workflow.js';
import {adminReviewContext,adminReviewRows,adminReviewStats,saveAdminReviewCase,reviewCaseFor} from '../js/admin-reviews.js';
import {adminReviewsPage,adminReviewDetail,adminAccountReviewList} from '../js/admin-reviews-ui.js';
import {dealReviewsPanel} from '../js/deal-workflow-ui.js';
import {accountContext} from '../js/accounts.js';
import {loadState,saveState} from '../js/store.js';
async function setup(){const s=createSeed();await initializeAuth(s);const d=s.deals.find(d=>d.id==='BM-2026-0039'),admin={id:'ADMIN-1',role:'admin',name:'Test Administration'};submitDealReview(s,d.id,'provider',d.providerId,2,'Es gab Rückfragen zur Buchungsreferenz.');return {s,d,admin};}
test('admin context joins both review directions, parties and only the same deal communication',async()=>{
 const {s,d}=await setup();d.messages.push({from:'provider',at:d.created,text:'Zum gemeinsamen Deal.'});s.deals[0].messages.push({from:'user',at:d.created,text:'Fremde Unterhaltung.'});
 const c=adminReviewContext(s,d.id);assert.equal(c.member.id,d.userId);assert.equal(c.provider.id,d.providerId);assert.equal(c.memberReview.rating,5);assert.equal(c.providerReview.rating,2);
 assert.equal(c.messages.length,1);assert.equal(c.messages[0].text,'Zum gemeinsamen Deal.');assert.deepEqual(c.tickets.map(t=>t.id),['AN-105']);assert.ok(c.events.every(e=>d.events.some(original=>original.id===e.id)));assert.equal(adminReviewContext(s,'missing'),null);assert.equal(c.reviewCase,null);
});
test('search and filters find review pairs without hiding the opposite perspective or inventing disputes',async()=>{
 const {s,d,admin}=await setup();for(const filters of [{q:d.id},{q:d.user},{q:d.provider},{q:'Buchungsreferenz'},{direction:'member',rating:'low'},{direction:'provider',rating:'5'},{caseStatus:'none'}]){const rows=adminReviewRows(s,filters);assert.equal(rows.length,1);assert.equal(rows[0].reviews.length,2);}
 assert.equal(adminReviewRows(s,{q:'Nicht vorhanden'}).length,0);assert.equal(adminReviewRows(s,{caseStatus:'open'}).length,0);assert.deepEqual(adminReviewStats(s),{total:2,members:1,providers:1,openCases:0});
 saveAdminReviewCase(s,d.id,admin,{status:'review',note:'Wir prüfen die widersprüchlichen Angaben.'});assert.equal(adminReviewRows(s,{caseStatus:'review',q:'widersprüchlichen'}).length,1);assert.equal(adminReviewStats(s).openCases,1);
});
test('case changes append an internal audit trail while preserving reviews, accepted terms, payments and messages',async()=>{
 const {s,d,admin}=await setup(),reviews=structuredClone(s.reviews),before=structuredClone(d);
 for(const [status,note] of [['open','Sachverhalt aufgenommen.'],['review','Beide Darstellungen geprüft.'],['resolved','Referenz geklärt und Prüfung abgeschlossen.'],['open','Neue Angabe erfordert erneute Prüfung.']])saveAdminReviewCase(s,d.id,admin,{status,note});
 const c=reviewCaseFor(s,d.id);assert.equal(c.status,'open');assert.equal(c.notes.length,4);assert.deepEqual(c.notes.map(n=>n.previousStatus),[null,'open','review','resolved']);assert.ok(c.notes.every(n=>n.actorId===admin.id&&n.at));assert.deepEqual(s.reviews,reviews);assert.deepEqual(d,before);
 const publicView=dealReviewsPanel(s,d,'member',d.userId);assert.doesNotMatch(publicView,/Neue Angabe erfordert/);assert.doesNotMatch(publicView,/Referenz geklärt/);
 const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};saveState(s);assert.equal(reviewCaseFor(loadState(),d.id).notes.length,4);
});
test('only registered administrators can save cases and invalid writes are atomic',async()=>{
 const {s,d,admin}=await setup(),before=JSON.stringify(s),valid={status:'open',note:'Eine nachvollziehbare Prüfnotiz.'};
 for(const actor of [null,{id:d.userId,role:'member'},{id:d.providerId,role:'provider'},{id:'wrong',role:'admin'},{id:d.userId,role:'admin'}])assert.throws(()=>saveAdminReviewCase(s,d.id,actor,valid));
 assert.throws(()=>saveAdminReviewCase(s,'missing',admin,valid));for(const values of [{status:'deleted',note:valid.note},{status:'open',note:'Kurz'},{status:'open',note:'x'.repeat(3001)}])assert.throws(()=>saveAdminReviewCase(s,d.id,admin,values));assert.equal(JSON.stringify(s),before);
});
test('case-only deals and missing counterpart reviews remain inspectable without fabricated ratings',async()=>{
 const {s,admin}=await setup(),d=s.deals[0];saveAdminReviewCase(s,d.id,admin,{status:'open',note:'Nachfrage zum Abschluss wird geprüft.'});const rows=adminReviewRows(s,{q:d.id});assert.equal(rows.length,1);assert.equal(rows[0].reviews.length,0);
 const html=adminReviewDetail(s,d.id);assert.equal((html.match(/Von dieser Seite liegt noch keine Bewertung vor\./g)||[]).length,2);assert.doesNotMatch(html,/class="stars"/);assert.match(adminReviewsPage(s),/Bewertungen &amp; Streitfall|Bewertungen & Streitfall/);
});
test('admin dossier and account shortcuts display safe originals, internal evidence and a linked case form',async()=>{
 const {s,d,admin}=await setup();s.reviews[0].text='Bewertung <script> unverändert.';saveAdminReviewCase(s,d.id,admin,{status:'review',note:'Interne <Notiz> nicht öffentlich.'});const c=adminReviewContext(s,d.id);c.tickets[0].messages.push({from:'internal',at:d.created,text:'Vertrauliche Einschätzung im Adminbereich.'});
 const html=adminReviewDetail(s,d.id);assert.match(html,/Bewertung &lt;script&gt; unverändert/);assert.match(html,/Interne &lt;Notiz&gt; nicht öffentlich/);assert.match(html,/Vertrauliche Einschätzung/);assert.match(html,/data-admin-review-case data-deal-id="BM-2026-0039"/);assert.match(html,/data-account-type="member"/);assert.match(html,/data-account-type="provider"/);assert.match(html,/data-detail-tab="history"/);
 assert.match(adminAccountReviewList(s,accountContext(s,'provider',d.providerId)),/data-account-review="BM-2026-0039"/);
 assert.doesNotMatch(dealReviewsPanel(s,d,'provider',d.providerId),/Vertrauliche Einschätzung/);
});
