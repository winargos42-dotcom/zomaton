'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto'),{createCanvas,ImageData}=require('@napi-rs/canvas');
const E=require('../engine/engine.js'),P=require('./perspective.js'),O=require('./objects.js'),L=require('./materials.js');
const proof=require('./botanical-paths.json'), W=480,H=360;
const sha=x=>createHash('sha256').update(x).digest('hex');
function hardware(src,hash=''){
 class Node{
  constructor(){this.native=createCanvas(W,H);this.events={};this.style={};this.dataset={};this.value='';this.lastContext=null;}
  get width(){return this.native.width;}set width(v){this.native.width=v;}
  get height(){return this.native.height;}set height(v){this.native.height=v;}
  getContext(){
   const raw=this.native.getContext('2d');
   return new Proxy(raw,{get:(ctx,key)=>key==='drawImage'?((node,...args)=>ctx.drawImage(node.native??node,...args)):typeof ctx[key]==='function'?ctx[key].bind(ctx):ctx[key],set:(ctx,k,v)=>{ctx[k]=v;return true;}});
  }
  addEventListener(n,f){this.events[n]=f;}
  setAttribute(){}
  getBoundingClientRect(){return {left:10,top:10,width:390,height:292.5};}
  select(){} focus(){}
 }
 const elements=new Map(),get=x=>{if(!elements.has(x))elements.set(x,new Node());return elements.get(x);};
 const clipboard=[],loc={href:'file:///test.html'+hash,protocol:'file:',hash};
 const ctx=vm.createContext({
   document:{getElementById:get,createElement:()=>new Node(),addEventListener(){}},
   window:{addEventListener(){}},location:loc,URL,AbortController,matchMedia:()=>({matches:true}),setTimeout,
   history:{replaceState(a,b,u){loc.href=u.href;loc.hash=u.hash;}},
   navigator:{clipboard:{writeText:async value=>clipboard.push(value)}},
   requestAnimationFrame:f=>setImmediate(()=>f(0)),cancelAnimationFrame:clearImmediate,ImageData,
 });
 for(const [,s] of src)vm.runInContext(s,ctx);
 const click=([x,y])=>get('world').events.click({pointerType:'touch',clientX:10+390*x,clientY:10+292.5*y});
 const tick=()=>new Promise(r=>setImmediate(r)),depth=()=>+get('depth').textContent;
 const snapshot=()=>sha(get('world').native.toBuffer('image/png'));
 return {click,tick,depth,snapshot,get,loc,clipboard};
}
test('same leaf tissue and vein open separate botanical volumes, whose actual visible organisms return to macro canopy',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zow3-html-'));
 try{
  const filename=path.join(temp,'test.html');
  execFileSync(process.execPath,[path.join(__dirname,'bundle.cjs'),filename]);
  const html=fs.readFileSync(filename,'utf8');assert.doesNotMatch(html,/<script src=|<link rel="stylesheet"/);
  const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,10);
  const microHashes=[],macroHashes=[];
  assert.equal(proof[0].first.id,proof[1].first.id);
  assert.deepEqual(proof.map(p=>L.key(p.first.material)),['leaf','vein']);
  assert.notDeepEqual(proof[0].first.material.cell,proof[1].first.material.cell);
  for(const p of proof){
   const app=hardware(scripts);assert.equal(app.depth(),0);
   app.click(p.first.screen);assert.match(app.get('status').textContent,new RegExp(L.info(p.first.material)[0]));await app.tick();
   assert.equal(app.depth(),1);assert.equal(app.get('world-kind').textContent,'МИКРОМИР');assert.equal(app.loc.hash,'#route='+p.microId);
   const micro=app.snapshot();microHashes.push(micro);
   app.click(p.second.screen);await app.tick();assert.equal(app.depth(),2);
   assert.equal(app.get('world-kind').textContent,'МАКРОМИР');assert.equal(app.loc.hash,'#route='+p.macroId);
   assert.equal(p.micro.realm,'plant');assert.equal(p.macro.realm,'plant');
   const macro=app.snapshot();macroHashes.push(macro);assert.notEqual(macro,micro);
   const fresh=hardware(scripts,'#route='+p.macroId);
   for(let i=0;i<100&&fresh.depth()!==2;i++)await new Promise(r=>setTimeout(r,6));
   assert.equal(fresh.depth(),2);assert.equal(fresh.snapshot(),macro);
  }
  assert.notEqual(microHashes[0],microHashes[1]);assert.notEqual(macroHashes[0],macroHashes[1]);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('perspective result contains actual recoverable botanical volume geometry',()=>{
 const paths=proof, P=require('./perspective.js');for(const p of paths){
   const micro=E.replay(p.microId,128), macro=E.replay(p.macroId,128);
   const visible=E.mesh(micro).map(o=>o.material),large=E.mesh(macro).map(o=>o.material);
   assert.ok(visible.some(x=>/cell|vein|stroma|membran/.test(x)));
   assert.ok(large.some(x=>/canopy|lamina|giant-root/.test(x)));
   const a=P.render(micro,240,180,E), b=P.render(macro,240,180,E);
   assert.ok(a.counts[3]+a.counts[4]>600);assert.ok(b.counts[3]+b.counts[4]>600);
   assert.notEqual(sha(a.pixels),sha(b.pixels));
 }
});
