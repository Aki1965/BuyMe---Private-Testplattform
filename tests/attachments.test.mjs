import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeed} from '../js/model.js';
import * as P from '../js/platform-model.js';
import {addToCart} from '../js/commerce.js';
import {MAX_FILE_BYTES,prepareFiles,attachmentList,visibleAttachments,findAttachment,addDealAttachments} from '../js/attachments.js';
import {planAttachmentAction,submitAttachmentAction} from '../js/attachments-controller.js';
import {uploadPicker,attachmentPanel,dealAttachmentsPanel} from '../js/attachments-ui.js';
const member={role:'member',id:'U-2108'},provider={role:'provider',id:'A-101'},admin={role:'admin',id:'ADMIN-1'};
function seed(){const s=createSeed();s.auth={accounts:[admin]};return s;}
const form={title:'Upload Tarif mit Geldprämie',category:'Telekommunikation',subcategory:'Mobilfunkverträge',cashback:100,budget:2000,price:'29,99 € / Monat',description:'Ein ausführliches fiktives Testangebot mit eigenen Dateien.',conditions:'Bestätigter Vertrag und erfüllte Bedingungen.',region:'Deutschland',validUntil:'2027-12-31',payoutDays:14};
function file(name='vertrag.pdf',content='%PDF-1.7\nBuyMe fake document',type='application/pdf'){return new File([content],name,{type});}
async function meta(actor=provider,name='angebot.pdf'){const [record]=await prepareFiles([file(name)],actor);const {blob,...metadata}=record;return metadata;}
function memory(){const files=new Map();return {files,put:async records=>records.forEach(r=>files.set(r.id,r)),remove:async ids=>ids.forEach(id=>files.delete(id)),get:async id=>files.get(id)};}

test('file preparation validates size, MIME and signatures and retains actual document bytes',async()=>{
  const [record]=await prepareFiles([file()],member);assert.equal(await record.blob.text(),'%PDF-1.7\nBuyMe fake document');assert.equal(record.uploaderId,member.id);assert.equal(record.blob.type,'application/pdf');
  for(const bad of [file('script.html','<script>bad</script>','text/html'),file('fake.png','<svg onload="bad">','image/png'),file('fake.pdf','not a PDF'),file('zero.txt','','text/plain'),file('traversal/hello.pdf'),file('wrong.pdf','%PDF-1.0','text/html'),file('binary.txt','\0x','text/plain'),file('large.pdf',new Uint8Array(MAX_FILE_BYTES+1))])await assert.rejects(()=>prepareFiles([bad],member));
  assert.throws(()=>attachmentList([],Array(11).fill({...record})));await assert.rejects(()=>prepareFiles(Array(11).fill(file()),member));
});
test('provider files await moderation, and accepted file references remain immutable after offer edits/removal',async()=>{
  const s=seed(),a=await meta(),created=planAttachmentAction(s,provider,{kind:'offer',data:form,added:[a]});const o=created.state.offers[0];
  assert.equal(s.offers.some(x=>x.title===form.title),false);assert.equal(o.status,'pending');assert.equal(visibleAttachments(created.state,'offer',o.id,member).length,0);assert.equal(visibleAttachments(created.state,'offer',o.id,provider).length,1);assert.equal(visibleAttachments(created.state,'offer',o.id,admin).length,1);
  P.moderateOffer(created.state,o.id,true,'');const accepted=planAttachmentAction(created.state,member,{kind:'accept',id:o.id,data:{accepted:'on'}}),d=accepted.state.deals[0];assert.deepEqual(d.snapshot.attachments,[a]);
  const updated=planAttachmentAction(accepted.state,provider,{kind:'offer',id:o.id,data:{...form,title:'Überarbeitetes Angebot mit Dateien'},removed:[a.id]});assert.equal(updated.state.offers.find(x=>x.id===o.id).attachments.length,0);assert.deepEqual(updated.state.deals.find(x=>x.id===d.id).snapshot.attachments,[a]);
});
test('member acceptance with files becomes a reviewable proof and only the involved three roles can read it',async()=>{
  const s=seed(),a=await meta(member,'abschluss.pdf'),result=planAttachmentAction(s,member,{kind:'accept',id:'OF-119',data:{accepted:'on'},added:[a]}),d=result.state.deals[0];assert.equal(d.status,'review');assert.equal(d.proof.type,'file-demo');assert.deepEqual(d.proof.attachmentIds,[a.id]);
  for(const actor of [member,provider,admin]){assert.equal(visibleAttachments(result.state,'deal',d.id,actor).length,1);assert.equal(findAttachment(result.state,'deal',d.id,actor,a.id).name,'abschluss.pdf');}
  for(const actor of [null,{role:'member',id:s.members.find(x=>x.id!==member.id).id},{role:'provider',id:'A-104'},{role:'admin',id:'forged'}]){assert.equal(visibleAttachments(result.state,'deal',d.id,actor).length,0);assert.throws(()=>findAttachment(result.state,'deal',d.id,actor,a.id));}
  assert.equal(visibleAttachments(result.state,'offer','OF-119',null).length,0);assert.equal(s.deals.some(x=>x.id===d.id),false);
});
test('all three roles can add deal documents without changing money or replacing earlier files',async()=>{
  let s=planAttachmentAction(seed(),member,{kind:'accept',id:'OF-119',data:{accepted:'on'}}).state;const id=s.deals[0].id,financial=()=>JSON.stringify({payment:s.deals[0].payment,cashback:s.deals[0].cashback,reserved:s.deals[0].reserved,budgets:s.offers.map(o=>o.budget)}),before=financial();
  for(const actor of [member,provider,admin])s=planAttachmentAction(s,actor,{kind:'deal',id,added:[await meta(actor,actor.role+'.pdf')]}).state;
  assert.equal(s.deals[0].attachments.length,3);assert.equal(financial(),before);assert.equal(s.deals[0].events.filter(e=>e.title==='Unterlagen hinzugefügt').length,3);
  s.deals[0].status='completed';assert.throws(()=>addDealAttachments(s,id,member,[{}]));assert.equal(planAttachmentAction(s,admin,{kind:'deal',id,added:[await meta(admin,'abschluss-admin.pdf')]}).state.deals[0].attachments.length,4);
});
test('proof corrections accept a real file without a reference and resolve the existing correction request',async()=>{
  let s=planAttachmentAction(seed(),member,{kind:'accept',id:'OF-119',data:{accepted:'on'}}).state;const d=s.deals[0];P.attachProof(s,d.id,member.id,'DEMO-Erster-Nachweis');P.acceptProviderDeal(s,d.id,provider.id);P.requestProviderCorrection(s,d.id,provider.id,'Bitte die Vertragsunterlage ergänzen.');
  const out=planAttachmentAction(s,member,{kind:'proof',id:d.id,data:{},added:[await meta(member)]}).state.deals[0];assert.equal(out.providerReview.correction.status,'resolved');assert.equal(out.proof.type,'file-demo');assert.throws(()=>planAttachmentAction(s,member,{kind:'proof',id:d.id,data:{}}));
});
test('limits, forged authors, duplicate identifiers and foreign edits fail atomically',async()=>{
  const s=seed(),a=await meta(),before=JSON.stringify(s);
  for(const action of [{kind:'offer',id:'OF-119',data:form,added:[{...a,uploaderId:'A-104'}]},{kind:'offer',data:form,added:[a,a]},{kind:'offer',id:'OF-119',data:form,removed:['foreign-id']},{kind:'accept',id:'OF-119',data:{},added:[]},{kind:'deal',id:s.deals.find(x=>x.providerId!=='A-101').id,added:[a]}])assert.throws(()=>planAttachmentAction(s,provider,action));
  assert.equal(JSON.stringify(s),before);
});
test('upload coordinator rolls back blobs on failed state writes and account changes',async()=>{
  const s=seed(),store=memory();let actor=member,saved=0;const options={context:()=>({state:s,actor}),action:{kind:'accept',id:'OF-119',data:{accepted:'on'}},files:[file()],store,save:()=>{saved++;throw Error('Storage unavailable');}};
  await assert.rejects(()=>submitAttachmentAction(options),/Storage unavailable/);assert.equal(store.files.size,0);assert.equal(saved,1);
  saved=0;const original=store.put;store.put=async records=>{await original(records);actor=provider;};await assert.rejects(()=>submitAttachmentAction({...options,save:()=>{saved++;}}),/Konto wurde geändert/);assert.equal(store.files.size,0);assert.equal(saved,0);
});
test('upload storage failure cannot create a deal, reserve funds or save file references',async()=>{
  const s=seed(),before=JSON.stringify(s),store=memory();let saved=false;store.put=async()=>{throw Object.assign(Error('quota'),{name:'QuotaExceededError'});};
  await assert.rejects(()=>submitAttachmentAction({context:()=>({state:s,actor:member}),action:{kind:'accept',id:'OF-119',data:{accepted:'on'}},files:[file()],store,save:()=>{saved=true;}}),/Speicher ist voll/);assert.equal(saved,false);assert.equal(JSON.stringify(s),before);
});
test('successful file submission persists Blob and JSON metadata, reusing latest state after asynchronous reads',async()=>{
  let s=seed();const store=memory(),result=await submitAttachmentAction({context:()=>({state:s,actor:member}),action:{kind:'accept',id:'OF-119',data:{accepted:'on'}},files:[file()],store,save:next=>{s=next;}});const d=s.deals[0];assert.equal(result.target,'deal:'+d.id);assert.equal(store.files.size,1);const roundtrip=JSON.parse(JSON.stringify(s));assert.equal(visibleAttachments(roundtrip,'deal',d.id,provider)[0].id,d.attachments[0].id);assert.equal(await store.files.get(d.attachments[0].id).blob.text(),'%PDF-1.7\nBuyMe fake document');
});
test('purchase upload shares only successful order files and idempotent retries do not append more files',async()=>{
  const s=seed();addToCart(s,member.id,'OF-SHOP-TABLET',s.offers.find(o=>o.id==='OF-SHOP-TABLET').purchase.variants[0],1);
  const data={token:'test-uploads-purchase',accepted:'on',method:'card',outcome:'success',name:'Lena Demo',email:'lena@example.test',address:'Demoweg 12',postalCode:'70173',city:'Stuttgart'},a=await meta(member);
  const result=planAttachmentAction(s,member,{kind:'purchase-checkout',data,added:[a]});assert.equal(result.state.orders.at(0).status,'paid');assert.equal(result.state.deals[0].attachments[0].id,a.id);
  const second=planAttachmentAction(result.state,member,{kind:'purchase-checkout',data,added:[await meta(member)]});assert.equal(second.keepUploads,false);assert.equal(second.state.deals[0].attachments.length,1);
  const failed=planAttachmentAction(s,member,{kind:'purchase-checkout',data:{...data,outcome:'failed'},added:[a]});assert.equal(failed.keepUploads,false);assert.equal(failed.state.deals.length,s.deals.length);
});
test('attachment UI escapes names, displays actual download controls and exposes uploads in each deal role',async()=>{
  const s=seed(),a=await meta(member,'<fake>.pdf'),r=planAttachmentAction(s,member,{kind:'accept',id:'OF-119',data:{accepted:'on'},added:[a]});
  for(const actor of [member,provider,admin]){const html=dealAttachmentsPanel(r.state,r.state.deals[0],actor);assert.match(html,/Herunterladen/);assert.match(html,/Unterlagen speichern/);assert.match(html,/&lt;fake&gt;\.pdf/);assert.doesNotMatch(html,/<fake>/);}
  assert.match(uploadPicker(),/type="file" multiple/);assert.match(uploadPicker(),/5 MB/);assert.doesNotMatch(attachmentPanel(r.state,'deal',r.state.deals[0].id,null),/fake/);
});
