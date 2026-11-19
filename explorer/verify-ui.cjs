'use strict';
const {readFileSync}=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict'), {createHash}=require('node:crypto'), G=require('./geometry.cjs');
const source=readFileSync(require('node:path').join(__dirname,'ZomATON_Geometry_Offline.html'),'utf8');
assert.ok(!/(?:src|href)=["']https?:/.test(source));
const js=source.match(/<script>([\s\S]*?)<\/script>/)[1], elements={};
for(const [,id] of source.matchAll(/\bid="([^"]+)"/g))elements[id]={attrs:{},events:{},dataset:{},style:{},
 addEventListener(type,fn){this.events[type]=fn},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},
 getBoundingClientRect:()=>({width:256,height:256,left:0,top:0})};
let rendered;
elements.view.getContext=()=>({
createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
putImageData:p=>rendered=createHash('sha256').update(p.data).digest('hex')
});
const file={hash:''},events={};const globals={document:{getElementById:id=>elements[id]},location:file,
 history:{replaceState(a,b,hash){file.hash=hash}},requestAnimationFrame:fn=>fn(),addEventListener:(t,f)=>events[t]=f};
globals.window=globals;vm.runInNewContext(js,globals);
const [root,c,d]=[G.ROOT,G.descend(G.ROOT,.1875,.5625),G.descend(G.descend(G.ROOT,.1875,.5625),.4375,.59375)];
assert.equal(elements.address.value,root);
elements.view.events.click({clientX:48,clientY:144});assert.equal(elements.address.value,c);
elements.view.events.click({clientX:112,clientY:152});assert.equal(elements.address.value,d);
assert.equal(rendered,createHash('sha256').update(G.render(d)).digest('hex'));assert.equal(file.hash,'#zp1='+encodeURIComponent(d));
elements.back.events.click();assert.equal(elements.address.value,c);
elements.reset.events.click();assert.equal(elements.address.value,root);
file.hash='#zp1='+encodeURIComponent(d);events.hashchange();assert.equal(elements.address.value,d);
assert.equal(rendered,createHash('sha256').update(G.render(d)).digest('hex'));
elements.restore.value='not-a-route';elements['route-form'].events.submit({preventDefault(){}});assert.ok(elements.error.textContent);
assert.equal(elements.address.value,d);
console.log('PASS inline document runtime: two clicks, matching native pixels, back, reset, exact link replay, malformed entry leaves view unchanged.');
