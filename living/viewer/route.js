(function(root,f){const x=f();if(typeof module==='object'&&module.exports)module.exports=x;else root.ZATLivingViewMath=x;})(globalThis,()=>{
'use strict';
const sat=v=>Math.max(0,Math.min(1,v)), smooth=v=>{v=sat(v);return v*v*(3-2*v)};
function point(x,y,b){
 if(![x,y,b.left,b.top,b.width,b.height].every(Number.isFinite)||b.width<=0||b.height<=0)throw Error('Нет видимой области');
 return [sat((x-b.left)/b.width),sat((y-b.top)/b.height)];
}
function windowAt(b,t){t=smooth(t);return{x:t*b.x,y:t*b.y,width:1-t+t*b.width,height:1-t+t*b.height};}
function read(input,engine){
 let p=input.trim();if(!p.startsWith(engine.VERSION+':')){
  if(!p.startsWith('#'))p=new URL(p).hash;
  if(!p.startsWith('#route='))throw Error('В ссылке нет пути');
  p=decodeURIComponent(p.slice(7));
 }
 engine.parse(p);return p;
}
return Object.freeze({sat,smooth,point,windowAt,read});
});
