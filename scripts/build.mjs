import {cp,mkdir,rm,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const ROOT=fileURLToPath(new URL('../',import.meta.url));
export const STATIC_ENTRIES=['index.html','admin.html','css','js','assets'];
const output=path.join(ROOT,'dist');
for(const name of STATIC_ENTRIES)await access(path.join(ROOT,name));
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const name of STATIC_ENTRIES)await cp(path.join(ROOT,name),path.join(output,name),{recursive:true});
console.log('Statische Anwendung nach dist/ kopiert. Keine Installation und kein Bundler erforderlich.');
