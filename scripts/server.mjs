import http from 'node:http';
import {createReadStream} from 'node:fs';
import {realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const PROJECT_ROOT=fileURLToPath(new URL('../',import.meta.url));
const CONTENT_TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
const within=(root,file)=>file===root||file.startsWith(root+path.sep);

/** Static development server. Only browser application files are exposed. */
export async function createAppServer({directory=PROJECT_ROOT}={}){
  const root=await realpath(directory);
  return http.createServer(async(req,res)=>{
    const send=(status,message)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:message);};
    if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');send(405,'Method not allowed');return;}
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{send(400,'Invalid URL');return;}
    if(pathname.includes('\0')||pathname.includes('\\')){send(400,'Invalid path');return;}
    const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/,''),parts=relative.split('/');
    const entry=['index.html','admin.html','manifest.webmanifest','sw.js'].includes(relative);
    const asset=['css','js','assets'].includes(parts[0])&&parts.length>1&&parts.every(p=>p&&!p.startsWith('.'));
    if(!entry&&!asset){send(404,'Not found');return;}
    const extension=path.extname(relative).toLowerCase();
    if(!Object.hasOwn(CONTENT_TYPES,extension)){send(404,'Not found');return;}
    try{
      const candidate=await realpath(path.resolve(root,relative));
      if(!within(root,candidate)){send(404,'Not found');return;}
      const info=await stat(candidate);
      if(!info.isFile()){send(404,'Not found');return;}
      res.writeHead(200,{'Content-Type':CONTENT_TYPES[extension],'Content-Length':info.size,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
      if(req.method==='HEAD'){res.end();return;}
      const stream=createReadStream(candidate);stream.on('error',()=>res.destroy());stream.pipe(res);
    }catch(error){if(!['ENOENT','ENOTDIR','EACCES'].includes(error.code))console.error('Static file error:',error.code||'unknown');send(404,'Not found');}
  });
}

export function serverOptions(args=process.argv.slice(2),env=process.env){
  const options={host:env.HOST||'127.0.0.1',port:env.PORT||'4173',directory:PROJECT_ROOT};
  for(let i=0;i<args.length;i++){
    const flag=args[i];
    // Preview hosts pass this Vite-compatible flag. This server never changes a busy port.
    if(flag==='--strictPort')continue;
    if(!['--host','--port','--directory'].includes(flag)||!args[i+1]||args[i+1].startsWith('--'))throw Error('Aufruf: npm run dev -- [--host 0.0.0.0] [--port 4173] [--directory dist]');
    const value=args[++i];options[flag.slice(2)]=flag==='--directory'?path.resolve(PROJECT_ROOT,value):value;
  }
  options.port=Number(options.port);
  if(!Number.isInteger(options.port)||options.port<0||options.port>65535)throw Error('PORT muss zwischen 0 und 65535 liegen.');
  return options;
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{
    const options=serverOptions(),server=await createAppServer(options);
    server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port belegt. Wähle z. B. npm run dev -- --port 4174.':error.message);process.exitCode=1;});
    server.listen(options.port,options.host,()=>{
      const address=server.address(),host=options.host==='0.0.0.0'?'localhost':options.host.includes(':')?'['+options.host+']':options.host;
      console.log('BuyMe: http://'+host+':'+address.port+'/');
      console.log('Lokale Testplattform gestartet. Beenden: Strg+C.');
    });
  }catch(error){console.error(error.message);process.exitCode=1;}
}
