import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../js/model.js';
import {planAccountDeletion,submitAccountDeletion,purgeDeletedAccountFiles} from '../js/accounts.js';
import {initializeAuth,currentAuth,AUTH_SESSION_KEY} from '../js/auth.js';
import {loadState,KEY} from '../js/store.js';
import {testAccessPage} from '../js/auth-ui.js';

const admin={role:'admin',id:'ADMIN-1'},member={role:'member',id:'U-2108'},provider={role:'provider',id:'A-101'};
function seed(){const s=createSeed();s.auth={version:1,commerceAccounts:1,accounts:[admin,member,provider,{role:'provider',id:'A-104'}]};return s;}
function harness(state){let saved=state;return {context:()=>({state:saved,actor:admin}),save:next=>{saved=structuredClone(next);},store:{remove:async()=>{}}};}

test('deleting a member removes login and linked local records without changing another account',async()=>{
 const s=seed(),deal=s.deals.find(d=>d.userId===member.id),other=s.members.find(u=>u.id!==member.id),unrelated=s.deals.find(d=>d.userId===other.id);
 s.carts[member.id]=[{offerId:'OF-119'}];s.legalRequests=[{actorRole:'member',actorId:member.id},{actorRole:'member',actorId:other.id}];
 const before=structuredClone(s),plan=planAccountDeletion(s,'member',member.id,admin),h=harness(s);
 assert.deepEqual(s,before);
 const result=await submitAccountDeletion({...h,type:'member',id:member.id,confirmation:member.id,fingerprint:plan.fingerprint});
 const next=result.state;
 assert.equal(next.members.some(u=>u.id===member.id),false);assert.equal(next.auth.accounts.some(a=>a.id===member.id),false);
 assert.equal(next.deals.some(d=>d.userId===member.id),false);assert.equal(next.tickets.some(t=>t.dealId===deal.id),false);
 assert.equal(next.reviews.some(r=>r.userId===member.id||r.dealId===deal.id),false);assert.equal(next.carts[member.id],undefined);
 assert.deepEqual(next.deals.find(d=>d.id===unrelated.id),unrelated);assert.deepEqual(next.members.find(u=>u.id===other.id),other);
 assert.deepEqual(next.legalRequests,[{actorRole:'member',actorId:other.id}]);assert.deepEqual(next.offers,before.offers);
 assert.equal(await initializeAuth(next),false);assert.equal(next.auth.accounts.some(a=>a.id===member.id),false);
 assert.doesNotMatch(testAccessPage(next),/Lena Berger|lena\.berger@example\.test/);
 const storage={getItem:()=>JSON.stringify({...member,expiresAt:Date.now()+60000})};
 const oldSession=globalThis.sessionStorage,oldLocal=globalThis.localStorage;
 try{globalThis.sessionStorage=storage;globalThis.localStorage={getItem:key=>key===KEY?JSON.stringify(next):null};assert.equal(currentAuth(next),null);assert.equal(loadState().members.some(u=>u.id===member.id),false);}finally{globalThis.sessionStorage=oldSession;globalThis.localStorage=oldLocal;}
});

test('provider deletion preserves other providers in mixed orders, carts and payouts',()=>{
 const s=seed(),removed=s.deals.find(d=>d.providerId===provider.id),kept=s.deals.find(d=>d.providerId==='A-104'),offer=s.offers.find(o=>o.providerId===provider.id),otherOffer=s.offers.find(o=>o.providerId==='A-104');
 removed.payment='processing';kept.payment='processing';
 const item=(d,o,total)=>({key:d.id,dealId:d.id,providerId:d.providerId,offerId:o.id,totalCents:total,cashbackCents:Math.round(d.cashback*100)});
 s.orders=[{id:'MIXED',userId:kept.userId,status:'paid',items:[item(removed,offer,1000),item(kept,otherOffer,2000)],totalCents:3000,cashbackCents:(removed.cashback+kept.cashback)*100}];
 s.payouts=[{id:'MIXED-PAYOUT',userId:kept.userId,dealIds:[removed.id,kept.id],amount:removed.cashback+kept.cashback,status:'processing'}];
 s.carts.guest=[{offerId:offer.id},{offerId:otherOffer.id}];
 const next=planAccountDeletion(s,'provider',provider.id,admin).state;
 assert.equal(next.providers.some(p=>p.id===provider.id),false);assert.equal(next.offers.some(o=>o.providerId===provider.id),false);assert.equal(next.deals.some(d=>d.providerId===provider.id),false);
 assert.deepEqual(next.orders[0].items,[s.orders[0].items[1]]);assert.equal(next.orders[0].totalCents,2000);assert.equal(next.orders[0].cashbackCents,kept.cashback*100);
 assert.deepEqual(next.payouts[0].dealIds,[kept.id]);assert.equal(next.payouts[0].amount,kept.cashback);assert.equal(next.payouts[0].status,'processing');
 assert.deepEqual(next.carts.guest,[{offerId:otherOffer.id}]);assert.deepEqual(next.members,s.members);
});

test('only an existing local admin may plan deletion, and admin accounts cannot be targets',()=>{
 const s=seed(),before=structuredClone(s);
 for(const actor of [null,member,provider,{role:'admin',id:'forged'}])assert.throws(()=>planAccountDeletion(s,'member',member.id,actor),/Administrator/);
 for(const [type,id] of [['admin',admin.id],['member','missing'],['unexpected',provider.id]])assert.throws(()=>planAccountDeletion(s,type,id,admin),/nicht gefunden/);
 assert.deepEqual(s,before);
});

test('wrong confirmation, stale previews and failed saves leave the original account intact',async()=>{
 const s=seed(),plan=planAccountDeletion(s,'member',member.id,admin),h=harness(s),args={...h,type:'member',id:member.id,confirmation:member.id,fingerprint:plan.fingerprint};
 await assert.rejects(()=>submitAccountDeletion({...args,confirmation:'wrong'}),/Kontonummer/);
 h.context().state.deals.push({...structuredClone(s.deals.find(d=>d.userId===member.id)),id:'NEW'});
 await assert.rejects(()=>submitAccountDeletion(args),/geändert/);assert.ok(h.context().state.members.some(u=>u.id===member.id));
 const fresh=planAccountDeletion(h.context().state,'member',member.id,admin);let removed=false;
 await assert.rejects(()=>submitAccountDeletion({...args,fingerprint:fresh.fingerprint,save:()=>{throw Error('Storage full');},store:{remove:async()=>{removed=true;}}}),/Storage full/);
 assert.equal(removed,false);assert.ok(h.context().state.auth.accounts.some(a=>a.id===member.id));
});

test('file cleanup preserves shared attachments and retries interrupted cleanup after reload',async()=>{
 const s=seed(),own=s.deals.find(d=>d.userId===member.id),other=s.deals.find(d=>d.userId!==member.id);
 own.attachments=[{id:'exclusive'}];own.snapshot.attachments=[{id:'shared'}];other.snapshot.attachments=[{id:'shared'}];
 const plan=planAccountDeletion(s,'member',member.id,admin);assert.deepEqual(plan.state.pendingAccountFileDeletes,['exclusive']);
 const h=harness(s),result=await submitAccountDeletion({...h,type:'member',id:member.id,confirmation:member.id,fingerprint:plan.fingerprint,store:{remove:async()=>{throw Error('IndexedDB unavailable');}}});
 assert.equal(result.cleanupPending,true);assert.equal(result.state.members.some(u=>u.id===member.id),false);assert.deepEqual(result.state.pendingAccountFileDeletes,['exclusive']);
 let removed;const cleaned=await purgeDeletedAccountFiles({...h,store:{remove:async ids=>{removed=ids;}}});
 assert.deepEqual(removed,['exclusive']);assert.deepEqual(cleaned.pendingAccountFileDeletes,[]);assert.deepEqual(cleaned.deals.find(d=>d.id===other.id).snapshot.attachments,[{id:'shared'}]);
});
