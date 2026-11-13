import {cp,mkdir,rm,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import {publicAccountConfig} from './account-config.mjs';
import {writeFile,readFile,readdir} from 'node:fs/promises';

export const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const STATIC_ENTRIES=['index.html','admin.html','account.html','manifest.webmanifest','sw.js','css','js','assets'];
const output=path.join(ROOT,'dist');
for(const name of STATIC_ENTRIES)await access(path.join(ROOT,name));
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const name of STATIC_ENTRIES)await cp(path.join(ROOT,name),path.join(output,name),{recursive:true});
const accountConfig=publicAccountConfig();
await writeFile(path.join(output,'js/account-config.js'),'export const accountConfig = Object.freeze('+JSON.stringify(accountConfig)+');\n');
await build({entryPoints:[path.join(ROOT,'js/account-page.js')],outfile:path.join(output,'js/account-page.js'),bundle:true,format:'esm',platform:'browser',target:['safari16','chrome110'],minify:true,legalComments:'linked',plugins:[{name:'public-account-config',setup(bundler){bundler.onResolve({filter:/^\.\/account-config\.js$/},()=>({path:'./account-config.js',external:true}));}}]});
const licenses=path.join(output,'assets/licenses');
await mkdir(licenses,{recursive:true});
const lock=JSON.parse(await readFile(path.join(ROOT,'package-lock.json'),'utf8')),notices=[];
for(const [directory,dependency] of Object.entries(lock.packages||{})){
  if(!directory.startsWith('node_modules/')||dependency.dev)continue;
  const names=await readdir(path.join(ROOT,directory));
  for(const name of names.filter(name=>/^(licen[cs]e|copyrightnotice)(\.|$)/i.test(name))){
    const target=directory.replace(/^node_modules\//,'').replace(/[^a-z0-9-]/gi,'_')+'-'+name+'.txt';
    await cp(path.join(ROOT,directory,name),path.join(licenses,target));
    notices.push(directory+' '+dependency.version+' -> '+target);
  }
}
await writeFile(path.join(licenses,'index.txt'),notices.join('\n')+'\n');
console.log('Statische Anwendung und Kontobereich nach dist/ gebaut. Registrierung: '+(accountConfig.enabled?'freigegeben':'geschlossen')+'.');
