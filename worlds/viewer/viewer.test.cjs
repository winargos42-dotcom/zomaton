'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const E=require('../engine/engine.js'),V=require('./route.js');
const bytes=f=>createHash('sha256').update(f).digest('hex');
const script=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const points=[[.61,.21],[.12,.78]];
function harness(href,{reduced=true,bundled=false}={}){
 const elements=new Map(),raf=[],calls=[],clipboard=[];
 const loc={href,hash:new URL(href).hash,protocol:new URL(href).protocol};
 let now=0;
 class Element{
  constructor(tag){this.tag=tag;this.events={};this.style={};this.dataset={};this.value='';this.width=448;this.height=448;
   this.context={globalAlpha:1,putImageData:({data})=>{this.data=data;},drawImage:(src,...args)=>{
    calls.push({from:src.tag,args,alpha:this.context.globalAlpha});
    if(args.length===4)this.data=src.data;
   }};
  }
  getContext(){return this.context;}
  addEventListener(name,f){this.events[name]=f;}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(){}
  getBoundingClientRect(){return {left:13,top:20,width:400,height:400};}
  select(){}
  focus(){}
 }
 const get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
 const env={URL,console,matchMedia:()=>({matches:reduced}),location:loc,
   history:{replaceState(a,b,u){loc.href=u.href;loc.hash=u.hash;}},
   navigator:{clipboard:{writeText:async t=>clipboard.push(t)}},
   window:{addEventListener(){}},document:{getElementById:get,createElement:t=>new Element(t),addEventListener(){}},
   requestAnimationFrame:f=>raf.push(f),ImageData:class{constructor(data){this.data=data;}}};
 if(!bundled){env.ZATMacroMicro=E;env.ZomatonViewerMath=V;vm.runInNewContext(script('viewer.js'),env);}
 else{
   const target=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'zmm-viewer-')),'test.html');
   try{
    execFileSync(process.execPath,[path.join(__dirname,'bundle.cjs'),target]);
    const html=fs.readFileSync(target,'utf8');
    assert.doesNotMatch(html,/<script src=|<link rel="stylesheet"/i);
    const blocks=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(blocks.length,3);vm.createContext(env);for(const [,s] of blocks)vm.runInContext(s,env);
   }finally{fs.rmSync(path.dirname(target),{recursive:true,force:true});}
 }
 async function pump(count=1){
  for(let i=0;i<count;i++){
   const q=raf.splice(0);now+=120;for(const fn of q)fn(now);
   await new Promise(r=>setImmediate(r));
  }
 }
 function click([x,y]){get('world').events.click({clientX:13+400*x,clientY:20+400*y});}
 const state=()=>get('depth').textContent;
 const hash=()=>bytes(get('world').data);
 return {get,loc,clipboard,click,pump,state,hash,calls};
}
test('crop follows exact clicked point in the same screen position from start to end',()=>{
 const p=[49151/65535,12345/65535];
 assert.deepEqual(V.pointFromRect(313,70,{left:13,top:20,width:400,height:400}),[.75,.125]);
 const b=E.box(...p);
 for(const k of [0,.25,.7,1]){
  const w=V.windowAt(b,k);
  assert.ok(Math.abs((p[0]-w.x)/w.width-p[0])<1e-9);
  assert.ok(Math.abs((p[1]-w.y)/w.height-p[1])<1e-9);
 }
});
test('two arbitrary clicks, copy, fresh URL rebuild, paste, rejection and reverse',async()=>{
 const h=harness('https://example.test/');
 const r=E.root(V.FIELD_SIZE), m=E.descend(r,...points[0]), n=E.descend(m,...points[1]);
 assert.equal(h.hash(),bytes(E.shade(r)));
 h.click(points[0]);await h.pump(2);assert.match(h.state(),/МАКРОМИР/);assert.equal(h.hash(),bytes(E.shade(m)));
 h.click(points[1]);await h.pump(2);assert.match(h.state(),/МИКРОМИР/);assert.equal(h.hash(),bytes(E.shade(n)));
 h.click([.8,.3]);await h.pump(2);assert.equal(h.get('trail').children.length,3);
 await h.get('copy').events.click();
 const url=h.clipboard.at(-1);
 const re=harness(url);assert.equal(re.hash(),h.hash());assert.match(re.state(),/МИКРОМИР/);
 re.get('back').events.click();await re.pump(2);assert.equal(re.hash(),bytes(E.shade(m)));
 re.get('route').value='bad route';re.get('route-form').events.submit({preventDefault(){}});
 assert.match(re.get('status').textContent,/не распознан/);assert.equal(re.hash(),bytes(E.shade(m)));
 re.get('route').value=n.id;re.get('route-form').events.submit({preventDefault(){}});await re.pump(3);
 assert.equal(re.hash(),bytes(E.shade(n)));
});
test('real animation requests progressively tighter crop; cancel restores uncommitted panorama',async()=>{
 const h=harness('https://example.test/',{reduced:false}),before=h.hash();
 h.click(points[0]);await h.pump(4);
 assert.ok(h.calls.some(x=>x.args.length===8&&x.args[2]<V.FIELD_SIZE));
 h.get('cancel').events.click();await h.pump(8);
 assert.equal(h.hash(),before);assert.match(h.state(),/ПАНОРАМА/);assert.equal(h.loc.hash,'');
});
test('offline HTML runs all scripts in order and shares a portable route without file URL',async()=>{
 const h=harness('file:///local/zmm.html',{bundled:true});assert.match(h.state(),/ПАНОРАМА/);
 h.click(points[0]);await h.pump(2);assert.match(h.state(),/МАКРОМИР/);
 await h.get('copy').events.click();assert.match(h.clipboard.at(-1),/^zmm1:/);
});
