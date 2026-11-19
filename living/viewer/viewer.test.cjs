'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const E=require('../engine/engine.js'), M=require('./route.js');
const check=data=>createHash('sha256').update(data).digest('hex');
const script=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const points=[[.61,.21],[.12,.78],[.41,.38],[.99,.98],[.02,.17],[.32,.74],[.68,.83],[.87,.46],[.24,.13],[.55,.57],[.79,.04],[.06,.62]];
function harness(href,{reduced=true,bundle=false}={}){
 const elements=new Map(), frames=new Map(), clipboard=[];
 const loc={href,hash:new URL(href).hash,protocol:new URL(href).protocol};
 let now=0,seq=0;
 class Element {
  constructor(tag){this.tag=tag;this.events={};this.style={};this.dataset={};this.value='';this.width=this.height=448;
   const state={canvas:this,globalAlpha:1,putImageData:r=>{this.data=r.data;},drawImage:src=>{this.data=src.data;}};
   this.context=new Proxy(state,{get:(o,key)=>o[key]??(()=>{})});
  }
  getContext(){return this.context;}
  addEventListener(name,f){this.events[name]=f;}
  setAttribute(){}
  getBoundingClientRect(){return {left:13,top:20,width:390,height:390};}
  focus(){}select(){}
 }
 const get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
 const env={URL,matchMedia:()=>({matches:reduced}),location:loc,history:{replaceState(_a,_b,u){loc.href=u.href;loc.hash=u.hash;}},
  navigator:{clipboard:{writeText:async t=>clipboard.push(t)}},window:{addEventListener(){}},
  document:{hidden:false,getElementById:get,createElement:t=>new Element(t),addEventListener(){}},
  requestAnimationFrame:f=>{frames.set(++seq,f);return seq;},cancelAnimationFrame:id=>frames.delete(id),
  ImageData:class{constructor(data){this.data=data;}}};
 if(bundle){
  const target=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'zlw-viewer-')),'test.html');
  try{
   execFileSync(process.execPath,[path.join(__dirname,'bundle.cjs'),target]);
   const html=fs.readFileSync(target,'utf8');assert.doesNotMatch(html,/<script src=|<link rel="stylesheet"/i);
   const blocks=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(blocks.length,3);
   vm.createContext(env);for(const [,s] of blocks)vm.runInContext(s,env);
  }finally{fs.rmSync(path.dirname(target),{recursive:true,force:true});}
 }else{
  env.ZATLiving=E;env.ZATLivingViewMath=M;vm.runInNewContext(script('viewer.js'),env);
 }
 const pump=async n=>{for(let i=0;i<n;i++){const q=[...frames.values()];frames.clear();now+=120;for(const f of q)f(now);await new Promise(r=>setImmediate(r));}};
 const click=([x,y])=>get('world').events.click({pointerType:'touch',clientX:13+390*x,clientY:20+390*y});
 const depth=()=>+get('depth').textContent;
 return {get,loc,clipboard,pump,click,depth,hash:()=>check(get('world').data)};
}
test('true normalized mobile coordinates remain anchored throughout crop',()=>{
 const p=[42342/65535,12345/65535],b=E.box(...p);
 assert.deepEqual(M.point(306,193,{left:13,top:20,width:586,height:346}),[.5,.5]);
 for(const t of [0,.2,.5,.9,1]){
  const w=M.windowAt(b,t);assert.ok(Math.abs((p[0]-w.x)/w.width-p[0])<1e-8);assert.ok(Math.abs((p[1]-w.y)/w.height-p[1])<1e-8);
 }
});
test('twelve arbitrary touches, fresh shared route, reverse, malformed-route protection',async()=>{
 const h=harness('https://example.test/');
 for(const [i,p] of points.entries()){
  h.click(p);assert.match(h.get('status').textContent,/Точка выбрана/);
  await h.pump(2);assert.equal(h.depth(),i+1);assert.match(h.get('status').textContent,/открыта/);
 }
 await h.get('copy').events.click();const address=h.clipboard.at(-1);
 const newSession=harness(address);await newSession.pump(14);
 assert.equal(newSession.depth(),12);assert.equal(h.hash(),newSession.hash());
 newSession.get('back').events.click();await newSession.pump(14);
 assert.equal(newSession.depth(),11);
 newSession.get('route').value='nonsense';newSession.get('route-form').events.submit({preventDefault(){}});
 assert.equal(newSession.depth(),11);assert.match(newSession.get('status').textContent,/не удалось прочитать/i);
 newSession.get('route').value=h.loc.hash;newSession.get('route-form').events.submit({preventDefault(){}});await newSession.pump(14);
 assert.equal(newSession.depth(),12);assert.equal(newSession.hash(),h.hash());
});
test('animation cancel restores current field and does not commit an address',async()=>{
 const h=harness('https://example.test/',{reduced:false}),before=h.hash();
 h.click(points[0]);await h.pump(3);assert.equal(h.depth(),0);
 h.get('cancel').events.click();await h.pump(7);
 assert.equal(h.depth(),0);assert.equal(h.loc.hash,'');assert.equal(h.hash(),before);assert.match(h.get('status').textContent,/отменён/);
});
test('portable single-file bundle opens and copies ID, no remote sources',async()=>{
 const h=harness('file:///local/living.html',{bundle:true});
 h.click(points[0]);await h.pump(2);assert.equal(h.depth(),1);
 await h.get('copy').events.click();assert.match(h.clipboard.at(-1),/^zlw1:/);
});
