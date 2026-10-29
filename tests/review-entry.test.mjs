import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../js/model.js';
import {reviewEntry,reviewableDeals,submitReviewEntry} from '../js/review-entry.js';
import {visibleReviews} from '../js/deal-workflow.js';
const setup=()=>{const s=createSeed(),d=s.deals.find(d=>d.id==='BM-2026-0040');return {s,d};};
test('review entry offers only unreviewed completed deals belonging to the signed-in party',()=>{
 const {s,d}=setup();assert.deepEqual(reviewableDeals(s,'member',d.userId).map(d=>d.id),[d.id]);
 assert.deepEqual(reviewableDeals(s,'provider',d.providerId).map(d=>d.id),[d.id]);
 assert.equal(reviewableDeals(s,'member','U-2108').length,0);assert.equal(reviewableDeals(s,'provider','A-101').length,0);
 assert.equal(reviewableDeals(s,'provider',d.providerId,'BM-2026-0039').length,0);assert.equal(reviewableDeals(s,'admin',d.userId).length,0);
 submitReviewEntry(s,'member',d.userId,{dealId:d.id,rating:'4',text:'Gut nachvollziehbarer Ablauf.'});assert.equal(reviewableDeals(s,'member',d.userId).length,0);assert.equal(reviewableDeals(s,'provider',d.providerId).length,1);
});
test('actual review form values create one linked review per party and ignore forged role fields',()=>{
 const {s,d}=setup();const values={dealId:d.id,rating:'4',text:'Klare Kommunikation und gute Bearbeitung.',role:'provider',actorId:d.providerId};
 const review=submitReviewEntry(s,'member',d.userId,values);assert.equal(review.authorRole,'member');assert.equal(review.authorId,d.userId);assert.equal(review.targetId,d.providerId);assert.equal(review.rating,4);
 const before=JSON.stringify(s);assert.throws(()=>submitReviewEntry(s,'member',d.userId,values));assert.equal(JSON.stringify(s),before);
 submitReviewEntry(s,'provider',d.providerId,{dealId:d.id,rating:'5',text:'Alle Nachweise vollständig erhalten.'});
 const saved=JSON.parse(JSON.stringify(s));assert.equal(visibleReviews(saved,'member',d.userId).filter(r=>r.dealId===d.id).length,2);assert.equal(visibleReviews(saved,'provider',d.providerId).filter(r=>r.dealId===d.id).length,2);
});
test('entry requires a deliberate rating, valid deal and comment before changing any state',()=>{
 const {s,d}=setup(),before=JSON.stringify(s);
 for(const values of [{dealId:'',rating:'5',text:'Ein Kommentar.'},{dealId:d.id,rating:'',text:'Ein Kommentar.'},{dealId:d.id,rating:'6',text:'Ein Kommentar.'},{dealId:d.id,rating:'4',text:'Kurz'}])assert.throws(()=>submitReviewEntry(s,'member',d.userId,values));
 assert.equal(JSON.stringify(s),before);
 const html=reviewEntry(s,'member',d.userId);assert.match(html,/data-form="review-entry"/);assert.equal((html.match(/type="radio"/g)||[]).length,5);assert.doesNotMatch(html,/ checked/);assert.match(html,/name="text" required minlength="5" maxlength="1500"/);
});
test('empty and submitted views explain eligibility and drafts cannot attach to a different deal',()=>{
 const {s,d}=setup(),empty=reviewEntry(s,'member','U-2108');assert.match(empty,/Noch kein abgeschlossener Deal/);assert.match(empty,/type="submit"[^>]*disabled/);assert.match(empty,/href="#deals"/);
 d.offer='<Testangebot>';const draft={dealId:d.id,rating:'3',text:'Entwurf <sicher> & unverändert.'};
 const html=reviewEntry(s,'member',d.userId,{dealId:d.id,draft});assert.match(html,/&lt;Testangebot&gt;/);assert.match(html,/Entwurf &lt;sicher&gt; &amp; unverändert/);assert.match(html,/value="3"[^>]*checked/);
 const other=reviewEntry(s,'member',d.userId,{dealId:d.id,draft:{...draft,dealId:'another-deal'}});assert.doesNotMatch(other,/Entwurf/);assert.doesNotMatch(other,/ checked/);
 const saved=submitReviewEntry(s,'member',d.userId,{dealId:d.id,rating:'4',text:'Nachvollziehbar bearbeitet.'});const done=reviewEntry(s,'member',d.userId,{saved});assert.match(done,/role="status"/);assert.match(done,/bereits bewertet/);assert.match(done,/type="submit"[^>]*disabled/);
 assert.equal(reviewEntry(s,'admin','admin'),'');
});
