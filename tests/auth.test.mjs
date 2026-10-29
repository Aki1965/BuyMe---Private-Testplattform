import test from 'node:test';
import assert from 'node:assert/strict';
import {pbkdf2Sync} from 'node:crypto';
import {createSeed,changeDeal,releasePayment} from '../js/model.js';
import * as Platform from '../js/platform-model.js';
import {accountContext} from '../js/accounts.js';
import {initializeAuth,authenticate,registerAccount,changePassword,TEST_PASSWORD,derivePortable,currentAuth,saveAuth,clearAuth,allowedRoute,AUTH_SESSION_KEY} from '../js/auth.js';
const member={role:'member',name:'Rana Beispiel',city:'Stuttgart',email:'rana@example.test',password:'EigenerTest!123',passwordConfirm:'EigenerTest!123',testConsent:'on'};
const fresh=async()=>{const s=createSeed();await initializeAuth(s);return s;};
test('existing deal data survives account initialization and all three sample credentials work',async()=>{
 const s=await fresh(),deals=JSON.stringify(s.deals);assert.equal(await initializeAuth(s),false);assert.equal(JSON.stringify(s.deals),deals);
 for(const [email,role] of [['lena.berger@example.test','member'],['partner@example.test','provider'],['admin@buyme.test','admin']])assert.equal((await authenticate(s,email,TEST_PASSWORD)).role,role);
 await assert.rejects(()=>authenticate(s,'admin@buyme.test','WrongPass!123'),/nicht korrekt/);
 await assert.rejects(()=>authenticate(s,'unknown@example.test',TEST_PASSWORD),/nicht korrekt/);
});
test('registration persists a salted hash, signs in again after serialization, and rejects duplicate email across roles',async()=>{
 const s=await fresh(),user=await registerAccount(s,member),saved=JSON.parse(JSON.stringify(s));
 assert.equal((await authenticate(saved,' RANA@EXAMPLE.TEST ',member.password)).id,user.id);
 const record=s.auth.accounts.find(a=>a.id===user.id);assert.equal(record.password.hash.length,64);assert.equal(record.password.salt.length,32);assert.equal(JSON.stringify(s.auth).includes(member.password),false);
 await assert.rejects(()=>registerAccount(s,{...member,role:'provider',name:'Andere Firma',description:'Ein fiktives Unternehmen',region:'Deutschland'}),/bereits registriert/);
 assert.equal(s.members.filter(x=>x.email===member.email).length,1);
});
test('invalid registration cannot create an account or choose admin privileges',async()=>{
 const s=await fresh(),before=JSON.stringify(s);
 for(const patch of [{role:'admin'},{passwordConfirm:'AnderesPasswort'},{password:'kurz',passwordConfirm:'kurz'},{testConsent:''},{email:'ungueltig'}])await assert.rejects(()=>registerAccount(s,{...member,...patch}));
 assert.equal(JSON.stringify(s),before);
});
test('new providers start pending without credit, and blocked accounts cannot sign in',async()=>{
 const s=await fresh(),a=await registerAccount(s,{...member,role:'provider',name:'Rana Partner GmbH',contactName:'Rana Beispiel',region:'Deutschland',description:'Fiktive Mobilfunkangebote für Mitglieder.'});
 const p=s.providers.find(x=>x.id===a.id);assert.equal(p.verified,false);assert.equal(p.credit,0);assert.equal(p.contactName,'Rana Beispiel');p.status='blocked';
 await assert.rejects(()=>authenticate(s,a.email,member.password),/gesperrt/);
});
test('password changes require the old password and make old credentials invalid',async()=>{
 const s=await fresh(),user=await registerAccount(s,member);
 await assert.rejects(()=>changePassword(s,user,{currentPassword:'NichtRichtig',password:'NeuesPass!123',passwordConfirm:'NeuesPass!123'}));
 await changePassword(s,user,{currentPassword:member.password,password:'NeuesPass!123',passwordConfirm:'NeuesPass!123'});
 await assert.rejects(()=>authenticate(s,member.email,member.password));assert.equal((await authenticate(s,member.email,'NeuesPass!123')).id,user.id);
});
test('local session expiration, sign-out, blocking and role route guards apply',async()=>{
 const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
 globalThis.localStorage=memory();globalThis.sessionStorage=memory();const s=await fresh(),a=await authenticate(s,'lena.berger@example.test',TEST_PASSWORD);
 saveAuth(a);assert.equal(currentAuth(s).id,a.id);assert.equal(localStorage.getItem(AUTH_SESSION_KEY),null);s.members.find(x=>x.id===a.id).status='blocked';assert.equal(currentAuth(s),null);s.members.find(x=>x.id===a.id).status='active';clearAuth();assert.equal(currentAuth(s),null);
 saveAuth({...a,expiresAt:1},true);const stored=JSON.parse(localStorage.getItem(AUTH_SESSION_KEY));stored.expiresAt=1;localStorage.setItem(AUTH_SESSION_KEY,JSON.stringify(stored));assert.equal(currentAuth(s),null);
 assert.equal(allowedRoute('wallet',null),false);assert.equal(allowedRoute('offer-new','member'),false);assert.equal(allowedRoute('wallet','provider'),false);assert.equal(allowedRoute('profile','admin'),false);assert.equal(allowedRoute('register-provider',null),true);assert.equal(allowedRoute('offer:OF-119',null),true);
});
test('portable PBKDF2 matches Node crypto for Unicode passwords and multiple iterations',async()=>{
 const salt='0123456789abcdef0123456789abcdef';for(const count of [1,2,128])assert.equal(await derivePortable('Grüße Test!🔒',salt,count),pbkdf2Sync('Grüße Test!🔒',Buffer.from(salt,'hex'),count,32,'sha256').toString('hex'));
});
test('new registered accounts complete a shared deal and appear in admin account details after reload',async()=>{
 let s=await fresh();
 const memberAuth=await registerAccount(s,member);
 const providerAuth=await registerAccount(s,{...member,email:'firma@example.test',role:'provider',name:'Test Firma GmbH',contactName:'Rana Beispiel',region:'Deutschland',description:'Fiktive Angebote mit Geldprämien für Mitglieder.'});
 await authenticate(s,'admin@buyme.test',TEST_PASSWORD);Platform.verifyProvider(s,providerAuth.id);Platform.topUp(s,providerAuth.id,1000);
 const p=await authenticate(s,'firma@example.test',member.password);
 const offer=Platform.createOffer(s,p.id,{title:'Neuer Tarif mit Prämie',category:'Telekommunikation',subcategory:'Mobilfunkverträge',cashback:100,budget:500,price:'29,99 € / Monat',description:'Ein ausführlich beschriebenes fiktives Angebot.',conditions:'Bestätigter Vertrag nach erfolgter Prüfung.',region:'Deutschland',validUntil:'2027-12-31',payoutDays:14});
 Platform.moderateOffer(s,offer.id,true,'');
 const m=await authenticate(s,member.email,member.password),deal=Platform.acceptOffer(s,offer.id,m.id);
 Platform.acceptProviderDeal(s,deal.id,p.id);Platform.attachProof(s,deal.id,m.id,'TEST-ABSCHLUSS-123');Platform.confirmProviderDeal(s,deal.id,p.id,{reference:'TEST-VERTRAG-123',note:'Nachweis und Prämienbedingungen geprüft.',conditionsChecked:true});changeDeal(s,deal.id,'completed','Frist und Abschluss für den Test geprüft.');releasePayment(s,deal.id);Platform.requestPayout(s,m.id);Platform.settlePayment(s,deal.id,true);
 s=JSON.parse(JSON.stringify(s));
 assert.equal(Platform.walletSummary(s,memberAuth.id).paid,100);
 assert.equal(accountContext(s,'member',memberAuth.id).deals[0].id,deal.id);
 assert.equal(accountContext(s,'provider',providerAuth.id).deals[0].userId,memberAuth.id);
 assert.equal((await authenticate(s,member.email,member.password)).id,memberAuth.id);
});
