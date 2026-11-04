import test from 'node:test';
import assert from 'node:assert/strict';
import {readServiceConfig} from '../server/service-config.mjs';
const fixture={
  BUYME_ENVIRONMENT:'staging',BUYME_APP_ORIGIN:'https://buyme-staging.example.com',
  SUPABASE_URL:'abcdefghijklmnopqrst.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_abcdefghijklmnopqrstuvwxyz1234',
  COOKIEBOT_DOMAIN_GROUP_ID:'12345678-1234-1234-1234-123456789abc',
  BREVO_API_KEY:'fake_server_key_for_configuration_test',BREVO_SENDER_EMAIL:'info@example.com'
};
fixture.SUPABASE_URL='https://'+fixture.SUPABASE_URL;
test('complete configuration is only format-validated and public values exclude server secrets',()=>{
  const r=readServiceConfig(fixture);assert.equal(r.configurationComplete,true);
  assert.ok(!JSON.stringify(r.publicConfig).includes(fixture.BREVO_API_KEY));
  assert.deepEqual(Object.keys(r.publicConfig).sort(),['appOrigin','cookiebotDomainGroupId','supabasePublishableKey','supabaseUrl']);
});
test('server-side Supabase keys cannot be used as browser keys',()=>{
  for(const value of ['sb_secret_abcdefghijklmnopqrstuvwxyz1234','service_role','eyJhbGciOiJIUzI1NiJ9.fake.service_role'])
    assert.ok(readServiceConfig({...fixture,SUPABASE_PUBLISHABLE_KEY:value}).errors.some(e=>e.startsWith('SUPABASE_PUBLISHABLE_KEY:')));
});
test('credential-bearing URLs, paths and unverified custom Supabase hosts are rejected',()=>{
  for(const value of ['http://buyme.example.com','https://user:secret@buyme.example.com','https://buyme.example.com/path','https://buyme.example.com/?token=secret'])
    assert.ok(readServiceConfig({...fixture,BUYME_APP_ORIGIN:value}).errors.some(e=>e.startsWith('BUYME_APP_ORIGIN:')));
  assert.ok(readServiceConfig({...fixture,SUPABASE_URL:'https://internal.example.com'}).errors.some(e=>e.startsWith('SUPABASE_URL:')));
});
test('missing configuration and placeholder domain IDs fail without echoing values',()=>{
  assert.equal(readServiceConfig({}).configurationComplete,false);
  const r=readServiceConfig({...fixture,COOKIEBOT_DOMAIN_GROUP_ID:'00000000-0000-0000-0000-000000000000',BREVO_API_KEY:'private secret value'});
  assert.equal(r.configurationComplete,false);assert.ok(!r.errors.join(' ').includes('private secret value'));
});
test('an environment must be selected explicitly and trailing origin slashes normalize',()=>{
  assert.equal(readServiceConfig({...fixture,BUYME_ENVIRONMENT:'demo'}).configurationComplete,false);
  assert.equal(readServiceConfig({...fixture,BUYME_APP_ORIGIN:fixture.BUYME_APP_ORIGIN+'/'}).publicConfig.appOrigin,fixture.BUYME_APP_ORIGIN);
});
