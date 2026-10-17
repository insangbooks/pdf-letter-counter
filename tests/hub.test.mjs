import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
test('hub preview serves PDF page, worker, font and license; blocks uploads', async () => {
  const child = spawn(process.execPath, ['scripts/serve.mjs'], {cwd:fileURLToPath(new URL('../../math-class-hub/',import.meta.url)),env:{...process.env,MATH_HUB_PORT:'4193'},stdio:['ignore','pipe','pipe'],windowsHide:true});
  try {
    await new Promise((resolve,reject) => { const timer=setTimeout(()=>reject(new Error('Preview startup timeout')),5000); child.stdout.once('data',()=>{clearTimeout(timer);resolve();}); child.once('exit',()=>{clearTimeout(timer);reject(new Error('Preview exited early'));}); });
    const base='http://127.0.0.1:4193';
    for(const [path,mime] of [['/','text/html'],['/pdf-counter/','text/html'],['/pdf-counter/vendor/pdf.worker.mjs','text/javascript'],['/pdf-counter/vendor/cmaps/Adobe-Korea1-UCS2.bcmap','application/octet-stream'],['/pdf-counter/vendor/standard_fonts/FoxitSerif.pfb','application/octet-stream'],['/pdf-counter/vendor/LICENSE','text/plain']]) {
      const res=await fetch(base+path); assert.equal(res.status,200,path); assert.ok(res.headers.get('content-type').startsWith(mime));
    }
    assert.equal((await fetch(base+'/pdf-counter/',{method:'POST',body:'SYNTHETIC'})).status,405);
    const page=await (await fetch(base+'/pdf-counter/')).text();assert.match(page, /PDF의 글자 수/);
  } finally { child.kill(); }
});
test('optional PDF navigation is passed through instead of replaced with hub HTML', async () => {
  const handlers={};let matched='';
  const self={registration:{scope:'https://synthetic.invalid/'},location:{origin:'https://synthetic.invalid'},addEventListener:(name,fn)=>{handlers[name]=fn;}};
  const caches={open:async()=>({match:async url=>{matched=String(url);return {ok:true};}})};
  const source=await readFile(new URL('../../math-class-hub/dist/sw.js',import.meta.url),'utf8');
  const fetchTool=async request=>{matched=request.url;return {ok:true};};
  vm.runInNewContext(source,{self,caches,URL,Request,fetch:fetchTool});
  let response;
  handlers.fetch({request:{method:'GET',url:'https://synthetic.invalid/pdf-counter/',mode:'navigate'},respondWith:promise=>{response=promise;}});
  await response;assert.equal(matched,'https://synthetic.invalid/pdf-counter/');
});
