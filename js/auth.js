import {LEGAL_DOCS} from './legal-content.js';
import {testTermsRecord} from './legal-model.js';
// Browser-local test accounts. Hosting access remains managed separately by Sites.
// This module is a test login, not a server-side security boundary.
import {registerMember,registerProvider} from './platform-model.js';
export const AUTH_SESSION_KEY='buyme-auth-session-v1';
export const TEST_PASSWORD='BuyMeTest!2026';
export const TEST_ACCOUNTS=[
  {role:'member',id:'U-2108',email:'lena.berger@example.test',name:'Lena Berger'},
  {role:'provider',id:'A-101',email:'partner@example.test',name:'Nordlicht Mobil'},
  {role:'admin',id:'ADMIN-1',email:'admin@buyme.test',name:'BuyMe Administration'},
  {role:'provider',id:'A-104',email:'reisen@example.test',name:'Reisezeit Plus'},
  {role:'provider',id:'A-106',email:'mobilitaet@example.test',name:'AutoQuartier'},
  {role:'provider',id:'A-SHOP-MODE',email:'mode@example.test',name:'Stadtmode'},
  {role:'provider',id:'A-SHOP-TISCH',email:'gastro@example.test',name:'Tischzeit'}
];
const normalize=s=>String(s||'').trim().toLowerCase();
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const unhex=s=>Uint8Array.from(s.match(/../g)||[],x=>parseInt(x,16));
const ITERATIONS=210000;
// Public sample credentials, pre-derived once so visiting the marketplace is fast.
const SEED_PASSWORDS=[
 {salt:'b1e2bd9e86149dc983792c9cd7d15cb7',iterations:210000,hash:'53c8f73a4825675f1d9fb677f83d1f50980ea8f415a5230f0e279483c88c0924'},
 {salt:'2adba6d08ff1d47c707288b8ad0f5977',iterations:210000,hash:'43af95fb40a1dd7fd9a682404ee055d66d20f004bf40443e4a272962797aed51'},
 {salt:'b3944ce7e18da156d99d203e9b4e1335',iterations:210000,hash:'8c16d2673e067f8dc9519770fd330380bad5d4e4e34cf94a501b52cdf5ded7b4'},
 {salt:'041060e1562fa101c6b32860fb2f9328',iterations:210000,hash:'eb3c2a94cd392dc0ee915e4c39de40821393f71373c5bf2137d40d3934f73362'},
 {salt:'eed0b1c4cd486caa6fdc9fbc6b318670',iterations:210000,hash:'6b2f413fb23bb5dc3d84737ce2542dd58a48ed7fa502a5d50100818958d6b189'},
 {salt:'ac9be6ae355daf9a28e485a37add68a7',iterations:210000,hash:'9d02b548ad95d3dccd99e6a46468477f8032c804f603f099ede24988040d5fe4'},
 {salt:'d51b9df621b73409df9920f92db57b51',iterations:210000,hash:'3680038afa7b213c58fb9c2fe4700c19a2255d8cb11d463c47e43749d59ac5e5'}
];
function requiredPassword(password){
  if(typeof password!=='string'||password.length<8||password.length>128)throw Error('Bitte ein Passwort mit 8 bis 128 Zeichen wählen.');
}
async function derive(password,salt,iterations=ITERATIONS){
  if(!globalThis.crypto?.subtle)return derivePortable(password,salt,iterations);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unhex(salt),iterations},key,256));
}
export async function derivePortable(password,salt,iterations){
  const {sha256,hmac}=await import('./vendor/hash-sha256.js');
  const key=Array.from(new TextEncoder().encode(password));
  let u=new hmac(sha256,key).update([...unhex(salt),0,0,0,1]).digest(),out=Array.from(u);
  for(let n=1;n<iterations;n++){u=new hmac(sha256,key).update(u).digest();for(let j=0;j<32;j++)out[j]^=u[j];if(n%4000===0)await new Promise(resolve=>setTimeout(resolve,0));}
  return hex(out);
}
export async function passwordRecord(password){requiredPassword(password);const salt=hex(crypto.getRandomValues(new Uint8Array(16)));return {salt,iterations:ITERATIONS,hash:await derive(password,salt)};}
export async function passwordMatches(password,record){
  if(typeof password!=='string'||password.length>128||!record?.salt||!record?.hash)return false;
  const actual=await derive(password,record.salt,record.iterations);let difference=actual.length^record.hash.length;
  for(let i=0;i<actual.length;i++)difference|=actual.charCodeAt(i)^record.hash.charCodeAt(i);
  return difference===0;
}
export async function initializeAuth(state){
  if(state.auth?.version===1&&state.auth.commerceAccounts===1)return false;
  const accounts=state.auth?.accounts||[];
  for(const [index,sample] of TEST_ACCOUNTS.entries()){
    const person=sample.role==='member'?state.members.find(x=>x.id===sample.id):sample.role==='provider'?state.providers.find(x=>x.id===sample.id):sample;
    if(person&&!accounts.some(a=>a.id===sample.id&&a.role===sample.role||a.email===normalize(sample.email)))accounts.push({role:sample.role,id:sample.id,email:normalize(sample.email),password:{...SEED_PASSWORDS[index]},createdAt:new Date().toISOString()});
  }
  state.auth={version:1,commerceAccounts:1,accounts};return true;
}
export async function registerAccount(state,form){
  if(!['member','provider'].includes(form.role))throw Error('Bitte Mitglied oder Anbieter auswählen.');
  const email=normalize(form.email);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Bitte eine gültige E-Mail-Adresse eingeben.');
  if((state.auth?.accounts||[]).some(a=>a.email===email)||state.members.some(x=>normalize(x.email)===email)||state.providers.some(x=>normalize(x.email)===email))throw Error('Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an.');
  requiredPassword(form.password);
  if(form.password!==form.passwordConfirm)throw Error('Die Passwörter stimmen nicht überein.');
  if(form.testConsent!=='on')throw Error('Bitte bestätige die Erstellung eines fiktiven Testkontos.');
  const password=await passwordRecord(form.password);
  const person=form.role==='member'?registerMember(state,{...form,email}):registerProvider(state,{...form,email});
  if(form.role==='provider')person.contactName=String(form.contactName||'').trim().slice(0,100);
  const record={role:form.role,id:person.id,email,password,createdAt:new Date().toISOString(),legal:testTermsRecord(form.role)};
  state.auth.accounts.push(record);return {role:record.role,id:record.id,email:record.email};
}
export async function authenticate(state,email,password){
  const account=state.auth?.accounts.find(a=>a.email===normalize(email));
  if(!account||!await passwordMatches(password,account.password))throw Error('E-Mail-Adresse oder Passwort ist nicht korrekt.');
  const person=account.role==='member'?state.members.find(x=>x.id===account.id):account.role==='provider'?state.providers.find(x=>x.id===account.id):account;
  if(!person)throw Error('Dieses Konto ist nicht mehr verfügbar.');
  if(person.status==='blocked')throw Error('Dieses Konto wurde gesperrt. Bitte wende dich an die BuyMe-Administration.');
  return {role:account.role,id:account.id,email:account.email};
}
export async function changePassword(state,session,form){
  const account=state.auth?.accounts.find(x=>x.id===session?.id&&x.role===session?.role);
  if(!account||!await passwordMatches(form.currentPassword,account.password))throw Error('Das bisherige Passwort ist nicht korrekt.');
  requiredPassword(form.password);
  if(form.password!==form.passwordConfirm)throw Error('Die neuen Passwörter stimmen nicht überein.');
  account.password=await passwordRecord(form.password);
}
export function clearAuth(){sessionStorage.removeItem(AUTH_SESSION_KEY);localStorage.removeItem(AUTH_SESSION_KEY);}
export function saveAuth(session,remember=false){
  clearAuth();const data={...session,expiresAt:Date.now()+(remember?7*86400000:12*3600000)};
  (remember?localStorage:sessionStorage).setItem(AUTH_SESSION_KEY,JSON.stringify(data));return data;
}
export function currentAuth(state){
  try{
    const auth=JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY)||localStorage.getItem(AUTH_SESSION_KEY)||'null');
    if(!auth||auth.expiresAt<=Date.now()||!state.auth?.accounts.some(a=>a.id===auth.id&&a.role===auth.role))return null;
    const person=auth.role==='member'?state.members.find(x=>x.id===auth.id):auth.role==='provider'?state.providers.find(x=>x.id===auth.id):auth;
    return !person||person.status==='blocked'?null:auth;
  }catch{return null;}
}
export function allowedRoute(route,role){
  if(route==='legal'||Object.hasOwn(LEGAL_DOCS,route)||['withdraw-request','cancel-request','content-request','accessibility-request'].includes(route)||route.startsWith('legal-receipt:'))return true;
  if(['cart','market','how','login','register','register-provider','test-access'].includes(route)||route.startsWith('offer:')||route.startsWith('provider:'))return true;
  if(!role)return false;
  if(['deals','messages','reviews','profile','security'].includes(route)||route.startsWith('deal:'))return ['member','provider'].includes(role);
  if(route==='wallet'||route==='checkout')return role==='member';
  if(route==='orders'||route.startsWith('order:'))return ['member','provider'].includes(role);
  if(['dashboard','offers','budget','offer-new'].includes(route)||route.startsWith('offer-edit:'))return role==='provider';
  return false;
}
