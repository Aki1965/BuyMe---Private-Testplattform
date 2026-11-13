import test from 'node:test';
import assert from 'node:assert/strict';
import {accountEntryTarget} from '../js/account-entry.js';

test('enabled registration and sign-in enter the server-backed account area',()=>{
 for(const [route,expected] of Object.entries({register:'register','register-provider':'register-provider',login:'login',profile:'profile',security:'forgot'})){
  assert.equal(accountEntryTarget('https://buyme.com.tr/?unrelated=1#'+route,true),'https://buyme.com.tr/account.html#'+expected);
 }
});
test('closed registration and explicit fictional demos retain the existing routes',()=>{
 assert.equal(accountEntryTarget('https://buyme.com.tr/#register',false),null);
 assert.equal(accountEntryTarget('https://buyme.com.tr/?demo=1#login',true),null);
 assert.equal(accountEntryTarget('https://buyme.com.tr/?next=admin#login',true),null);
 assert.equal(accountEntryTarget('https://buyme.com.tr/admin.html#security',true),null);
 assert.equal(accountEntryTarget('https://buyme.com.tr/account.html#login',true),null);
});
test('operator and privacy pages use the same account documents even inside the demo',()=>{
 assert.equal(accountEntryTarget('https://buyme.com.tr/?demo=1#imprint',true),'https://buyme.com.tr/account.html#imprint');
 assert.equal(accountEntryTarget('https://buyme.com.tr/admin.html#privacy',true),'https://buyme.com.tr/account.html#privacy');
});
test('marketplace pages and unrecognized routes cannot become arbitrary redirects',()=>{
 for(const route of ['market','offer:OF-119','deal:1','test-access','https://evil.invalid','//evil.invalid','__proto__','constructor','toString'])assert.equal(accountEntryTarget('https://buyme.com.tr/#'+route,true),null);
});
