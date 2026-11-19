/* ZomATON material portals. Version zow2 uses the exact substrate at the recorded entry point. */
(function(g,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./engine.js'));else g.ZATMaterial=f(g.ZATObject);})(globalThis,O=>{
'use strict';
const Q=65535,S=O.SIZE,P='zow2:'+O.ROOT.split(':')[1]+':',ROOT=P+'-',DETAIL=17;
const MATERIALS=Object.freeze({stone:1,melt:2,leaf:3,vein:4,water:5,soil:6,membrane:7,shell:8,crystal:9,'lava-crust':10,ember:11,'plant-cell':12});
const R=Object.freeze({stone:'stone',crystal:'stone',melt:'fire','lava-crust':'fire',ember:'fire',leaf:'plant',vein:'plant','plant-cell':'plant',water:'water',soil:'soil',membrane:'animal',shell:'animal'});
const NAMES=Object.fromEntries(Object.entries(MATERIALS).map(([k,v])=>[v,k]));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),sat=v=>clamp(v,0,1),mix=(a,b,t)=>a+(b-a)*t;
const u16=x=>Math.round(sat(x)*Q);
function q(x){if(!Number.isFinite(x)||x<0||x>1)throw Error('Координата вне поверхности');return Math.round(x*Q);}
const hx=(x,n)=>x.toString(16).padStart(n,'0'),fq=x=>q(x)/Q;
function rng(x,y,s){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function seedFor(w,x,y,key){let s=Math.imul(w.seed^q(x),16777619)>>>0;s=Math.imul(s^q(y),16777619)>>>0;for(let i=0;i<key.length;i++)s=Math.imul(s^key.charCodeAt(i),16777619)>>>0;return s;}
function index(n,x,y){return Math.min(n-1,Math.floor(fq(x)*n))+n*Math.min(n-1,Math.floor(fq(y)*n));}
const near=(n,x,y)=>Math.min(n-1,Math.floor(sat(x)*n))+n*Math.min(n-1,Math.floor(sat(y)*n));
function parse(id){
 if(typeof id!=='string'||!id.startsWith(P))throw Error('Нужен адрес zow2');
 if(id===ROOT)return [];
 return id.slice(P.length).split('.').map(token=>{
  if(/^t[0-9a-f]{8}$/.test(token))return {type:'terrain',x:parseInt(token.slice(1,5),16)/Q,y:parseInt(token.slice(5),16)/Q};
  const m=/^o([0-9a-z]{10})-([a-z]{1,12})-([0-9a-f]{4})([0-9a-f]{4})$/.exec(token);
  if(m)return {type:'object',id:m[1],partKey:m[2],u:parseInt(m[3],16)/Q,v:parseInt(m[4],16)/Q};
  throw Error('Неизвестный сегмент материала');
 });
}
const append=(w,s)=>w.id===ROOT?P+s:w.id+'.'+s;
function ancestor(id){return parse(id).length<2?ROOT:id.slice(0,id.lastIndexOf('.'));}
function phys(n){return {heat:new Uint16Array(n*n),strain:new Uint16Array(n*n),channel:new Uint16Array(n*n),vein:new Uint16Array(n*n),lattice:new Uint16Array(n*n)};}
function readings(m,p,i){
 return {code:m[i],material:NAMES[m[i]],realm:R[NAMES[m[i]]],heat:p.heat[i]/Q,strain:p.strain[i]/Q,flow:p.channel[i]/Q,vascular:p.vein[i]/Q,lattice:p.lattice[i]/Q};
}
function terrainAt(w,x,y){
 const X=fq(x),Y=fq(y),n=w.size,i=index(n,X,Y);
 return {...readings(w.materialField,w.physics,i),x:X,y:Y,kind:'terrain',cell:[i%n,Math.floor(i/n)],height:w.heights[i]/Q};
}
const rockPart=new Set(['cell-wall','cuticle','gill-membrane','membrane','stoma']);
function partSurface(w,o,part){
 const size=DETAIL,field=new Uint8Array(size*size),p=phys(size),oPos=O.partPose(o,part.key,0);
 const substrate=terrainAt(w,oPos.x,oPos.y),g=o.genotype,lf=o.role==='plant',live=o.role==='animal'||o.role==='micro-organism';
 const pool=o.role==='micro-material',temperature=substrate.heat*(live?.70:.79);
 for(let i=0;i<field.length;i++){
  const x=(i%size+.5)/size,y=(Math.floor(i/size)+.5)/size,G=rng(i,14,g.seed);
  const jitter=.065*Math.sin(y*10+g.tilt),rib=Math.abs(x-.49-jitter);
  const twig=Math.abs((y+x*.65+g.tilt*.15)*(g.boughs+1)-Math.round((y+x*.65+g.tilt*.15)*(g.boughs+1)));
  const vascular=lf?Math.max(sat(1-rib*10),sat(1-twig*6)*sat(1-rib*1.9)):0;
  const membrane=Math.hypot((x-.5)*1.12,(y-.5)*1.24);
  let local;
  if(lf)local=vascular>.68?MATERIALS.vein:MATERIALS.leaf;
  else if(live)local=(part.key==='skin'||membrane>.55)?MATERIALS.shell:MATERIALS.membrane;
  else if(pool&&rockPart.has(o.kind)&&['leaf','vein','membrane'].includes(substrate.material)){
   local=(o.kind==='stoma'||o.kind==='cell-wall')?(vascular>.6?MATERIALS.vein:MATERIALS.leaf):MATERIALS.membrane;
  }else if(pool)local=substrate.code;
  else local=MATERIALS.shell;
  if(w.realm==='plant')local=vascular>.68||substrate.vascular*.98>.72?MATERIALS.vein:pool?MATERIALS['plant-cell']:MATERIALS.leaf;
  if(w.realm==='fire')local=substrate.flow>.48||G>.77?MATERIALS.melt:live?MATERIALS.ember:MATERIALS['lava-crust'];
  if(w.realm==='stone')local=G>.62||substrate.lattice>.55?MATERIALS.crystal:MATERIALS.stone;
  if(w.realm==='animal')local=part.key==='skin'||membrane>.60?MATERIALS.shell:MATERIALS.membrane;
  if(w.realm==='water')local=MATERIALS.water;
  if(w.realm==='soil')local=MATERIALS.soil;
  field[i]=local;p.heat[i]=u16(temperature+G*.10);
  p.strain[i]=u16(substrate.strain*.60+membrane*.20+G*.07);
  p.channel[i]=u16(substrate.flow*.58+(local===MATERIALS.melt?G*.33:0));
  p.vein[i]=u16(Math.max(vascular,substrate.vascular*.57));
  p.lattice[i]=u16(substrate.lattice*.75+(local===MATERIALS.shell?membrane*.31:0));
 }
 return {size,field,physics:p,substrate};
}
function prepareObjects(w){
 return w.objects.map(o=>{
  const pos=terrainAt(w,o.x,o.y);
  const parts=o.parts.map(k=>({...k,surface:partSurface(w,o,k)}));
  const forms={plant:['willow','sap-walker','stoma','ciliate'],fire:['fire-sprout','ember-drifter','lava-crust','hot-mote'],
   stone:['crystal','rock-crawler','crystal-face','mineral-mote']};
  const family=forms[w.realm],role=['plant','animal','micro-material','micro-organism'].indexOf(o.role);
  return {...o,nativeKind:o.kind,kind:family?.[role]??o.kind,parts,traits:Object.freeze({
   thermalTolerance:sat(pos.heat*.53+o.genotype.tones*.27),
   rockyGrip:sat(pos.strain*.63+o.genotype.aspect*.26),
   vascularReliance:sat(pos.vascular*.68+(o.role==='plant'?.18:0)),
   substrate:pos.material})};
 });
}
function getPart(w,id,key){
 const o=w.objects.find(o=>o.id===id);if(!o)throw Error('Нет такого объекта');
 const part=o.parts.find(p=>p.key===key);if(!part)throw Error('Нет такой части');
 return {o,part};
}
function objectMaterialAt(w,id,key,u=.5,v=.5){
 const {o,part}=getPart(w,id,key),g=part.surface,at=O.partPose(o,key,0);
 const U=fq(u),V=fq(v),i=index(g.size,U,V),c=Math.cos(at.angle),s=Math.sin(at.angle),
  dx=(U-.5)*at.r*2,dy=(V-.5)*at.r*2;
 return {...readings(g.field,g.physics,i),kind:'object',objectId:id,partKey:key,u:U,v:V,
  cell:[i%g.size,Math.floor(i/g.size)],x:fq(sat(at.x+c*dx-s*dy)),y:fq(sat(at.y+s*dx+c*dy)),
  sourceSubstrate:g.substrate.material};
}
function hit(w,x,y,t=0,tolerance=.014){
 const h=O.hit(w,x,y,t,tolerance);if(!h)return null;
 const at=O.partPose(h.object,h.partKey,t),c=Math.cos(at.angle),s=Math.sin(at.angle),a=x-at.x,b=y-at.y;
 const u=fq(sat(.5+(a*c+b*s)/(2*at.r))),v=fq(sat(.5+(-a*s+b*c)/(2*at.r)));
 return {...h,u,v,material:objectMaterialAt(w,h.id,h.partKey,u,v)};
}
function materialAt(w,x,y,t=0,pick='auto'){const h=pick==='terrain'?null:hit(w,x,y,t);return h?h.material:terrainAt(w,x,y);}
function root(size=S){
 const base=O.root(size),materialField=new Uint8Array(size*size),physics=phys(size),heights=base.heights.slice(),features={...base.features},crack=[];
 for(let j=0;j<=20;j++){const y=j/20,x=.50+.045*Math.sin(y*10.6);crack.push([x,y]);}
 for(let i=0;i<size*size;i++){
  const x=(i%size+.5)/size,y=(Math.floor(i/size)+.5)/size;
  const fault=.50+.045*Math.sin(y*10.6),d=Math.abs(x-fault),rock=base.heights[i]/Q;
  const riverWidth=.017+.006*Math.sin(y*18+rock*2)+.003*Math.sin(x*98+y*64);
  const vent=sat(1-d/(.055+.024*rock)),sig=sat(1-Math.abs(d-.036)*16);
  const molten=d<riverWidth;
  materialField[i]=molten?MATERIALS.melt:rock<.16&&d>.11?MATERIALS.soil:MATERIALS.stone;
  heights[i]=u16(rock+(molten?-.054*vent:.062*sig));
  physics.heat[i]=u16(molten?.77+.22*vent:.11+.42*vent);
  physics.channel[i]=u16(molten?vent*.84:0);physics.strain[i]=u16((1-vent)*.24+.61*sig);
  physics.lattice[i]=u16(molten?0:.20+.55*sig);
 }
 features.moltenFault=[crack];
 const w={...base,id:ROOT,heights,surface:{...base.surface,heights},materialField,physics,features,
  materialProfile:'genesis',realm:'genesis',materialDomain:'genesis',traits:{},objects:base.objects};
 return {...w,objects:prepareObjects(w)};
}
function sourceWindow(parent,e){
 const window=O.box(e.x,e.y),n=parent.size,source=new Uint16Array(n*n),sourceCode=new Uint8Array(n*n),sourcePhysics=phys(n);
 for(let i=0;i<n*n;i++){
  const x=window.x+(i%n+.5)*window.width/n,y=window.y+(Math.floor(i/n)+.5)*window.height/n;
  source[i]=O.sampleMap(parent.heights,n,x,y);
  const k=near(n,x,y);sourceCode[i]=parent.materialField[k];
  for(const name of Object.keys(sourcePhysics))sourcePhysics[name][i]=parent.physics[name][k];
 }
 return {window,source,sourceCode,sourcePhysics};
}
function dLine(x,y,line){
 let d=2;
 for(let i=1;i<line.length;i++){
  const [a,b]=line[i-1],[c,e]=line[i],X=c-a,Y=e-b,t=sat(((x-a)*X+(y-b)*Y)/(X*X+Y*Y||1));
  d=Math.min(d,Math.hypot(x-a-X*t,y-b-Y*t));
 }
 return d;
}
function networkDistance(x,y,net){let d=2;for(const p of net)d=Math.min(d,dLine(x,y,p));return d;}
const profiles={fire:'molten',plant:'vascular',stone:'fractured',animal:'cellular',water:'aqueous',soil:'granular'};
const families={
 fire:{macro:[['molten-deltas','Огненные разливы'],['thermal-volcanoes','Террасы расплава'],['flame-ravines','Огненные ущелья']],micro:[['molten-grains','Зёрна расплава'],['heat-lattice','Тепловая решётка'],['ember-veins','Каналы жара']]},
 plant:{macro:[['plant-canopy','Кроны растительного мира'],['vascular-terraces','Сосудистые террасы'],['plant-corridors','Заросли проводящих стеблей']],micro:[['leaf-tissue','Ткань листа'],['vein-lattice','Решётка проводящих сосудов'],['plant-cells','Лабиринт клеток']]},
 stone:{macro:[['stone-fault','Каменный разлом'],['crystal-terraces','Каменные террасы'],['mineral-chambers','Кристаллические камеры']],micro:[['stone-grains','Минеральные зёрна'],['fracture-network','Трещины минерала'],['solid-lattice','Кристаллическая решётка']]},
 animal:{macro:[['animal-colony','Мир живой ткани']],micro:[['cellular-membranes','Клеточные мембраны']]},
 water:{macro:[['water-delta','Водный мир']],micro:[['water-currents','Водные микротечения']]},
 soil:{macro:[['soil-dunes','Грунтовый мир']],micro:[['soil-grains','Зёрна почвы']]},
};
function childDesign(base,parent,e,id){
 const {size:n}=parent,Z=n*n,{window,source,sourceCode,sourcePhysics}=sourceWindow(parent,e);
 const realm=parent.realm==='genesis'?e.realm:parent.realm;
 if(e.realm!==realm)throw Error('Поверхность не принадлежит наследуемой области');
 const op=profiles[realm],s=seedFor(parent,e.x,e.y,e.material+'|'+(e.partKey??'')),mass=e.strain,heat=e.heat;
 const candidates=families[realm][base.scale],kind=Math.floor(rng(3,78,s)*candidates.length),
  [structure,title]=candidates[kind],frequency=1+kind*.43;

 const lines=[],lobes=4+Math.floor(rng(7,12,s)*4),chambers=[];
 const x0=.48+.15*(rng(19,10,s)-.5);
 lines.push(Array.from({length:17},(_,j)=>{
  const y=j/16,curve=.067*Math.sin(y*(8.1+e.flow*7.4)*frequency+rng(7,10,s)*3.1)+.029*Math.sin(y*31+e.lattice*7.3);
  return [x0+curve+((e.u??.5)-.5)*.17,y];
 }));
 for(let j=0;j<lobes;j++){
  const y=.12+j*.12,side=j%2?1:-1,x=x0+side*(.19+rng(j,37,s)*.19);
  const at=lines[0][Math.round(y*16)][0];
  lines.push([[at,y],[mix(x,at,.37),y+.028+(e.v??.5)*.06],[x,y-.07-rng(j,19,s)*.05]]);
  chambers.push({x,y,r:.026+.045*rng(j,40,s)});
 }
 const materialField=new Uint8Array(Z),physics=phys(n),heights=new Uint16Array(Z);
 let flowCount=0,fractureCount=0,vascularCount=0;
 for(let i=0;i<Z;i++){
  const x=(i%n+.5)/n,y=(Math.floor(i/n)+.5)/n,v=source[i]/Q,old=.36+.34*v+.09*Math.sin(x*19*frequency+y*16+v*7)+.032*Math.cos(y*31-x*23*frequency);
  const width=.020+.01*e.flow+.012*heat+kind*.004,d=networkDistance(x,y,lines),line=sat(1-d/width);
  const grain=Math.sin(x*111+y*84+v*21+mass*4)*Math.sin(x*58-y*107+e.lattice*8);
  const lattice=sat(1-Math.abs(grain)*2.26);
  let cell=0;
  for(const c of chambers){const k=Math.hypot(x-c.x,y-c.y)/c.r;cell=Math.max(cell,sat(1-Math.abs(k-.7)*3));}
  const memory=sourcePhysics.heat[i]/Q,stratum=sourcePhysics.strain[i]/Q;
  let h,code,T,R,F,V,L;
  if(op==='molten'){
   h=mix(old,.23+.34*v,.45)-line*(.11+heat*.099)+.085*cell;
   T=sat(.24+heat*.34+memory*.12+line*.39);R=sat(mass*.36+stratum*.17+(1-line)*.19);
   F=sat(line*(.49+e.flow*.41));V=0;L=lattice*(1-line)*.3;
   code=line>.50?MATERIALS.melt:line>.23?MATERIALS.ember:MATERIALS['lava-crust'];
  }else if(op==='fractured'){
   h=mix(old,.31+.31*v,.54)-line*(.080+.134*mass)+lattice*.052+.049*cell;
   T=sat(.08+heat*.19+memory*.12);R=sat(mass*.39+stratum*.22+line*.45);F=0;V=0;L=sat(lattice*(.51+.31*e.lattice));
   code=line>.63?MATERIALS.stone:lattice>.69?MATERIALS.crystal:MATERIALS.stone;
  }else if(op==='vascular'||op==='cellular'){
   h=mix(old,.20+.44*v,.48)+line*(.096+e.vascular*.11)+cell*.084-lattice*.027;
   T=sat(.12+heat*.42+memory*.09);R=sat(mass*.50+stratum*.18+cell*.14);
   F=0;V=sat(.18+e.vascular*.30+line*.48);L=lattice*.24;
   code=op==='cellular'?line>.51?MATERIALS.membrane:cell>.64?MATERIALS.shell:MATERIALS.membrane:line>.48?MATERIALS.vein:cell>.62?MATERIALS['plant-cell']:MATERIALS.leaf;
  }else{
   h=mix(old,.22+.43*v,.40)-line*.065+grain*.024;
   T=sat(.1+heat*.37+memory*.10);R=sat(mass*.30+stratum*.30+grain*.13);F=op==='aqueous'?line*.85:0;V=0;L=lattice*.50;
   code=op==='aqueous'?MATERIALS.water:MATERIALS.soil;
  }
  heights[i]=u16(h);
  materialField[i]=code;physics.heat[i]=u16(T);physics.strain[i]=u16(R);physics.channel[i]=u16(F);physics.vein[i]=u16(V);physics.lattice[i]=u16(L);
  if(F>.24)flowCount++;if(R>.49)fractureCount++;if(V>.54)vascularCount++;
 }
 const features={waterPlane:null,caveMask:null,ceilingGrid:null,caveWalls:[],trees:[],channel:[],channelWater:null,
  tissueNetwork:op==='vascular'||op==='cellular'?lines:[],tissueChambers:op==='vascular'||op==='cellular'?chambers.map(c=>({...c,rx:c.r,ry:c.r*.78})):[],
  moltenFault:op==='molten'?lines:[],fractures:op==='fractured'?lines:[],materialVeins:op==='vascular'||op==='cellular'?lines:[],
  materialCells:chambers,materialSourceCode:sourceCode};
 const traits={realm,material:e.material,profile:op,thermalGradient:heat,fragility:op==='fractured'?sat(.51+mass*.45):sat(mass*.55),
   conductance:op==='molten'?sat(.36+heat*.39+e.flow*.23):op==='vascular'?sat(.29+e.vascular*.51):sat(.13+e.lattice*.34),
   fracturedCells:fractureCount,flowingCells:flowCount,vascularCells:vascularCount};
 const w={...base,id,depth:parent.depth+1,realm,materialDomain:realm,structure,title,
  origin:{...base.origin,parentId:parent.id,material:e,realm,local:e.kind==='object'?[e.u,e.v]:null},
  materialField,physics,heights,source,sourcePhysics,window,surface:{size:n,heights,waterLevel:null},features,materialProfile:op,traits,
  morphology:{family:op,channels:lines.length,chambers:chambers.length,parentObjectId:e.objectId??null,scale:base.scale,realm}};
 return {...w,objects:prepareObjects(w)};
}
function oldBasis(p){return {...p,id:O.ROOT};}
function descend(p,x,y){
 const e=terrainAt(p,x,y),id=append(p,'t'+hx(q(e.x),4)+hx(q(e.y),4));
 return childDesign(O.descend(oldBasis(p),e.x,e.y),p,e,id);
}
function enterObject(p,id,key,u=.5,v=.5){
 const k=key??p.objects.find(o=>o.id===id)?.parts[0].key,e=objectMaterialAt(p,id,k,u,v);
 const out=append(p,'o'+id+'-'+k+'-'+hx(q(e.u),4)+hx(q(e.v),4));
 return childDesign(O.enterObject(oldBasis(p),id,k),p,e,out);
}
function enter(w,x,y,time=0){const r=hit(w,x,y,time);return r?enterObject(w,r.id,r.partKey,r.u,r.v):descend(w,x,y);}
function next(w,s){return s.type==='terrain'?descend(w,s.x,s.y):enterObject(w,s.id,s.partKey,s.u,s.v);}
function replay(id,size=S){let w=root(size);for(const s of parse(id))w=next(w,s);return w;}
async function replayAsync(id,size=S,{signal,yieldEvery=1}={}){
 let w=root(size),i=0,steps=parse(id);
 const stride=Math.max(1,Math.trunc(yieldEvery)||1);
 for(const s of steps){
  if(signal?.aborted)throw Error('Загрузка отменена');
  w=next(w,s);
  if(++i<steps.length&&i%stride===0)await new Promise(r=>setTimeout(r,0));
 }
 if(signal?.aborted)throw Error('Загрузка отменена');return w;
}
const PALETTE={
 1:[110,115,132],2:[255,106,37],3:[48,124,68],4:[147,203,90],5:[36,111,163],6:[114,94,82],
 7:[192,103,145],8:[181,141,123],9:[134,196,212],10:[104,39,51],11:[234,123,57],12:[86,153,107]
};
function shade(w){
 const n=w.size,out=new Uint8ClampedArray(n*n*4);
 for(let i=0;i<n*n;i++){
  const j=i*4,x=i%n,y=Math.floor(i/n),h=w.heights[i]/Q,heat=w.physics.heat[i]/Q;
  const gx=(w.heights[x?i-1:i]-w.heights[x<n-1?i+1:i])/Q,
   gy=(w.heights[y?i-n:i]-w.heights[y<n-1?i+n:i])/Q,code=w.materialField[i],c=PALETTE[code];
  const f=.67+.42*sat(h*1.18+.17)+.32*sat(.46+gx*11+gy*13);
  for(let k=0;k<3;k++){
   let v=c[k]*f;if(code===2||code===11)v+=heat*[45,96,28][k];
   out[j+k]=Math.round(v);
  }
  out[j+3]=255;
 }
 return out;
}
const groupName={1:'stone-ground',2:'molten-channel',3:'leaf-ground',4:'vascular-ridge',5:'water-ground',6:'soil-ground',
 7:'tissue-ground',8:'shell-ground',9:'crystal-surface',10:'lava-crust',11:'ember-surface',12:'plant-cell'};
function mesh(w,{resolution=48}={}){
 const n=Math.max(8,Math.min(w.size,Math.trunc(resolution)||48)),groups=new Map;
 const xyz=(u,v)=>[u,v,O.sampleMap(w.heights,w.size,sat(u),sat(v))/Q];
 function tri(name,a,b,c){const x=groups.get(name)||[];if(!groups.has(name))groups.set(name,x);x.push(...a,...b,...c);}
 function quad(name,a,b,c,d){tri(name,a,b,c);tri(name,a,c,d);}
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const a=x/n,b=y/n,c=(x+1)/n,d=(y+1)/n,code=w.materialField[near(w.size,(a+c)*.5,(b+d)*.5)];
  quad(groupName[code],xyz(a,b),xyz(c,b),xyz(c,d),xyz(a,d));
 }
 for(const [name,paths] of [['fracture-wall',w.features.fractures??[]],['molten-channel',w.features.moltenFault??[]],['vascular-ridge',w.features.materialVeins??[]]])for(const p of paths)for(let i=1;i<p.length;i++){
  const [a,b]=p.slice(i-1,i+1),len=Math.hypot(a[0]-b[0],a[1]-b[1]);if(!len)continue;
  const r=name==='molten-channel'?.008:.006,nx=(a[1]-b[1])*r/len,ny=(b[0]-a[0])*r/len,
  A=xyz(a[0]+nx,a[1]+ny),B=xyz(b[0]+nx,b[1]+ny),C=xyz(b[0]-nx,b[1]-ny),D=xyz(a[0]-nx,a[1]-ny);
  const h=name==='molten-channel'?.008:name==='fracture-wall'?.038:.025;
  B[2]+=h;C[2]+=h;if(name==='molten-channel'){A[2]+=h;D[2]+=h}
  quad(name,A,B,C,D);
 }
 return [...groups].map(([material,coords])=>({material,positions:Float32Array.from(coords)}));
}
function drawLife(ctx,w,time=0,project){
 if(w.realm==='genesis'||w.realm==='animal'||w.realm==='water'||w.realm==='soil')return O.drawLife(ctx,w,time,project);
 const W=ctx.canvas.width,H=ctx.canvas.height,map=project||((x,y)=>({x:x*W,y:y*H,scale:1}));
 const items=w.objects.map(o=>({o,p:O.objectPose(o,time)})).sort((a,b)=>a.p.y-b.p.y);
 function poly(col,...points){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(...points[0]);for(const v of points.slice(1))ctx.lineTo(...v);ctx.closePath();ctx.fill()}
 for(const {o,p} of items){
  const pos=map(p.x,p.y);if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))continue;
  const r=Math.min(W,H)*o.radius*(pos.scale??1),g=o.genotype,gene=g.tones;
  ctx.save();ctx.translate(pos.x,pos.y);ctx.rotate(p.angle*.39);ctx.scale(r,r);
  if(w.realm==='fire'){
   const sway=.16*Math.sin(time*3+o.phase*5),heat=o.traits.thermalTolerance;
   for(let j=0;j<g.fins+1;j++){
    const x=(j-g.fins/2)*.33,h=.7+.36*heat+gene*.44+.16*Math.sin(time*6+j+o.phase*6);
    poly('#d34a3b',[x-.21,.32],[x-.29,-.07],[x+sway,-h],[x+.2,-.26],[x+.24,.36]);
    poly('#ffdc67',[x-.1,.31],[x-.14,.06],[x+sway*.7,-h*.68],[x+.09,.03],[x+.12,.33]);
   }
  }else if(w.realm==='stone'){
   const c=o.role==='animal'||o.role==='micro-organism';
   for(let j=0;j<g.fins+2;j++){
    const x=(j-g.fins/2-1)*.28,h=.48+.84*(j===1?g.aspect:.23+gene*.43);
    poly(c?'#728299':'#688697',[x-.14,.25],[x-.19,-h*.65],[x,-h],[x+.16,-h*.61],[x+.15,.3]);
    poly('#bfdae0',[x,-h],[x+.16,-h*.61],[x+.15,.3],[x+.035,.16]);
   }
  }else{
   const sway=Math.sin(time*.8+o.phase*5)*.16;
   ctx.strokeStyle='#add089';ctx.lineWidth=.135;ctx.beginPath();ctx.moveTo(.16,.30);ctx.lineTo(.0,-.18);ctx.lineTo(sway,-1);ctx.stroke();
   for(let j=0;j<g.boughs;j++){
    const y=-.17-j*.10,q=j%2?1:-1,l=.33+.20*g.aspect-j*.026;
    poly(j%2?'#8dbd7a':'#a9cd79',[.02+sway*.35,y+.11],[l*q,y-.15],[l*q*.57,y-.25],[sway*.5,y-.03]);
   }
  }
  ctx.restore();
 }
}
return Object.freeze({ROOT,SIZE:S,DETAIL,MATERIALS,VERSION:'zow2',root,descend,enter,enterObject,materialAt,objectMaterialAt,
 hit,objectPose:O.objectPose,partPose:O.partPose,pose:O.pose,box:O.box,sampleMap:O.sampleMap,shade,mesh,drawLife,ancestor,parse,replay,replayAsync});
});
