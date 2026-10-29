import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,symlink,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createAppServer,serverOptions,PROJECT_ROOT} from '../scripts/server.mjs';

test('development server serves marketplace, admin, modules and assets with correct MIME types',async t=>{
  const server=await createAppServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  for(const [file,type,needle] of [['/','text/html','./js/platform.js'],['/admin.html?deal=BM-DEMO','text/html','./js/app.js'],['/js/auth.js','text/javascript','export'],['/css/legal.css','text/css','legal-page'],['/assets/buyme-logo-light.svg','image/svg+xml','<svg'],['/manifest.webmanifest','application/manifest+json','standalone'],['/sw.js','text/javascript','respondWith'],['/js/pwa.js','text/javascript','beforeinstallprompt']]){
    const r=await fetch(base+file);assert.equal(r.status,200);assert.ok(r.headers.get('content-type').startsWith(type));assert.ok((await r.text()).includes(needle));assert.equal(r.headers.get('cache-control'),'no-store');
  }
  const head=await fetch(base+'/index.html',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.ok(Number(head.headers.get('content-length'))>0);
});
test('development server rejects source metadata, traversal, malformed URLs, missing files and mutations',async t=>{
  const server=await createAppServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const base='http://127.0.0.1:'+server.address().port;
  for(const file of ['/.git/config','/.env','/package.json','/tests/auth.test.mjs','/scripts/server.mjs','/js/not-present.js','/js/.hidden.js','/css/%2e%2e/package.json'])assert.equal((await fetch(base+file)).status,404,file);
  assert.equal((await fetch(base+'/%E0%A4%A')).status,400);
  const post=await fetch(base+'/',{method:'POST'});assert.equal(post.status,405);assert.equal(post.headers.get('allow'),'GET, HEAD');
});
test('development server will not follow an asset symlink outside the application directory',async t=>{
  const outside=await mkdtemp(path.join(os.tmpdir(),'buyme-server-'));const secret=path.join(outside,'external.txt'),link=path.join(PROJECT_ROOT,'assets','server-test-link.txt');
  await writeFile(secret,'Outside development root');await symlink(secret,link);
  t.after(async()=>{await rm(link,{force:true});await rm(outside,{recursive:true,force:true});});
  const server=await createAppServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  assert.equal((await fetch('http://127.0.0.1:'+server.address().port+'/assets/server-test-link.txt')).status,404);
});
test('development server options support cloud hosts and validate ports and flags',()=>{
  assert.deepEqual(serverOptions([],{PORT:'5000',HOST:'0.0.0.0'}),{port:5000,host:'0.0.0.0',directory:PROJECT_ROOT});assert.equal(serverOptions(['--port','0'],{}).port,0);assert.equal(serverOptions(['--host','0.0.0.0','--port','4173','--strictPort'],{}).port,4173);
  for(const args of [['--port','-1'],['--port','abc'],['--port','65536'],['--unknown','yes'],['--host']])assert.throws(()=>serverOptions(args,{}));
});
