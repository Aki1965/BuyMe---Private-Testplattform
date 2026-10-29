import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=name=>readFile(new URL(name,root),'utf8');
const worker=await read('sw.js');
function harness(fetchImpl,scope='https://buyme.example.test/demo/'){
  const listeners={},calls=[];
  const context={URL,Response,fetch:async(...args)=>{calls.push(args);return fetchImpl(...args);},self:{registration:{scope},addEventListener:(type,fn)=>{listeners[type]=fn;},skipWaiting:async()=>{},clients:{claim:async()=>{}}}};
  vm.runInNewContext(worker,context);
  return {calls,request:(path,overrides={})=>{let result;const request={url:new URL(path,scope).href,mode:'navigate',method:'GET',...overrides};listeners.fetch({request,respondWith:value=>{result=value;}});return result;}};
}
test('PWA manifest and both entry pages use one scoped standalone app with real PNG icons',async()=>{
  const manifest=JSON.parse(await read('manifest.webmanifest'));
  assert.equal(manifest.display,'standalone');assert.equal(manifest.id,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./#market');assert.equal(manifest.short_name,'BuyMe');
  assert.ok(manifest.icons.some(i=>i.sizes==='192x192'&&i.purpose==='any'));assert.ok(manifest.icons.some(i=>i.sizes==='512x512'&&i.purpose==='any'));assert.ok(manifest.icons.some(i=>i.purpose==='maskable'));
  for(const icon of [...manifest.icons,{src:'./assets/icons/apple-touch-icon.png',sizes:'180x180'}]){
    const data=await readFile(new URL(icon.src,root));assert.equal(data.toString('hex',0,8),'89504e470d0a1a0a');const [w,h]=icon.sizes.split('x').map(Number);assert.equal(data.readUInt32BE(16),w);assert.equal(data.readUInt32BE(20),h);
  }
  for(const name of ['index.html','admin.html']){
    const html=await read(name);assert.match(html,/rel="manifest" href="\.\/manifest\.webmanifest" crossorigin="use-credentials"/);assert.match(html,/apple-touch-icon/);assert.match(html,/apple-mobile-web-app-capable" content="yes/);assert.match(html,/src="\.\/(?:js\/)?pwa\.js"/);
  }
});
test('PWA worker always fetches documents from the network and preserves access-denied responses',async()=>{
  for(const status of [200,401,403,503]){
    const upstream=new Response('From hosting',{status});const h=harness(()=>upstream);assert.equal(await h.request('index.html'),upstream);assert.equal(h.calls.length,1);assert.equal(h.calls[0][1].cache,'no-store');
  }
  const redirect=Response.redirect('https://auth.example.test/',302),h=harness(()=>redirect);assert.equal(await h.request('admin.html'),redirect);
});
test('PWA offline fallback is a generic 503 with no application, credentials or cached data',async()=>{
  const h=harness(()=>{throw new TypeError('Network offline');});const response=await h.request('');assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');const html=await response.text();assert.match(html,/Du bist gerade offline/);assert.doesNotMatch(html,/<script|localStorage|sessionStorage|buyme-platform|BuyMeTest/);
  assert.doesNotMatch(worker,/\bcaches\.|cache\.put|cache\.add|localStorage/);
});
test('PWA worker leaves mutations, assets, external destinations, auth routes and callback queries to the browser',()=>{
  const h=harness(()=>{throw Error('Unexpected interception');});
  for(const [path,options] of [['index.html',{method:'POST'}],['index.html',{mode:'cors'}],['platform.js',{}],['auth/callback',{}],['?code=example',{}],['admin.html?return=example',{}],['https://other.example.test/demo/',{}],['https://buyme.example.test/elsewhere/',{}]])assert.equal(h.request(path,options),undefined,path);
  assert.equal(h.calls.length,0);
});
