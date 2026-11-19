(function(root,f){
 const api=f();if(typeof module==='object'&&module.exports)module.exports=api;else root.ZomatonViewerMath=api;
})(globalThis,()=>{
 'use strict';
 const MAX=2, FIELD_SIZE=224;
 const sat=v=>Math.max(0,Math.min(1,v));
 const smooth=v=>{const n=sat(v);return n*n*(3-2*n);};
 function pointFromRect(x,y,r){
  if(![x,y,r.left,r.top,r.width,r.height].every(Number.isFinite)||r.width<=0||r.height<=0)throw Error('Нет видимой области');
  return [sat((x-r.left)/r.width),sat((y-r.top)/r.height)];
 }
 function windowAt(b,t){
  t=smooth(t);
  return {x:b.x*t,y:b.y*t,width:1-(1-b.width)*t,height:1-(1-b.height)*t};
 }
 function parseRoute(text,engine){
  let p=text.trim();if(!p.startsWith(engine.VERSION+':')){
   if(!p.startsWith('#'))p=new URL(p).hash;
   if(!p.startsWith('#route='))throw Error('В ссылке нет маршрута');
   p=decodeURIComponent(p.slice(7));
  }
  const steps=engine.parse(p);if(steps.length>MAX)throw Error('Пилот принимает два погружения');
  return p;
 }
 return Object.freeze({MAX,FIELD_SIZE,sat,smooth,pointFromRect,windowAt,parseRoute});
});
