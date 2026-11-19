/* ZomATON offline living-world engine; deterministic geometry + ecology. */
(function(g,f){const x=f();if(typeof module==='object'&&module.exports)module.exports=x;else g.ZATLiving=x;})(globalThis,()=>{
'use strict';
const ROOT_HASH='7e62552bea7203e6fc9c3c21a481b995e6847dac9f42135fd1a3a665885e99b1';
const P='zlw1:'+ROOT_HASH+':', ROOT=P+'-', Q=65535, SIZE=128;
const clamp=(x,l,u)=>Math.max(l,Math.min(u,x)),sat=x=>clamp(x,0,1),mix=(a,b,t)=>a+(b-a)*t;
const ease=x=>{x=sat(x);return x*x*(3-2*x)};
const quant=x=>{if(!Number.isFinite(x)||x<0||x>1)throw Error('Координата вне [0,1]');return Math.round(x*Q)};
const u16=x=>Math.round(sat(x)*Q);
function noise(x,y,s){let z=Math.imul(x,374761393)^Math.imul(y,668265263)^s;z=Math.imul(z^(z>>>13),1274126177);return ((z^(z>>>16))>>>0)/4294967296;}
function smooth(x,y,s){const i=Math.floor(x),j=Math.floor(y),u=ease(x-i),v=ease(y-j);
 return mix(mix(noise(i,j,s),noise(i+1,j,s),u),mix(noise(i,j+1,s),noise(i+1,j+1,s),u),v);}
function fbm(x,y,s){return .59*smooth(x,y,s)+.27*smooth(x*2.19+19,y*2.19+13,s^5412)+.14*smooth(x*5.07,y*5.07,s^6189);}
const rootSeed=0x98636cd7;
function nextSeed(old,a,b){let h=Math.imul(old^a,16777619)>>>0;return Math.imul(h^b,16777619)>>>0;}
function boxQ(a,b){return {x:.75*a/Q,y:.75*b/Q,width:.25,height:.25};}
function box(a,b){return boxQ(quant(a),quant(b));}
function seg(a,b){return a.toString(16).padStart(4,'0')+b.toString(16).padStart(4,'0');}
function decode(id){
 if(typeof id!=='string'||!id.startsWith(P))throw Error('Неизвестный корень или версия');
 if(id===ROOT)return [];
 const p=id.slice(P.length);if(p.length%9!==8||!/^[0-9a-f]{8}(?:\.[0-9a-f]{8})*$/.test(p))throw Error('Повреждённый маршрут');
 const route=new Array((p.length+1)/9);
 for(let i=0;i<route.length;i++)route[i]=[parseInt(p.slice(i*9,i*9+4),16),parseInt(p.slice(i*9+4,i*9+8),16)];
 return route;
}
function parse(id){return decode(id).map(([a,b])=>[a/Q,b/Q]);}
function ancestor(id){decode(id);const end=id.lastIndexOf('.');return end<0?ROOT:id.slice(0,end);}
function checkSize(n){if(!Number.isInteger(n)||n<32||n>256)throw Error('Размер мира 32–256');}
function sampleMap(d,n,u,v){
 const x=clamp(u*n-.5,0,n-1),y=clamp(v*n-.5,0,n-1),i=Math.floor(x),j=Math.floor(y),r=Math.min(n-1,i+1),s=Math.min(n-1,j+1);
 return Math.round(mix(mix(d[j*n+i],d[j*n+r],x-i),mix(d[s*n+i],d[s*n+r],x-i),y-j));
}
function nearest(d,n,u,v){return d[clamp(Math.floor(u*n),0,n-1)+n*clamp(Math.floor(v*n),0,n-1)];}
function grad(h,n,i){
 const x=i%n,y=Math.floor(i/n),l=x?i-1:i,r=x<n-1?i+1:i,t=y?i-n:i,b=y<n-1?i+n:i;
 return [(h[r]-h[l])/Q,(h[b]-h[t])/Q];
}
const BIOMES=[
 {id:'river',title:'Речные острова',flora:['willow','reed'],fauna:['dragonfly','fish'],palette:[[6,37,68],[22,104,105],[73,128,63],[235,191,108]]},
 {id:'grove',title:'Лесистые террасы',flora:['conifer','fern'],fauna:['bird','beetle'],palette:[[13,28,47],[33,81,64],[103,129,65],[233,192,143]]},
 {id:'reef',title:'Коралловая бухта',flora:['coral','fan'],fauna:['ray','fish'],palette:[[16,33,72],[29,100,124],[176,102,126],[255,203,139]]},
 {id:'dune',title:'Дюны и оазисы',flora:['palm','reed'],fauna:['lizard','bird'],palette:[[45,30,79],[126,87,91],[198,137,83],[252,221,141]]},
 {id:'basin',title:'Долина горячих источников',flora:['fern','fungus'],fauna:['beetle','lizard'],palette:[[18,30,50],[46,113,103],[133,109,137],[238,176,125]]},
 {id:'crystal',title:'Кристальные гряды',flora:['crystal','filament'],fauna:['mite','ciliate'],palette:[[13,21,55],[52,71,136],[57,174,166],[230,218,255]]},
 {id:'mycelium',title:'Сады мицелия',flora:['fungus','filament'],fauna:['mite','larva'],palette:[[24,17,53],[85,53,117],[175,120,114],[249,225,177]]},
 {id:'cells',title:'Долина микроорганизмов',flora:['colony','fan'],fauna:['ciliate','larva'],palette:[[13,24,64],[34,107,121],[150,139,93],[231,234,178]]},
 {id:'spores',title:'Поля спор',flora:['fungus','colony'],fauna:['beetle','ciliate'],palette:[[24,23,64],[113,54,106],[205,107,116],[252,221,164]]},
 {id:'filament',title:'Лабиринт волокон',flora:['filament','crystal'],fauna:['mite','larva'],palette:[[12,25,66],[60,62,128],[57,145,172],[244,193,139]]},
 {id:'shelf',title:'Многоярусные плато',flora:['conifer','coral'],fauna:['ray','bird'],palette:[[12,37,52],[30,105,97],[151,124,104],[244,208,158]]},
 {id:'springs',title:'Архипелаг минеральных чаш',flora:['fern','crystal'],fauna:['dragonfly','mite'],palette:[[17,21,57],[52,82,129],[144,115,151],[248,209,170]]},
 {id:'threads',title:'Лесные нити под корой',flora:['fern','filament'],fauna:['larva','beetle'],palette:[[12,34,54],[48,77,111],[115,133,94],[238,219,123]]},
 {id:'caves',title:'Подземные террасы',flora:['fungus','coral'],fauna:['lizard','ciliate'],palette:[[17,20,58],[69,64,127],[114,128,145],[238,194,143]]},
];
const STRUCTURE={genesis:'source',river:'canyon',grove:'terraced-ridges',reef:'archipelago',dune:'crossed-dunes',basin:'nested-calderas',crystal:'crystal-facets',mycelium:'branching-filaments',cells:'cellular-hollows',spores:'spore-knolls',filament:'woven-veins',shelf:'terraced-shelves',springs:'mineral-basins',threads:'organic-fibres',caves:'collapsed-chambers'};
const genesis={title:'Genesis №0',id:'genesis',flora:['willow','fern'],fauna:['bird','dragonfly'],palette:[[4,18,40],[16,72,99],[26,146,156],[238,196,115]]};
function root(size=SIZE){
 checkSize(size);const heights=new Uint16Array(size*size),material=new Uint8Array(heights.length);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const re=-.743643887+((x+.5)/size-.5)*.031,im=.131825904+((y+.5)/size-.5)*.031;
  let a=0,b=0,k=0;for(;k<270;k++){const n=a*a-b*b+re;b=2*a*b+im;a=n;if(a*a+b*b>256)break}
  const i=y*size+x;heights[i]=u16(k===270?.115:.24+.65*(1-1/(1+(k+1)/36)));
  material[i]=k===270?1:4;
 }
 return populate({id:ROOT,depth:0,size,kind:'genesis',heights,material,source:null,window:null,seed:rootSeed},genesis);
}
function pick(seed,depth,wet,edge,parent){
 const list=depth===1?BIOMES.slice(0,5):depth===2?BIOMES.slice(5,10):BIOMES;
 const shift=Math.floor(wet*11+edge*19+noise(0,depth,seed)*73);
 let i=shift%list.length;if(list[i].id===parent.biome)i=(i+1)%list.length;
 return list[i];
}
function populate(w,b){
 const n=w.size,s=w.seed,flora=[],fauna=[];
 const water=(x,y)=>nearest(w.material,n,x,y)<=2;
 function ground(x,y){
  const px=clamp(Math.floor(x*n),0,n-1),py=clamp(Math.floor(y*n),0,n-1),i=py*n+px;
  const [gx,gy]=grad(w.heights,n,i);return {h:w.heights[i]/Q,wet:water(x,y),slope:Math.abs(gx)+Math.abs(gy)};
 }
 const isWater=k=>k==='fish'||k==='ray'||k==='ciliate';
 const isAir=k=>k==='bird'||k==='dragonfly';
 const wetPlants=['reed','coral','fan','colony','filament'];
 const tries=96;
 for(let i=0;i<tries&&flora.length<48;i++){
  const x=.05+.9*noise(i,3,s),y=.05+.9*noise(i,9,s),g=ground(x,y),kind=b.flora[i%2];
  if(g.slope>.23||g.wet&&!wetPlants.includes(kind))continue;
  if(flora.some(p=>(p.x-x)**2+(p.y-y)**2<.058**2))continue;
  // The rock grade and local moisture determine which plants are large enough to see.
  flora.push({x,y,scale:.64+.6*noise(i,11,s)+g.h*.32,kind,phase:noise(i,12,s)});
 }
 for(let i=0;i<138&&fauna.length<10;i++){
  const x=.08+.84*noise(i,30,s),y=.08+.84*noise(i,35,s),kind=b.fauna[i%2],g=ground(x,y);
  if(!isAir(kind)&&(isWater(kind)!==g.wet||g.slope>.2))continue;
  if(fauna.some(p=>(p.x-x)**2+(p.y-y)**2<.10**2))continue;
  let ax=.020+.033*noise(i,41,s),ay=.014+.024*noise(i,55,s);
  for(let j=0;j<4&&!isAir(kind);j++){
   let ok=true;for(let q=0;q<12;q++){
    const t=q/12*2*Math.PI,k=ground(x+Math.cos(t)*ax,y+Math.sin(t)*ay);
    if(k.wet!==g.wet||k.slope>.24){ok=false;break;}
   }
   if(ok)break;ax*=.62;ay*=.62;
  }
  fauna.push({x,y,scale:.8+.54*noise(i,45,s),kind,phase:noise(i,46,s),ax,ay,period:3.5+6.2*noise(i,47,s)});
 }
 return {...w,biome:b.id,structure:STRUCTURE[b.id],title:b.title,levelName:w.depth===0?'Корень Genesis':w.depth===1?'Макромир':w.depth===2?'Микромир':'Вложенный мир · '+w.depth,
  palette:b.palette,flora,fauna};
}
function cellular(x,y,s){
 const a=Math.floor(x),b=Math.floor(y);let d=3,e=3;
 for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
  const X=a+i,Y=b+j,W=Math.abs(x-X-.18-.64*noise(X,Y,s))+.83*Math.abs(y-Y-.18-.64*noise(X,Y,s^9461));
  if(W<d){e=d;d=W;}else if(W<e)e=W;
 }
 return [sat(1-d),sat(1-(e-d)*3.2)];
}
function make(parent,a,b,id,depth,seed,life=true){
 const size=parent.size,count=size*size,window=boxQ(a,b),heights=new Uint16Array(count),material=new Uint8Array(count),source=new Uint16Array(count);
 let wet=0,edge=0,m=0;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,u=window.x+(x+.5)*window.width/size,v=window.y+(y+.5)*window.height/size;
  const h=sampleMap(parent.heights,size,u,v);source[i]=h;wet+=nearest(parent.material,size,u,v)<=2;m+=h;
  if(x)edge+=Math.abs(h-source[i-1]);if(y)edge+=Math.abs(h-source[i-size]);
 }
 const biome=pick(seed,depth,wet/count,edge/(count*Q),parent);
 const sorted=source.slice();sorted.sort();
 const lo=sorted[Math.floor(count*.12)],hi=sorted[Math.floor(count*.87)],delta=Math.max(6600,hi-lo),mean=m/(count*Q);
 const detail=new Float64Array(count),weight=new Float64Array(count),rich=new Uint8Array(count);
 const river=['river','reef','basin','springs','shelf'].includes(biome.id),cell=['crystal','mycelium','cells','spores','filament','threads','caves'].includes(biome.id);
 const freq=3.7+noise(depth,6,seed)*8.6,variant=1+noise(depth,4,seed)*1.1;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,u=(x+.5)/size,v=(y+.5)/size,a=source[i]/Q,g=(source[i]-lo)/delta,[gx,gy]=grad(source,size,i);
  const f=fbm(u*freq+2.4*g,v*freq-1.9*g,seed)-.5;
  const d=Math.min(x,y,size-1-x,size-1-y);weight[i]=ease((d-1)/Math.max(4,size*.09));
  // Bring very high/low inherited windows towards a usable middle without repainting their contour.
  const baseline=.47+.70*(a-mean)+.27*(a-.5);
  if(cell){
   const [facets,rim]=cellular(u*(freq+4)+3*g+19*gy+2*f,v*(freq+4)-2*g-19*gx-3*f,seed);
   const vein=sat(1-Math.abs(g-.42+(smooth(u*4,v*4,seed^615)-.5)*.24)*4.9);
   rich[i]=rim>.71?5:4;
   let shape;
   if(biome.id==='crystal')shape=.18*facets+.10*rim+.035*vein-.064;
   else if(biome.id==='mycelium'||biome.id==='filament'||biome.id==='threads'){
    const stitch=sat(1-4*Math.abs(.51-smooth(u*11+g*1.8,v*7+g*2.3,seed^552677)));
    shape=.033*facets+.087*rim+.135*vein*stitch+.057*stitch-.077;
   }else if(biome.id==='cells'||biome.id==='caves'){
    shape=.14*rim-.208*facets*facets+.014*vein;rich[i]=rim>.8?5:4;
   }else{
    shape=.23*facets**3-.052*rim+.05*vein-.026;
   }
   detail[i]=sat(baseline+shape*variant + f*.062);
  }else{
   const path=g*.32+(smooth(u*5+2*g,v*5,seed^527)-.5)*.26;
   const trough=sat(1-Math.abs(path-.34)*10.5);
   let shape=.13*sat(g)-.07+f*.22*variant-.145*trough*trough;
   if(biome.id==='reef'){
    const [island,shore]=cellular(u*4.1+g*.62,v*4.1-g*.67,seed^81643);
    shape=.53*island**1.7-.14*shore-.20+.079*sat(g)+.11*f;
   }else if(biome.id==='grove'||biome.id==='shelf'){
    const a=(sat(g+.30*f)*5),terrace=(Math.floor(a)+ease((a-Math.floor(a)-.35)*3.1))/5;
    shape=.275*terrace+.14*f-(biome.id==='shelf'?.116:.071)*trough-.116;
   }else if(biome.id==='dune'){
    const z=(u*6.4+v*2+g*1.1+f*.82);
    const ridge=1-Math.abs(2*(z-Math.floor(z))-1);
    const k=v*3.2+u*.8+g*.52;
    shape=.17*ridge**1.8+.078*smooth(k*4.2,u*2,seed^67261)+.068*f-.132;
   }else if(biome.id==='basin'||biome.id==='springs'){
    const [hollow,rim]=cellular(u*2.75+g*.85,v*3.1+g*.69,seed^218681);
    shape=.104*rim-.29*hollow**1.7+.085*f+.07*sat(g)-.028;
   }
   detail[i]=sat(baseline+shape);
  }
 }
 const drain=new Uint32Array(count);
 if(river){
  const rank=Uint32Array.from({length:count},(_,i)=>i);
  rank.sort((a,b)=>detail[b]-detail[a]||a-b);drain.fill(1);
  for(const j of rank){
   const x=j%size,y=Math.floor(j/size);let receiver=-1,grade=0;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const X=x+dx,Y=y+dy;
    if((!dx&&!dy)||X<0||Y<0||X>=size||Y>=size)continue;
    const i=Y*size+X,h=(detail[j]-detail[i])*(dx&&dy?.707106781:1);
    if(h>grade){grade=h;receiver=i}
   }
   if(receiver>=0)drain[receiver]+=drain[j];
  }
 }
 const cutoff=Math.max(5,Math.floor(size*.082)),pool=river?.38:cell?.435:.395;
 for(let j=0;j<count;j++){
  const f=drain[j],channel=f>=cutoff;
  if(channel)detail[j]=Math.max(0,detail[j]-.092*sat(f/(size*.61)));
  material[j]=channel?2:detail[j]<pool?1:cell?rich[j]:4;
  heights[j]=u16(mix(source[j]/Q,detail[j],weight[j]));
 }
 const w={id,depth,size,kind:depth===1?'macro':depth===2?'micro':'layer',heights,material,source,window,seed,biome:biome.id};
 return life?populate(w,biome):w;
}
function descend(parent,x,y){
 const a=quant(x),b=quant(y);if(!parent||typeof parent.id!=='string'||!Number.isInteger(parent.depth)||!Number.isInteger(parent.seed))throw Error('Нужен родительский мир');
 checkSize(parent.size);
 if(!(parent.heights instanceof Uint16Array)||parent.heights.length!==parent.size**2||
 !(parent.material instanceof Uint8Array)||parent.material.length!==parent.size**2)throw Error('Некорректная геометрия');
 const id=parent.depth===0?P+seg(a,b):parent.id+'.'+seg(a,b);
 return make(parent,a,b,id,parent.depth+1,nextSeed(parent.seed,a,b));
}
function replay(id,size=SIZE){
 const route=decode(id);let p=root(size);
 if(!route.length)return p;
 for(let i=0;i<route.length;i++){
  const [a,b]=route[i];
  // Retain only a parent/child pair; do not expand an entire chain into RAM.
  p=make(p,a,b,i===route.length-1?id:null,i+1,nextSeed(p.seed,a,b),i===route.length-1);
 }
 return p;
}
async function replayAsync(id,size=SIZE,{signal,yieldEvery=1}={}){
 const route=decode(id);let p=root(size);
 const stride=Math.max(1,Math.trunc(yieldEvery)||1);
 for(let i=0;i<route.length;i++){
  if(signal?.aborted)throw Error('Загрузка отменена');
  const [a,b]=route[i];p=make(p,a,b,i===route.length-1?id:null,i+1,nextSeed(p.seed,a,b),i===route.length-1);
  if(i<route.length-1&&(i+1)%stride===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 if(signal?.aborted)throw Error('Загрузка отменена');
 return p;
}
function shade(w){
 const n=w.size,out=new Uint8ClampedArray(n*n*4),palette=w.palette;
 for(let i=0;i<w.heights.length;i++){
  const h=w.heights[i]/Q,[gx,gy]=grad(w.heights,n,i),v=sat((h-.15)*1.71)*3,j=Math.min(2,Math.floor(v)),t=v-j;
  const light=.81+.48*sat(.46+(gx+gy)*8),m=w.material[i];
  for(let k=0;k<3;k++){
   let q=mix(palette[j][k],palette[j+1][k],t)*light;
   if(m<=2)q=mix(q,[24,112,149][k],m===2?.39:.34);
   if(m===5)q=mix(q,[201,224,245][k],.24);
   out[4*i+k]=Math.round(q);
  }
  out[4*i+3]=255;
 }
 return out;
}
function pose(animal,timeSeconds){
 const t=(timeSeconds/animal.period+animal.phase)*2*Math.PI;
 const a=animal.ax,b=animal.ay;
 return {x:animal.x+Math.cos(t)*a,y:animal.y+Math.sin(t)*b,angle:Math.atan2(Math.cos(t)*b,-Math.sin(t)*a)};
}
function drawLife(ctx,w,timeSeconds=0,project){
 const canvas=ctx.canvas,W=canvas.width,H=canvas.height;
 const map=project||((x,y)=>({x:x*W,y:y*H,scale:1}));
 const scale=Math.min(W,H)/444;
 const list=[...w.flora.map(f=>({p:f,x:f.x,y:f.y,angle:0,plant:true})),
  ...w.fauna.map(f=>({p:f,...pose(f,timeSeconds),plant:false}))].sort((a,b)=>a.y-b.y);
 const line=(...pts)=>{ctx.beginPath();ctx.moveTo(...pts[0]);for(const v of pts.slice(1))ctx.lineTo(...v);ctx.stroke()};
 const leaf=(x,y,a,b,rot,col)=>{ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,a,b,rot,0,Math.PI*2);ctx.fill()};
 const poly=(col,...pts)=>{ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(...pts[0]);for(const v of pts.slice(1))ctx.lineTo(...v);ctx.closePath();ctx.fill()};
 for(const e of list){
  const p=e.p,point=map(e.x,e.y);
  if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))continue;
  ctx.save();ctx.translate(point.x,point.y);const z=p.scale*scale*(Number.isFinite(point.scale)?point.scale:1);ctx.scale(z,z);
  ctx.lineCap='round';ctx.lineJoin='round';
  leaf(0,1,e.plant?4.1:5,1.85,0,'rgba(4,18,25,.51)');
  if(e.plant){
   ctx.lineWidth=1.45;
   const sway=Math.sin(timeSeconds*1.1+p.phase*6.28)*.65;
   if(p.kind==='conifer'){
    ctx.strokeStyle='#493938';line([0,1],[sway,-12]);
    poly('#163f44',[-5,-2],[1,-13],[6,-2]);poly('#247260',[-4,-5],[.5,-15],[4,-5]);poly('#64b689',[-2,-9],[sway,-16],[2,-9]);
   }else if(p.kind==='willow'||p.kind==='palm'){
    ctx.strokeStyle='#604b37';line([0,0],[-1,-5],[sway,-10]);
    const c=p.kind==='palm'?'#78bd79':'#6ba65f';
    leaf(-3+sway,-9,4,1.3,-.61,c);leaf(4+sway,-9,4,1.42,.54,c);leaf(sway,-12,3.4,1.5,.17,'#b7cb78');leaf(1+sway,-7,4,1.3,1.2,'#7eae6f');
   }else if(p.kind==='reed'||p.kind==='fern'||p.kind==='filament'){
    const c=p.kind==='filament'?'#dfb5ee':p.kind==='reed'?'#d4c379':'#8abe79';
    ctx.strokeStyle=c;
    for(let k=-2;k<=2;k++){line([0,1],[k*2,-5],[k*2.6+sway,-9-Math.abs(k)]);leaf(k*2.5+sway,-8-Math.abs(k),1.22,1.8,k*.24,c)}
   }else if(p.kind==='coral'||p.kind==='fan'){
    ctx.strokeStyle=p.kind==='coral'?'#ffb9a4':'#e9bc95';
    for(let k=-2;k<=2;k++){line([0,0],[k*1.7,-3],[k*2.8,-7]);line([k*1.7,-3],[k*3.1+sway,-5],[k*3.2+sway,-9]);}
   }else if(p.kind==='crystal'){
    for(let k=-1;k<=1;k++){
     const x=k*3,y=k===0?-13:-8;
     poly('#4d8ca2',[x-2,0],[x-3,y+4],[x,y],[x+2,y+4],[x+2,0]);
     poly('#dff4f8',[x,y],[x+2,y+4],[x+2,0],[x,y+5]);
    }
   }else if(p.kind==='fungus'){
    ctx.strokeStyle='#edc9ad';line([0,0],[sway,-6]);leaf(sway,-7,3.6,2.25,0,'#ee9db1');leaf(-1+sway,-7.8,1,.65,0,'#ffe4c7');
   }else{
    for(let k=0;k<5;k++){const a=k*1.256;leaf(Math.cos(a)*3,-2+Math.sin(a)*3,1.8,1.35,a,'#adbf94')}
   }
  }else{
   ctx.rotate(e.angle);
   const motion=Math.sin(timeSeconds*(p.kind==='dragonfly'?32:10)+p.phase*6.28),wings=3.3+Math.abs(motion)*3.5;
   ctx.lineWidth=1.2;const k=p.kind;
   if(k==='fish'||k==='ray'){
    poly('#26576f',[-2,0],[-7,-3.6],[-6,3.8]);leaf(0,0,k==='ray'?5:4,k==='ray'?4.5:2.5,0,'#b4def1');
    if(k==='ray'){poly('#7eabc7',[3,0],[-2,-6],[-4,0],[-2,6]);leaf(.9,0,2.1,1.4,0,'#cbe8f0');}
    leaf(2.3,0,.66,.6,0,'#132936');
   }else if(k==='bird'||k==='dragonfly'){
    const c=k==='bird'?'#f4dfb3':'#b1cfe4';
    poly(c,[2,0],[-.5,-wings],[-3,-wings+1],[-2,0],[-3,wings-1],[-.5,wings]);
    leaf(1,0,4,1.35,0,k==='bird'?'#8b5a4a':'#335f72');leaf(3.8,0,1.2,.9,0,'#ffeac5');
   }else if(k==='lizard'){
    ctx.strokeStyle='#385e3d';line([-3,0],[-6,motion],[-8,motion*1.4]);
    for(const x of [-2,2])for(const y of [-1,1])line([x,0],[x+y*.6,y*3],[x+.7,y*4]);
    leaf(0,0,4.4,2.15,0,'#a9c480');leaf(3,0,1.9,1.46,0,'#d0d986');
   }else if(k==='ciliate'||k==='larva'){
    for(let j=0;j<4;j++)leaf(j*2-3,Math.sin(motion+j*.83)*.95,2.25,1.85,0,j%2?'#e6a8c1':'#9bd8d5');
    ctx.strokeStyle='#d3ecdb';for(let x=-4;x<=4;x+=2)for(const y of [-1,1])line([x,y],[x+.6,y*3]);
   }else{
    ctx.strokeStyle='#472c57';
    for(const x of [-2.5,0,2.5])for(const y of [-1,1])line([x,0],[x+motion*.7,y*3.7],[x-.55,y*4.8]);
    leaf(-.75,0,3.15,2.55,0,'#b97969');leaf(1.75,0,1.6,1.8,0,'#624677');line([-3,0],[1,0]);
   }
  }
  ctx.restore();
 }
}
return Object.freeze({ROOT,SIZE,VERSION:'zlw1',root,descend,replay,replayAsync,parse,ancestor,box,sampleMap,shade,pose,drawLife});
});
