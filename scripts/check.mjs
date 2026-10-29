import {readFile,readdir,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
async function files(directory){const result=[];for(const entry of await readdir(directory,{withFileTypes:true})){const name=path.join(directory,entry.name);if(entry.isDirectory())result.push(...await files(name));else result.push(name);}return result;}
let count=0;
for(const file of [path.join(root,'sw.js'),...await files(path.join(root,'js')),...await files(path.join(root,'scripts')),...await files(path.join(root,'tests'))]){
  if(!/\.(mjs|js)$/.test(file))continue;
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)throw Error(result.stderr||'Syntaxprüfung fehlgeschlagen: '+file);
  count++;
}
for(const name of ['index.html','admin.html']){
  const html=await readFile(path.join(root,name),'utf8');
  for(const match of html.matchAll(/(?:src|href)="(\.\/[^"#?]+)"/g)){
    const file=path.resolve(root,match[1]);if(!file.startsWith(root))throw Error('Ungültiger Assetpfad: '+match[1]);
    if(!(await stat(file)).isFile())throw Error('Asset fehlt: '+match[1]);
  }
}
for(const file of await files(path.join(root,'js'))){
  if(!file.endsWith('.js'))continue;
  const source=await readFile(file,'utf8');
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.{1,2}\/[^'"\n]+)['"]/g)){
    const target=path.resolve(path.dirname(file),match[1]);
    if(!(await stat(target)).isFile())throw Error('Modul fehlt: '+match[1]);
  }
}
const translations=spawnSync(process.execPath,[path.join(root,'scripts/build-translations.mjs'),'--check'],{cwd:root,stdio:'inherit'});
if(translations.status!==0)process.exit(translations.status||1);
console.log(count+' JavaScript-Dateien sowie HTML-Assets und Modulimporte geprüft.');
