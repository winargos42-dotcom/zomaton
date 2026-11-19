/* ZomATON diverse topology v1; surface primitives are generated offline from the clicked ROI. */
(function(g,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./living-baseline.js'));else g.ZATDiverse=f(g.ZATLiving);})(globalThis,B=>{
'use strict';
const P='zdw1:',L='zlw1:',newID=x=>P+x.slice(L.length), oldID=x=>{
 if(typeof x!=='string'||!x.startsWith(P))throw Error('Нужен адрес zdw1');return L+x.slice(P.length);
};
const ROOT=newID(B.ROOT),SIZE=B.SIZE,Q=65535;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),sat=x=>clamp(x,0,1),mix=(a,b,t)=>a+(b-a)*t;
const u16=x=>Math.round(sat(x)*Q);
const ease=x=>{x=sat(x);return x*x*(3-2*x)};
function rnd(x,y,s){let z=Math.imul(x,374761393)^Math.imul(y,668265263)^s;z=Math.imul(z^(z>>>13),1274126177);return ((z^(z>>>16))>>>0)/4294967296;}
const read=(w,x,y)=>B.sampleMap(w.heights,w.size,x,y)/Q;
const box=B.box;
function exactSample(h,n,u,v){return B.sampleMap(h,n,u,v)/Q;}
function dist(x,y,a,b){
 const vx=b[0]-a[0],vy=b[1]-a[1],t=sat(((x-a[0])*vx+(y-a[1])*vy)/(vx*vx+vy*vy));
 return Math.hypot(x-a[0]-vx*t,y-a[1]-vy*t);
}
function polyDist(x,y,lines){
 let d=Infinity;for(const path of lines)for(let i=1;i<path.length;i++)d=Math.min(d,dist(x,y,path[i-1],path[i]));return d;
}
const titles={genesis:'Genesis №0',cavern:'Своды под корой',archipelago:'Острова над лагуной','forest-ravine':'Лес над развилкой'};
const PALETTE={
 cavern:[[12,19,30],[44,53,62],[98,99,111],[181,151,119]],
 archipelago:[[11,48,72],[25,122,131],[90,151,92],[237,208,144]],
 'forest-ravine':[[14,32,47],[46,87,62],[99,126,77],[170,166,106]],
};
function habitat(base,x,y){
 const p=base.source, n=base.size;
 let wet=0,g=0;
 for(let j=0;j<p.length;j++){wet+=p[j]<Q*.32;if(j%n)g+=Math.abs(p[j]-p[j-1]);}
 const damp=wet/p.length, rough=sat(g/(p.length*Q)*11);
 const score=x+.047*(y-.5)+.025*(damp-.5)+.020*(rough-.5);
 return {dampness:damp,roughness:rough,score,structure:score<.465?'cavern':score<.535?'archipelago':'forest-ravine'};
}
function featureBundle(overrides={}){
 return {waterPlane:null,ceilingGrid:null,caveMask:null,roofOpenings:[],caveWalls:[],
  islands:[],trees:[],channel:[],channelWater:null,...overrides};
}
function cavern(base){
 const n=base.size,p=base.source,h=new Uint16Array(n*n),m=new Uint8Array(n*n),ceilingGrid=new Float32Array(n*n),caveMask=new Uint8Array(n*n);
 ceilingGrid.fill(NaN);
 const s=base.seed, shift=(rnd(1,9,s)-.5)*.082;
 const rooms=[[.48+shift,.48,.37,.37],[.748,.28+shift,.197,.19],[.252,.25-shift,.177,.18]];
 const passages=[[[.49,.47],[.43+shift,.73],[.52,1.08]],[[.48,.48],[.748,.28+shift]],[[.48,.48],[.252,.25-shift]]];
 const roofOpenings=[{x:.26+shift,y:.24,r:.068},{x:.72-shift,y:.319,r:.063},{x:.49,y:.658+shift,r:.055}];
 for(let j=0;j<n*n;j++){
  const x=(j%n+.5)/n,y=(Math.floor(j/n)+.5)/n, inherit=p[j]/Q;
  const inside=Math.min(...rooms.map(([a,b,c,d])=>Math.hypot((x-a)/c,(y-b)/d)))<1+(.038*Math.sin(y*26+x*19));
  const tunnel=polyDist(x,y,passages)<.073;
  if(inside||tunnel){
   caveMask[j]=1;m[j]=4;
   const floor=.135+inherit*.14+.025*Math.sin(x*31+y*22+inherit*7);
   h[j]=u16(floor);
   const drilled=roofOpenings.some(({x:a,y:b,r})=>Math.hypot(x-a,y-b)<r*(.92+.12*Math.sin(x*45+3*y)));
   if(!drilled)ceilingGrid[j]=.575+inherit*.17+.045*Math.sin(x*16-y*19)+.032*Math.sin(x*42+y*47);
  }else{
   h[j]=u16(.53+inherit*.21+.038*Math.sin(x*68+y*32));m[j]=6;
  }
 }
 const caveWalls=[];
 for(let j=0;j<n*n;j++)if(caveMask[j]){
  const x=j%n,y=Math.floor(j/n),z=h[j]/Q,top=Number.isFinite(ceilingGrid[j])?ceilingGrid[j]:.69;
  for(const [dx,dy,a,b] of [[-1,0,[x/n,y/n], [x/n,(y+1)/n]],[1,0,[(x+1)/n,y/n],[(x+1)/n,(y+1)/n]],
    [0,-1,[x/n,y/n],[(x+1)/n,y/n]],[0,1,[x/n,(y+1)/n],[(x+1)/n,(y+1)/n]]]){
   const X=x+dx,Y=y+dy;
   if(X<0||Y<0||X>=n||Y>=n||caveMask[Y*n+X])continue;
   caveWalls.push({a,b,z,top});
  }
 }
 return {heights:h,material:m,features:featureBundle({ceilingGrid,caveMask,caveWalls,roofOpenings,corridors:passages}),waterLevel:null};
}
function archipelago(base){
 const n=base.size,p=base.source,h=new Uint16Array(n*n),m=new Uint8Array(n*n),s=base.seed,z=.43;
 const layout=[[.23,.23],[.67,.22],[.44,.49],[.79,.62],[.23,.76],[.64,.82]];
 const islands=layout.map(([x,y],i)=>({x:x+(rnd(i,7,s)-.5)*.074,y:y+(rnd(i,9,s)-.5)*.062,r:.081+rnd(i,5,s)*.034,
  elevation:.19+rnd(i,2,s)*.17,growth:1+rnd(i,11,s)*.24}));
 for(let j=0;j<n*n;j++){
  const x=(j%n+.5)/n,y=(Math.floor(j/n)+.5)/n,inherit=p[j]/Q;
  let floor=z-.11+.049*inherit+.018*Math.sin(x*31+y*28);
  for(const I of islands){
   const dx=x-I.x,dy=y-I.y,t=Math.atan2(dy,dx);
   const radii=I.r*(.87+.12*Math.sin(3*t+I.growth*3)+.095*Math.cos(5*t+I.growth*6));
   const d=Math.hypot(dx,dy),value=1-d/(radii*(.91+.2*inherit));
   if(value>-.48)floor=Math.max(floor,z+I.elevation*Math.max(0,value)**1.21+Math.min(value,0)*.25);
  }
  h[j]=u16(floor);m[j]=floor>z?4:1;
 }
 return {heights:h,material:m,features:featureBundle({waterPlane:{z,kind:'lagoon',bounds:[0,0,1,1]},islands}),waterLevel:z};
}
function forest(base){
 const n=base.size,p=base.source,h=new Uint16Array(n*n),m=new Uint8Array(n*n),waterMask=new Uint8Array(n*n),s=base.seed,z=.27;
 const ox=(rnd(1,17,s)-.5)*.10,oy=(rnd(3,17,s)-.5)*.12,node=[.505+ox,.558+oy];
 const channel=[[[.10,.01],[.21+ox,.20],[.27+ox,.38],node],[[.94,.05],[.79+ox,.24],[.69+ox,.31],node],[node,[.472+ox,.68],[.585+ox,.84],[.55,1.04]],[[.025,.523],[.16,.555],[.258+ox,.542],[.346+ox,.467],[.27+ox,.38]]];
 for(let j=0;j<n*n;j++){
  const x=(j%n+.5)/n,y=(Math.floor(j/n)+.5)/n,inherit=p[j]/Q;
  const D=polyDist(x,y,channel),width=.014+.007*(.5+.5*Math.sin(x*12+y*9+inherit));
  const outer=.57+inherit*.18+.06*Math.sin(y*20+x*15)+.022*Math.cos(x*64-y*47);
  const valley=ease((D-width)/.137);
  const floor=mix(.166+inherit*.039,outer,valley);
  h[j]=u16(floor);waterMask[j]=floor<=z?1:0;m[j]=waterMask[j]?2:4;
 }
 const trees=[];
 for(let i=0;i<450&&trees.length<68;i++){
  const x=.045+.91*rnd(i,29,s),y=.042+.916*rnd(i,36,s),d=polyDist(x,y,channel),g=exactSample(h,n,x,y);
  if(d<.077||g<z+.13||trees.some(p=>(p.x-x)**2+(p.y-y)**2<.042**2))continue;
  trees.push({x,y,z:g,kind:i%3?'conifer':'willow',height:.067+.074*rnd(i,47,s)+.03*g,radius:.012+.014*rnd(i,78,s)});
 }
 return {heights:h,material:m,features:featureBundle({channel,trees,junction:node,channelWater:{z,mask:waterMask}}),waterLevel:z};
}
function root(size=SIZE){
 const g=B.root(size);
 return {...g,id:ROOT,title:titles.genesis,structure:'genesis',features:featureBundle(),surface:{size,heights:g.heights,waterLevel:null}};
}
function descend(parent,x,y){
 const id=oldID(parent.id),p={...parent,id};
 const base=B.descend(p,x,y), qx=Math.round(x*Q)/Q,qy=Math.round(y*Q)/Q,hab=habitat(base,qx,qy);
 const g=hab.structure==='cavern'?cavern(base):hab.structure==='archipelago'?archipelago(base):forest(base);
 const {size}=base;
 const newWorld={...base,id:newID(base.id),title:titles[hab.structure],structure:hab.structure,habitat:hab,
  heights:g.heights,material:g.material,surface:{size,heights:g.heights,waterLevel:g.waterLevel},features:g.features};
 // Ground each visible creature against new terrain (not the old baseline material).
 const fauna=[];
 for(let i=0;i<110&&fauna.length<8;i++){
  const q=base.seed, x=.08+.84*rnd(i,88,q),y=.08+.84*rnd(i,91,q);
  const j=Math.floor(y*size)*size+Math.floor(x*size),wet=g.material[j]<=2;
  if(hab.structure==='cavern'&&!g.features.caveMask[j])continue;
  const kind=hab.structure==='cavern'?'mite':hab.structure==='archipelago'?(wet?(i%3===0?'ray':'fish'):'dragonfly'):(wet?'fish':i%3===0?'bird':'lizard');
  let ax=.026+.013*rnd(i,11,q),ay=.019+.015*rnd(i,55,q);
  // Keep aquatic and cavern movement inside corresponding valid material.
  if(kind!=='bird'&&kind!=='dragonfly')for(let r=0;r<5;r++){
   let ok=true;
   for(let a=0;a<24;a++){
    const phase=a/24*Math.PI*2,dx=x+ax*Math.cos(phase),dy=y+ay*Math.sin(phase);
    const ix=clamp(Math.floor(dx*size),0,size-1)+size*clamp(Math.floor(dy*size),0,size-1);
    if((g.material[ix]<=2)!==wet||(hab.structure==='cavern'&&!g.features.caveMask[ix])){ok=false;break}
   }
   if(ok)break;ax*=.55;ay*=.55;
  }
  if(fauna.some(p=>(p.x-x)**2+(p.y-y)**2<.073**2))continue;
  fauna.push({x,y,z:g.heights[j]/Q,phase:rnd(i,72,q),kind,ax,ay,period:3.7+5.1*rnd(i,18,q),scale:1.38});
 }
 const flora=hab.structure==='forest-ravine'?g.features.trees.map((t,i)=>({...t,phase:rnd(i,75,base.seed),scale:.91+t.height*2})):
  base.flora.flatMap((p,i)=>{
   const j=Math.floor(p.x*size)+size*Math.floor(p.y*size);
   if(hab.structure==='cavern'&&!g.features.caveMask[j])return [];
   return [{...p,z:g.heights[j]/Q,kind:hab.structure==='cavern'?(i%2?'crystal':'fungus'):(g.material[j]<=2?'coral':'palm')}];
  });
 return {...newWorld,fauna,flora};
}
function parse(id){return B.parse(oldID(id));}
function ancestor(id){return newID(B.ancestor(oldID(id)));}
function replay(id,size=SIZE){let p=root(size);for(const [x,y] of parse(id))p=descend(p,x,y);return p;}
async function replayAsync(id,size=SIZE,{signal,yieldEvery=1}={}){
 const path=parse(id),stride=Math.max(1,Math.trunc(yieldEvery)||1);let p=root(size);
 for(let i=0;i<path.length;i++){
  if(signal?.aborted)throw Error('Загрузка отменена');
  p=descend(p,...path[i]);
  if(i<path.length-1&&(i+1)%stride===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 if(signal?.aborted)throw Error('Загрузка отменена');
 return p;
}
function shade(w){
 if(w.structure==='genesis')return B.shade(w);
 return B.shade({...w,palette:PALETTE[w.structure]});
}
function drawLife(ctx,w,t,project){B.drawLife(ctx,w,t,project);}
function mesh(w,{resolution=56}={}){
 const n=Math.max(6,Math.min(w.size,Math.trunc(resolution)||56)),out=[],Q2=65535;
 const layers=new Map(),tri=(name,a,b,c)=>{let p=layers.get(name);if(!p){p=[];layers.set(name,p)}p.push(...a,...b,...c);};
 const quad=(name,a,b,c,d)=>{tri(name,a,b,c);tri(name,a,c,d);};
 const corner=(x,y)=>[x,y,B.sampleMap(w.heights,w.size,x,y)/Q2];
 const mask=w.features.channelWater?.mask,roof=w.features.ceilingGrid,cave=w.structure==='cavern',caveMask=w.features.caveMask;
 function nearest(field,x,y){const N=w.size;return field[Math.min(N-1,Math.floor(y*N))*N+Math.min(N-1,Math.floor(x*N))];}
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const a=i/n,b=j/n,c=(i+1)/n,d=(j+1)/n;
  const u=(a+c)/2,v=(b+d)/2;
  quad(cave&&nearest(caveMask,u,v)?'cave-floor':'terrain',corner(a,b),corner(c,b),corner(c,d),corner(a,d));
  if(roof){
   const z=nearest(roof,u,v);
   if(Number.isFinite(z))quad('ceiling',[a,b,z],[a,d,z],[c,d,z],[c,b,z]);
  }
  if(mask&&nearest(mask,u,v)){
   const z=w.features.channelWater.z;quad('channel-water',[a,b,z],[c,b,z],[c,d,z],[a,d,z]);
  }
 }
 if(w.features.waterPlane){
  const {z}=w.features.waterPlane;quad('open-water',[0,0,z],[1,0,z],[1,1,z],[0,1,z]);
 }
 for(const {a,b,z,top} of w.features.caveWalls)
  quad('cave-wall',[...a,z],[...b,z],[...b,top],[...a,top]);
 for(const {x,y,z,height,radius} of w.features.trees){
  const r=radius*.32,t=z+height*.68;
  for(let i=0;i<6;i++){
   const f=i*Math.PI/3,g=(i+1)*Math.PI/3,df=[Math.cos(f),Math.sin(f)],dg=[Math.cos(g),Math.sin(g)];
   const p=[x+r*df[0],y+r*df[1]],q=[x+r*dg[0],y+r*dg[1]];
   quad('trunk',[...p,z],[...q,z],[...q,t],[...p,t]);
   for(let j=0;j<2;j++){
    const a=radius*(1-j*.22),b=z+height*(.37+j*.22),h=z+height*(.78+j*.22);
    tri('canopy',[x+a*df[0],y+a*df[1],b],[x+a*dg[0],y+a*dg[1],b],[x,y,h]);
   }
  }
 }
 for(const [material,coords] of layers)out.push({material,positions:Float32Array.from(coords)});
 return out;
}
return Object.freeze({ROOT,SIZE,VERSION:'zdw1',root,descend,parse,ancestor,replay,replayAsync,box,sampleMap:B.sampleMap,shade,mesh,drawLife,pose:B.pose});
});
