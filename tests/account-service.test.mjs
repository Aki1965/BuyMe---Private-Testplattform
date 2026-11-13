import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountService} from '../js/account-service.js';
import {publicAccountConfig} from '../scripts/account-config.mjs';

const config={appOrigin:'https://buyme.com.tr',termsVersion:'2026-11-12.test-accounts-v1'};
const form={name:'Test Person',email:'Person@example.invalid',password:'Unique-Test-12345',passwordConfirm:'Unique-Test-12345',role:'member',terms:'on'};
const user={id:'verified-user',email:'person@example.invalid',email_confirmed_at:'2026-11-12T12:00:00Z',user_metadata:{display_name:'Test Person',buyme_test_terms:config.termsVersion}};

test('registration sends only minimal non-privileged metadata and a fixed callback',async()=>{
 let call;
 const service=createAccountService({auth:{signUp:async payload=>(call=payload,{data:{session:null},error:null})}},config);
 assert.deepEqual(await service.register({...form,admin:true,roleClaim:'admin',address:'ignored'}),{confirmationRequired:true});
 assert.equal(call.email,'person@example.invalid');
 assert.equal(call.options.emailRedirectTo,'https://buyme.com.tr/account.html');
 assert.deepEqual(Object.keys(call.options.data).sort(),['buyme_test_terms','company_name','display_name','requested_role']);
 assert.equal(call.options.data.requested_role,'member');
 assert.equal(JSON.stringify(call.options.data).includes(form.password),false);
});
test('invalid registration never reaches the email service',async()=>{
 let calls=0;const service=createAccountService({auth:{signUp:async()=>{calls++;}}},config);
 for(const bad of [{role:'admin'},{terms:''},{password:'short',passwordConfirm:'short'},{email:'bad'},{passwordConfirm:'different'},{role:'provider',company:''}]){
  await assert.rejects(()=>service.register({...form,...bad}));
 }
 assert.equal(calls,0);
});
test('registration fails closed when server email confirmation is disabled',async()=>{
 let signedOut=false;
 const service=createAccountService({auth:{signUp:async()=>({data:{session:{user}},error:null}),signOut:async()=>{signedOut=true;return {error:null};}}},config);
 await assert.rejects(()=>service.register(form),/nicht korrekt freigeschaltet/);
 assert.equal(signedOut,true);
});
test('unconfirmed users cannot load a profile',async()=>{
 let queried=false;const service=createAccountService({auth:{getUser:async()=>({data:{user:{...user,email_confirmed_at:null}},error:null})},from:()=>{queried=true;}},config);
 await assert.rejects(()=>service.ownProfile(),/bestätigen/);assert.equal(queried,false);
});
test('existing verified accounts without registration metadata need explicit profile setup',async()=>{
 const existing={...user,user_metadata:{}};
 const service=createAccountService({auth:{getUser:async()=>({data:{user:existing},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})})},config);
 assert.deepEqual(await service.ownProfile(),{user:existing,profile:null});
});
test('explicit profile setup ignores submitted ownership and requires terms',async()=>{
 let payload;
 const service=createAccountService({auth:{getUser:async()=>({data:{user},error:null})},from:()=>({insert:value=>(payload=value,{select:()=>({single:async()=>({data:value,error:null})})})})},config);
 await assert.rejects(()=>service.completeProfile({...form,terms:''}));
 await assert.rejects(()=>service.completeProfile({...form,role:'admin'}));
 await service.completeProfile({...form,id:'foreign-user'});
 assert.equal(payload.id,user.id);assert.equal(payload.terms_acknowledged,true);assert.equal(payload.requested_role,'member');
});
test('profile ownership comes from verified Auth identity, never from submitted fields',async()=>{
 let payload,owner;
 const service=createAccountService({auth:{getUser:async()=>({data:{user},error:null})},from:()=>({update:value=>{payload=value;return {eq:(column,id)=>{owner=id;return {select:()=>({single:async()=>({data:{id,...value},error:null})})};}};}})},config);
 await service.saveProfile({id:'victim',name:'Updated Name',company:'',role:'admin',terms_version:'changed',created_at:'fake'});
 assert.equal(owner,user.id);assert.deepEqual(payload,{display_name:'Updated Name',company_name:''});
});
test('reset links use the configured callback and password changes sign out',async()=>{
 let reset,updated,signedOut=false;
 const service=createAccountService({auth:{getUser:async()=>({data:{user},error:null}),resetPasswordForEmail:async(...args)=>(reset=args,{error:null}),updateUser:async p=>(updated=p,{error:null}),signOut:async()=>(signedOut=true,{error:null})}},config);
 await service.requestReset(' PERSON@example.invalid ');
 assert.deepEqual(reset,['person@example.invalid',{redirectTo:'https://buyme.com.tr/account.html'}]);
 await service.setPassword('Another-Unique-1234','Another-Unique-1234');assert.deepEqual(updated,{password:'Another-Unique-1234'});assert.equal(signedOut,true);
});
test('build stays closed and never serializes mail secrets',()=>{
 const result=publicAccountConfig({BREVO_API_KEY:'never-public',SMTP_PASS:'secret',SUPABASE_PUBLISHABLE_KEY:'unused'});
 assert.equal(result.enabled,false);assert.equal(result.publishableKey,'');assert.equal(JSON.stringify(result).includes('secret'),false);
});
test('public release requires an address, verified setup and a publishable key',()=>{
 const valid={BUYME_ACCOUNT_SIGNUP_ENABLED:'true',BUYME_ACCOUNT_SETUP_VERIFIED:'true',BUYME_OPERATOR_ADDRESS:'Testanschrift 12, 12345 Beispielort',SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example',BUYME_APP_ORIGIN:'https://buyme.com.tr'};
 assert.equal(publicAccountConfig(valid).enabled,true);
 for(const override of [{BUYME_OPERATOR_ADDRESS:''},{BUYME_ACCOUNT_SETUP_VERIFIED:'false'},{SUPABASE_PUBLISHABLE_KEY:'sb_secret_forbidden'},{SUPABASE_PUBLISHABLE_KEY:'eyJhbGciOiJlegacy'},{BUYME_APP_ORIGIN:'https://user:password@example.com'},{BUYME_APP_ORIGIN:'https://example.com/path'},{SUPABASE_URL:'http://example.com'}])assert.throws(()=>publicAccountConfig({...valid,...override}));
});
