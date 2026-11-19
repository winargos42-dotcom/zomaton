/* ZomATON terrain vertical slice. Pure local geometry, no images, model, or mutable seeds. */
(function(g,f){const x=f();if(typeof module==='object'&&module.exports)module.exports=x;else g.ZATMacroMicro=x;})(globalThis,()=>{
'use strict';
const ROOT_HASH='7e62552bea7203e6fc9c3c21a481b995e6847dac9f42135fd1a3a665885e99b1';
const ROOT='zmm1:'+ROOT_HASH+':-', LIMIT=6, Q=65535, VERSION='zmm1';
const sat=x=>Math.max(0,Math.min(1,x));
const u16=x=>Math.round(sat(x)*65535);
const ease=x=>{x=sat(x);return x*x*(3-2*x)};
function hash(x,y,s){
 let z=(Math.imul(x,374761393)^Math.imul(y,668265263)^s)>>>0;
 z=Math.imul(z^(z>>>13),1274126177);return ((z^(z>>>16))>>>0)/4294967296;
}
function seed(s){let z=2166136261;for(let i=0;i<s.length;i++)z=Math.imul(z^s.charCodeAt(i),16777619);return z>>>0;}
function n2(x,y,s){
 const i=Math.floor(x),j=Math.floor(y),u=ease(x-i),v=ease(y-j);
 const a=hash(i,j,s),b=hash(i+1,j,s),c=hash(i,j+1,s),d=hash(i+1,j+1,s);
 return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}
function fbm(x,y,s){return .56*n2(x,y,s)+.27*n2(x*2.12+19,y*2.12+13,s^345544)+.12*n2(x*5.1,y*5.1,s^2597618)+.05*n2(x*12.7,y*12.7,s^94161);}
function q(x){if(!Number.isFinite(x)||x<0||x>1)throw Error('Координата вне [0,1]');return Math.round(x*Q);}
function encode(p){
 if(p.length>LIMIT)throw Error('Предел прототипа');
 return 'zmm1:'+ROOT_HASH+':'+(p.length?p.map(([x,y])=>x.toString(16).padStart(4,'0')+y.toString(16).padStart(4,'0')).join('.'):'-');
}
function parse(id){
 if(typeof id!=='string'||id.length>128||!id.startsWith('zmm1:'+ROOT_HASH+':'))throw Error('Неизвестный корень или формат');
 const b=id.slice(ROOT.length-1);if(b==='-')return [];
 if(!/^[a-f0-9]{8}(\.[a-f0-9]{8}){0,5}$/.test(b))throw Error('Повреждённый маршрут');
 const data=b.split('.').map(z=>[parseInt(z.slice(0,4),16),parseInt(z.slice(4),16)]);
 return data.map(([x,y])=>[x/Q,y/Q]);
}
function coordinateBox(x,y){return {x:.75*x,y:.75*y,width:.25,height:.25};}
function box(x,y){return coordinateBox(q(x)/Q,q(y)/Q);}
function ancestor(id){const s=parse(id);return encode(s.slice(0,-1).map(([x,y])=>[q(x),q(y)]));}
function sizeOK(n){if(!Number.isInteger(n)||n<32||n>256)throw Error('Размер мира: 32…256');}
function checkParent(w){
 if(!w||typeof w.id!=='string')throw Error('Нужен родительский мир');
 sizeOK(w.size);
 if(!(w.heights instanceof Uint16Array)||w.heights.length!==w.size*w.size||parse(w.id).length!==w.depth)throw Error('Некорректная геометрия родителя');
}
function sampleMap(field,n,u,v) {
 const x=Math.max(0,Math.min(n-1,u*n-.5)), y=Math.max(0,Math.min(n-1,v*n-.5));
 const i=Math.floor(x),j=Math.floor(y),a=x-i,b=y-j,r=Math.min(n-1,i+1),s=Math.min(n-1,j+1);
 return Math.round((field[j*n+i]*(1-a)+field[j*n+r]*a)*(1-b)+(field[s*n+i]*(1-a)+field[s*n+r]*a)*b);
}
function root(size=128){
 sizeOK(size);
 const heights=new Uint16Array(size*size),material=new Uint8Array(size*size),base=new Float64Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const re=-.743643887+((x+.5)/size-.5)*.031,im=.131825904+((y+.5)/size-.5)*.031;
  let a=0,b=0,k=0;for(;k<270;k++){const n=a*a-b*b+re;b=2*a*b+im;a=n;if(a*a+b*b>256)break;}
  const i=y*size+x;
  // The same focused Genesis Mandelbrot lens, used here as an elevation field.
  base[i]=k===270?.115:.26+.62*(1-1/(1+(k+1)/43));
  heights[i]=u16(base[i]);material[i]=k===270?0:1;
 }
 return {id:ROOT,depth:0,size,kind:'genesis',heights,material,source:null,window:null};
}
function bounds(f){
 const copy=f.slice();copy.sort();
 return [copy[Math.floor(copy.length*.13)],copy[Math.floor(copy.length*.89)]];
}
function gradient(source,n,x,y){
 const at=(a,b)=>source[Math.max(0,Math.min(n-1,b))*n+Math.max(0,Math.min(n-1,a))];
 return [(at(x+1,y)-at(x-1,y))/65535,(at(x,y+1)-at(x,y-1))/65535];
}
function facet(x,y,s){
 const ix=Math.floor(x),iy=Math.floor(y);let a=Infinity,b=Infinity,kx=0,ky=0;
 for(let h=-1;h<=1;h++)for(let z=-1;z<=1;z++){
  const i=ix+z,j=iy+h;
  const dx=x-i-.18-.64*hash(i,j,s),dy=y-j-.18-.64*hash(i,j,s^9847),d=Math.abs(dx)+.85*Math.abs(dy);
  if(d<a){b=a;a=d;kx=dx;ky=dy;}else if(d<b)b=d;
 }
 return {ridge:sat(1-(b-a)*3.4),face:sat(1-a),orient:sat(.5+kx*.34-ky*.52)};
}
function build(parent,x,y) {
 checkParent(parent);
 const xq=q(x),yq=q(y),path=parse(parent.id).map(([a,b])=>[q(a),q(b)]);
 if(path.length>=LIMIT)throw Error('Предел прототипа: 6 погружений');
 const id=encode([...path,[xq,yq]]),window=coordinateBox(xq/Q,yq/Q),depth=path.length+1,size=parent.size,Z=size*size;
 const source=new Uint16Array(Z),heights=new Uint16Array(Z),material=new Uint8Array(Z),random=seed(id);
 for(let r=0;r<size;r++)for(let c=0;c<size;c++)source[r*size+c]=sampleMap(parent.heights,size,
   window.x+(c+.5)*window.width/size,window.y+(r+.5)*window.height/size);
 const [low,high]=bounds(source),range=Math.max(5800,high-low),detail=new Float64Array(Z),blend=new Float64Array(Z);
 const macro=(depth%2===1);
 let crystal=0;
 for(let r=0;r<size;r++)for(let c=0;c<size;c++){
  const j=r*size+c,u=(c+.5)/size,v=(r+.5)/size,h=source[j]/65535;
  const d=Math.min(c,r,size-1-c,size-1-r),w=ease((d-1)/Math.max(4,size*.091));blend[j]=w;
  const s=(source[j]-low)/range, [gx,gy]=gradient(source,size,c,r);
  if(macro){
   const rough=fbm(u*7+2.8*s,v*7+1.9*s,random)-.5;
   const contour=.35-(s*.34+(n2(u*4,v*4,random^11031)-.5)*.24);
   const canyon=Math.max(0,1-Math.abs(contour)/.095);
   detail[j]=sat(h + .12*(sat(s)-.45) + (.05+.14*sat(s))*rough - .14*canyon*canyon);
  } else {
   // Cells become genuinely raised/faceted crystals; the local material/grade warps
   // crystal placement. Persistent low inherited troughs remain channels between them.
   const warp=fbm(u*9,v*9,random)-.5;
   const m=parent.material[(Math.min(size-1,Math.floor((window.y+v*window.height)*size))*size)
       +Math.min(size-1,Math.floor((window.x+u*window.width)*size))] || 0;
   const wet=(m===2||m===3)? .48:1;
   const f=facet(u*11+s*5+warp*2.8+gy*21,v*11-s*3+warp*1.7-gx*21,random);
   const vein=Math.max(0,1-Math.abs(.53-s+(n2(u*8,v*8,random^443)-.5)*.2)*5);
   crystal=wet*(f.face*f.orient*.27+f.ridge*.11+vein*.055);
   detail[j]=sat(h + crystal - .066*(1-f.face));
   material[j]=wet<1?3:(f.ridge>.72?6:5);
  }
 }
 if(macro){
  // Deterministic downhill drainage on this same carved height field.
  // Flow affects subsequent elevations, not only their colors.
  const rank=Uint32Array.from({length:Z},(_,i)=>i);
  rank.sort((a,b)=>detail[b]-detail[a]||a-b);
  const flow=new Uint32Array(Z);flow.fill(1);
  for(const j of rank){
   const x=j%size,y=Math.floor(j/size);let lower=-1,delta=0;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const x1=x+dx,y1=y+dy;if((!dx&&!dy)||x1<0||x1>=size||y1<0||y1>=size)continue;
    const k=y1*size+x1,d=(detail[j]-detail[k])*(dx&&dy?.70710678:1);
    if(d>delta){delta=d;lower=k;}
   }
   if(lower>=0)flow[lower]+=flow[j];
  }
  const cutoff=Math.max(5,Math.floor(size*.075));
  for(let j=0;j<Z;j++){
   const f=flow[j], river=f>=cutoff;
   if(river)detail[j]=Math.max(0,detail[j]-.082*sat((f-cutoff+1)/(size*.58)));
   material[j]=river?2:(detail[j]<.21?3:4);
  }
 }
 for(let j=0;j<Z;j++){
  const h=source[j]/65535,w=blend[j];heights[j]=u16(h+(detail[j]-h)*w);
 }
 return {id,depth,size,kind:macro?'macro':'micro',heights,material,source,window};
}
function replay(id,size=128){let world=root(size);for(const coords of parse(id))world=build(world,...coords);return world;}
const PALETTES={
 genesis:[[6,15,32],[23,83,113],[35,168,162],[236,191,107]],
 macro:[[8,26,40],[26,89,86],[105,152,111],[250,209,139]],
 micro:[[13,19,39],[53,68,125],[42,194,189],[239,215,255]],
};
function shade(w){
 checkParent(w);
 const n=w.size,out=new Uint8ClampedArray(n*n*4),table=PALETTES[w.kind];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=y*n+x,[gx,gy]=gradient(w.heights,n,x,y),h=w.heights[i]/65535;
  const t=sat((h-.10)*1.77)*3,a=Math.min(2,Math.floor(t)),r=t-a;
  const b=table[a],c=table[a+1],light=.85+.40*sat(.45+(gx+gy)*6),m=w.material[i],o=i*4;
  for(let k=0;k<3;k++){
   const terrain=(b[k]+r*(c[k]-b[k]))*light;
   let v=terrain;
   if(w.kind==='macro'&&(m===2||m===3)){const strength=m===2?.39:.32;v=terrain*(1-strength)+[51,166,178][k]*strength;}
   if(w.kind==='micro'&&m===6)v=terrain*.73+[200,231,248][k]*.27;
   out[o+k]=Math.round(v);
  }
  out[o+3]=255;
 }
 return out;
}
return Object.freeze({ROOT,VERSION,LIMIT,root,descend:build,replay,parse,ancestor,box,sampleMap,shade});
});
