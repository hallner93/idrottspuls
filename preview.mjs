import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const base=path.join(path.dirname(fileURLToPath(import.meta.url)),'web');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const port=Number(process.env.IDROTTSPULS_PORT||4173);
const server=http.createServer(async(req,res)=>{
  try{
    const requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(base,'.'+(requestPath==='/'?'/index.html':requestPath));
    if(!file.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    if(!(await stat(file)).isFile()){res.writeHead(404);res.end();return;}
    const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end('Filen hittades inte.');}
});
server.listen(port,'127.0.0.1',()=>process.stdout.write(`Idrottspuls: http://localhost:${port}\nStoppa med Ctrl+C.\n`));
