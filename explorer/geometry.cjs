(function(g,f){if(typeof module==='object'&&module.exports){
 const fs=require('node:fs'),vm=require('node:vm');const s={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'core-zp1.js'),'utf8'),s);module.exports=f(s.window.ZAT);
}else g.ZATGeom=f(window.ZAT);})(globalThis,Z=>{
'use strict';
const SPAN=3.25, SCALE=4, LIMIT=15, BUDGET=104, N=256;
const ramp=[[0,7,15,28],[20,11,37,64],[39,12,78,99],[61,16,130,139],[89,79,190,164],[111,228,208,139],[132,250,160,61],[164,170,72,82],[191,87,41,114],[224,22,31,73],[255,7,15,28]];
function camera(id){
 if(typeof id!=='string'||id.length>350)throw Error('Неверный адрес');
 const p=Z.parse(id);
 if(p.length>LIMIT)throw Error('Предел глубины');
 let x=0,y=0,s=1;
 for(const seg of p){
  const u=parseInt(seg.slice(0,8),16)/4294967296,v=parseInt(seg.slice(8),16)/4294967296,next=s/SCALE;
  x+=(u-.5)*SPAN*(s-next);y+=(v-.5)*SPAN*(s-next);s=next;
 }
 return {id,depth:p.length,x,y,s,span:SPAN*s};
}
function point(c,u,v){return [c.x+(u-.5)*c.span,c.y+(v-.5)*c.span];}
function box(u,v){return {x:.75*u,y:.75*v,width:.25,height:.25};}
function orbit(re,im){let x=0,y=0,i=0,r=0;for(;i<BUDGET;i++){
 const n=x*x-y*y+re;y=2*x*y+im;x=n;r=x*x+y*y;if(r>256)break;
 }return {i,r};}
function rgb(i,r){
 if(i===BUDGET)return [4,9,19];
 const smooth=i+2-Math.log2(Math.log(Math.sqrt(r)));
 const phase=Math.min(255,Math.floor((Math.max(0,smooth)*8.3)%255));
 let k=1;while(ramp[k][0]<phase)k++;
 const a=ramp[k-1],b=ramp[k];const f=(phase-a[0])/(b[0]-a[0]);
 return [1,2,3].map(c=>Math.round(a[c]+(b[c]-a[c])*f));
}
function rows(out,c,n,start,end){
 for(let y=start;y<end;y++){
  const im=c.y+((y+.5)/n-.5)*SPAN*c.s;
  for(let x=0;x<n;x++){
   const re=c.x+((x+.5)/n-.5)*SPAN*c.s,{i,r}=orbit(re,im),j=4*(y*n+x),color=rgb(i,r);
   out[j]=color[0];out[j+1]=color[1];out[j+2]=color[2];out[j+3]=255;
  }
 }
 return out;
}
function render(id,n=N){if(!Number.isInteger(n)||n<1||n>2048)throw Error('Неверный размер');return rows(new Uint8ClampedArray(n*n*4),camera(id),n,0,n);}
return Object.freeze({ROOT:Z.ROOT,descend:Z.descend,ancestor:Z.ancestor,parse:Z.parse,camera,point,box,orbit,rows,render,N,SCALE,LIMIT,BUDGET,FRAME_VERSION:'geometry-a1'});
});
