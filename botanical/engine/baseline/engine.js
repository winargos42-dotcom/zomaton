/* ZomATON object portals, offline, version zow1. */
(function(g,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./diverse.js'));else g.ZATObject=f(g.ZATDiverse);})(globalThis,D=>{
'use strict';
const Q=65535,SIZE=D.SIZE,P='zow1:'+D.ROOT.split(':')[1]+':',ROOT=P+'-',VERSION='zow1';
const sat=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
const quant=v=>{if(!Number.isFinite(v)||v<0||v>1)throw Error('Координата вне мира');return Math.round(v*Q);};
const qcoord=v=>quant(v)/Q, hex=(n,d)=>n.toString(16).padStart(d,'0');
function hash(x,y,s){let z=Math.imul(x,374761393)^Math.imul(y,668265263)^s;z=Math.imul(z^(z>>>13),1274126177);return (z^(z>>>16))>>>0}
function rnd(x,y,s){return hash(x,y,s)/4294967296}
function hashText(txt,s){let h=s>>>0;for(let i=0;i<txt.length;i++)h=Math.imul(h^txt.charCodeAt(i),16777619)>>>0;return h;}
function parse(id){
 if(typeof id!=='string'||!id.startsWith(P))throw Error('Нужен адрес zow1');
 if(id===ROOT)return [];
 return id.slice(P.length).split('.').map(s=>{
  if(/^t[0-9a-f]{8}$/.test(s))return {type:'terrain',x:parseInt(s.slice(1,5),16)/Q,y:parseInt(s.slice(5),16)/Q};
  const m=/^o([0-9a-z]{10})-([a-z]{1,12})$/.exec(s);
  if(m)return {type:'object',id:m[1],partKey:m[2]};
  throw Error('Некорректный сегмент перехода');
 });
}
function ancestor(id){
 const p=parse(id);if(p.length<2)return ROOT;
 return id.slice(0,id.lastIndexOf('.'));
}
const append=(p,s)=>p.id===ROOT?P+s:p.id+'.'+s;
function sample(w,u,v){return D.sampleMap(w.heights,w.size,sat(u),sat(v))/Q;}
const portalRoles=Object.freeze({plant:'micro',animal:'micro','micro-material':'macro','micro-organism':'macro'});
function parts(o){
 const specimen=o.role==='animal',micro=o.role.startsWith('micro-');
 const keys=micro?[['core',0,0,.94],['edge',-.65,.05,.48]]:specimen?[['body',.21,0,.69],['skin',-.54,-.32,.38]]:
  [['leaf',-.46,-.34,.67],['stem',.43,.33,.49]];
 return keys.map(([key,dx,dy,r])=>({key,dx,dy,r:r*o.radius,x:sat(o.x+dx*o.radius),y:sat(o.y+dy*o.radius),z:o.z}));
}
function specimen(w,p,index,role){
 const s=hash(index,p.kind.length,w.seed),x=qcoord(sat(p.x)),y=qcoord(sat(p.y)),z=sample(w,x,y);
 const id=hex(index,2)+hex(hashText(p.kind+'-'+role+'-'+hex(quant(x),4)+hex(quant(y),4),s),8);
 const g={seed:s,boughs:3+Math.floor(rnd(1,2,s)*5),aspect:.52+rnd(2,3,s)*.49,
  lobes:2+Math.floor(rnd(3,4,s)*5),fins:1+Math.floor(rnd(4,5,s)*3),
  tilt:(rnd(5,6,s)-.5)*1.25,ring:1+Math.floor(rnd(6,7,s)*4),tones:rnd(8,9,s)};
 const roleSize=role==='animal'?.023:role==='plant'?.022:role==='micro-organism'?.026:.028;
 const n=w.size,j=Math.min(n-1,Math.floor(x*n))+n*Math.min(n-1,Math.floor(y*n));
 const habitat={material:w.material[j],elevation:z,slope:Math.abs(sample(w,x+.011,y)-sample(w,x-.011,y))+Math.abs(sample(w,x,y+.011)-sample(w,x,y-.011))};
 const o={id,role,kind:p.kind,x,y,z,scale:p.scale??1,radius:roleSize*(.9+.36*rnd(8,8,s)),
  phase:rnd(7,8,s),genotype:g,habitat,
  ax:p.ax??0,ay:p.ay??0,period:p.period??5,targetScale:portalRoles[role]};
 return {...o,parts:parts(o)};
}
function objectPose(o,t=0){
 if(o.ax||o.ay)return D.pose(o,t);
 return {x:o.x,y:o.y,angle:o.genotype?.tilt??0};
}
function partPose(o,k,t=0){
 const p=o.parts.find(p=>p.key===k);if(!p)throw Error('Объект не содержит эту часть');
 const {x,y,angle:a}=objectPose(o,t),u=Math.cos(a),v=Math.sin(a);
 return {x:sat(x+(p.dx*u-p.dy*v)*o.radius),y:sat(y+(p.dx*v+p.dy*u)*o.radius),z:p.z,r:p.r,angle:a};
}
function hit(w,x,y,t=0,tolerance=.014){
 quant(x);quant(y);
 let winner=null,best=Infinity;
 for(const o of w.objects)for(const p of o.parts){
  const at=partPose(o,p.key,t),d=Math.hypot(x-at.x,y-at.y);
  if(d>p.r+tolerance)continue;
  const score=d/Math.max(p.r,.005);
  if(score<best){best=score;winner={id:o.id,partKey:p.key,object:o};}
 }
 return winner;
}
function fromD(b,id,depth,origin){
 const objects=[];
 for(let j=0;j<Math.min(46,b.flora.length);j++)objects.push(specimen(b,b.flora[j],j,'plant'));
 for(let j=0;j<Math.min(14,b.fauna.length);j++)objects.push(specimen(b,b.fauna[j],80+j,'animal'));
 return {...b,id,depth,scale:'macro',objects,origin,morphology:null};
}
function root(size=SIZE){return fromD(D.root(size),ROOT,0,null);}
function exactSource(p,x,y){
 const window=D.box(x,y),N=p.size,source=new Uint16Array(N*N);
 for(let v=0;v<N;v++)for(let u=0;u<N;u++)source[v*N+u]=D.sampleMap(p.heights,N,
  window.x+(u+.5)*window.width/N,window.y+(v+.5)*window.height/N);
 return {source,window};
}
const pointSegment=(x,y,a,b)=>{
 const X=b[0]-a[0],Y=b[1]-a[1],f=sat(((x-a[0])*X+(y-a[1])*Y)/(X*X+Y*Y||1));
 return Math.hypot(x-a[0]-X*f,y-a[1]-Y*f);
};
const networkDistance=(x,y,lines)=>{
 let d=2;for(const l of lines)for(let i=1;i<l.length;i++)d=Math.min(d,pointSegment(x,y,l[i-1],l[i]));
 return d;
};
const tissueNames={
 leaf:'Лист · сосудистые пучки',
 stem:'Стебель · проводящие ткани',
 gill:'Жабры · дыхательные ламеллы',
 cuticle:'Панцирь · хитиновые камеры',
 skin:'Кожа · покровные слои',
 organ:'Тело · органные полости',
 matrix:'Ткань · межклеточный матрикс',
};
function tissueProfile(o,part,w){
 if(!o)return w.morphology?.family==='leaf'?'matrix':w.morphology?.family==='gill'?'gill':'matrix';
 if(o.role==='plant')return part==='leaf'?'leaf':'stem';
 if(['fish','ray'].includes(o.kind))return 'gill';
 if(['beetle','mite','dragonfly'].includes(o.kind))return 'cuticle';
 return part==='skin'?'skin':'organ';
}
function inside(parent,id,anchorX,anchorY,profile,object,origin){
 const {size:N}=parent,{source,window}=exactSource(parent,anchorX,anchorY),Z=N*N;
 const sg=hashText(profile+'|'+(origin.partKey??'terrain'),object?.genotype?.seed??parent.seed);
 const low=source.slice();low.sort();
 const a=low[Math.floor(Z*.12)]/Q,b=low[Math.floor(Z*.87)]/Q,range=Math.max(.10,b-a);
 const s={seed:sg,boughs:object?.genotype?.boughs??4,aspect:object?.genotype?.aspect??.72,lobes:object?.genotype?.lobes??4};
 const network=[], chambers=[], organs=[];
 const spines=Math.max(3,s.boughs),wetness=source.reduce((sum,h)=>sum+h,0)/(Z*Q);
 const livingPlant=profile==='leaf'||profile==='stem'||profile==='matrix';
 const pegs=[];
 if(livingPlant){
  const tilt=(rnd(12,4,sg)-.5)*.15;
  network.push([[.49+tilt,.04],[.54,.28],[.49,.52],[.55-tilt,.70],[.51,.96]]);
  for(let i=0;i<spines;i++){
   const y=.16+i*.68/spines,xd=.22+rnd(i,9,sg)*.25,side=(i%2===0?-1:1);
   const pivot=[.50,y],tip=[.50+side*xd,.05+.76*y];
   network.push([pivot,[.50+side*xd*.57,y-.018-rnd(i,12,sg)*.07],tip]);
   pegs.push({x:.38+side*.045+rnd(i,27,sg)*.17,y:y+.05,kind:i%2?'cell-wall':'stoma'});
  }
  pegs.push({x:.50+(rnd(77,3,sg)-.5)*.044,y:.52+(rnd(78,3,sg)-.5)*.16,kind:'stoma'});
  for(let i=0;i<12;i++)chambers.push({x:.13+.74*rnd(i,38,sg),y:.13+.74*rnd(i,39,sg),rx:.035+.047*rnd(i,40,sg),ry:.045+.033*rnd(i,41,sg)});
 }else if(profile==='gill'){
  for(let i=0;i<spines+3;i++){
   const u=.13+i*.74/(spines+3);
   const detail=[ [u,.16],[u+.033,.31],[u-.025,.47],[u+.033,.68],[u-.012,.85] ];
   network.push(detail);chambers.push({x:u,y:.48,rx:.028+.017*rnd(i,15,sg),ry:.19+.062*rnd(i,16,sg)});
   pegs.push({x:u+.023,y:.31+i*.039,kind:'gill-membrane'});
  }
 }else{
  for(let i=0;i<s.lobes+2;i++){
   const ang=i*2*Math.PI/(s.lobes+2),x=.50+Math.cos(ang)*(.222+.061*rnd(i,4,sg)),
     y=.50+Math.sin(ang)*(.197+.075*rnd(i,5,sg));
   const rx=.056+rnd(i,12,sg)*.086,ry=rx*(.65+s.aspect*.32);
   chambers.push({x,y,rx,ry});
   network.push([[.50,.50],[.45+(x-.45)*.55,.47+(y-.47)*.61],[x,y]]);
   pegs.push({x,y,kind:i%2?'cuticle':'membrane'});
  }
 }
 const heights=new Uint16Array(Z),material=new Uint8Array(Z);
 for(let i=0;i<Z;i++){
  const x=(i%N+.5)/N,y=(Math.floor(i/N)+.5)/N,v=source[i]/Q,local=(v-a)/range;
  let volume=0,wall=0;
  for(const c of chambers){
   const dist=Math.hypot((x-c.x)/c.rx,(y-c.y)/c.ry);
   volume=Math.max(volume,sat(1-dist));wall=Math.max(wall,sat(1-Math.abs(dist-.82)*5.4));
  }
  const line=networkDistance(x,y,network),vein=sat(1-line/(.024+.028*wetness));
  const contour=Math.sin(x*119+y*136+sg*.017+v*19)*.014+Math.cos(x*171-y*72+local*11)*.013;
  const h=livingPlant?.24+.26*v+.18*vein+.092*wall-.038*volume+contour:
    .29+.18*v+.076*vein+.19*wall-.144*volume+contour;
  heights[i]=Math.round(sat(h)*Q);material[i]=volume>.43?1:vein>.68?2:wall>.66?5:4;
 }
 const objects=[];
 const w={id,seed:sg,depth:parent.depth+1,size:N,scale:'micro',kind:'micro',structure:profile,
   title:tissueNames[profile],levelName:'Микромир',
   heights,material,source,window,surface:{size:N,heights,waterLevel:null},origin,objects,
   features:{waterPlane:null,caveMask:null,ceilingGrid:null,caveWalls:[],trees:[],channel:[],channelWater:null,tissueNetwork:network,tissueChambers:chambers},
   morphology:{family:profile,channels:network.length,chambers:chambers.length,parentObjectId:object?.id??null},
   flora:[],fauna:[]};
 pegs.forEach((p,i)=>objects.push(specimen(w,p,i,'micro-material')));
 let population=0;
 const matAt=(x,y)=>material[Math.min(N-1,Math.floor(sat(x)*N))+N*Math.min(N-1,Math.floor(sat(y)*N))];
 for(let i=0;i<210&&population<8;i++){
  const x=.13+.74*rnd(i,72,sg),y=.13+.74*rnd(i,73,sg);
  const m=matAt(x,y),fluid=m<=2;
  const kind=i%2?'microbe':'ciliate';
  if((kind==='ciliate')!==fluid)continue;
  let ax=.022+.021*rnd(i,80,sg),ay=.013+.024*rnd(i,81,sg);
  for(let j=0;j<4;j++){
   let ok=true;for(let k=0;k<20;k++){const t=k*Math.PI/10;if((matAt(x+ax*Math.cos(t),y+ay*Math.sin(t))<=2)!==fluid){ok=false;break;}}
   if(ok)break; ax*=.64;ay*=.64;
  }
  const g=specimen(w,{x,y,kind,ax,ay,period:3.4+4*rnd(i,82,sg)},90+population,'micro-organism');
  objects.push(g);population++;
 }
 return w;
}
function basis(parent){return {...parent,id:D.ROOT,depth:0};}
function descend(parent,x,y){
 const u=qcoord(x),v=qcoord(y),id=append(parent,'t'+hex(quant(x),4)+hex(quant(y),4)),
  origin={type:'terrain',x:u,y:v,parentId:parent.id,selectedScale:parent.scale};
 if(parent.scale==='micro')return inside(parent,id,u,v,tissueProfile(null,null,parent),null,origin);
 return fromD(D.descend(basis(parent),u,v),id,parent.depth+1,origin);
}
function enterObject(parent,id,partKey){
 const o=parent.objects.find(o=>o.id===id);
 if(!o)throw Error('Объект не найден в этом мире');
 const key=partKey??o.parts[0].key;
 const anchor=partPose(o,key,0);
 const t=append(parent,'o'+o.id+'-'+key);
 const origin={type:'object',parentId:parent.id,objectId:o.id,objectKind:o.kind,objectRole:o.role,partKey:key,
  selectedScale:o.targetScale,anchor:[anchor.x,anchor.y],genotypeSeed:o.genotype.seed};
 if(o.targetScale==='micro')return inside(parent,t,anchor.x,anchor.y,tissueProfile(o,key,parent),o,origin);
 if(o.targetScale==='macro')return fromD(D.descend(basis(parent),anchor.x,anchor.y),t,parent.depth+1,origin);
 throw Error('Для объекта не задан переход');
}
function enter(parent,x,y,time=0){
 if(typeof x==='string')return enterObject(parent,x,y);
 const match=hit(parent,x,y,time);return match?enterObject(parent,match.id,match.partKey):descend(parent,x,y);
}
function advance(w,s){return s.type==='terrain'?descend(w,s.x,s.y):enterObject(w,s.id,s.partKey);}
function replay(id,n=SIZE){let w=root(n);for(const s of parse(id))w=advance(w,s);return w;}
async function replayAsync(id,n=SIZE,{signal,yieldEvery=1}={}){
 let w=root(n),i=0;const steps=parse(id);for(const s of steps){
  if(signal?.aborted)throw Error('Загрузка отменена');
  w=advance(w,s);if(++i<steps.length&&i%Math.max(1,Math.trunc(yieldEvery))===0)await new Promise(r=>setTimeout(r,0));
 }if(signal?.aborted)throw Error('Загрузка отменена');
 return w;
}
function shade(w){
 if(w.scale!=='micro')return D.shade(w);
 const n=w.size,out=new Uint8ClampedArray(n*n*4),c=w.morphology.family==='leaf'||w.morphology.family==='stem'||w.morphology.family==='matrix'?
  [[17,39,55],[87,158,107],[198,229,161]]:[[27,21,61],[117,61,117],[247,164,131]];
 for(let i=0;i<n*n;i++){
  const x=i%n,y=Math.floor(i/n),d=(w.heights[x?i-1:i]-w.heights[x+1<n?i+1:i])/Q+
   (w.heights[y?i-n:i]-w.heights[y+1<n?i+n:i])/Q;
  const h=sat((w.heights[i]/Q-.16)*2.2)*2,b=Math.min(1,Math.floor(h)),m=w.material[i],l=.83+.36*sat(.50+d*21);
  for(let k=0;k<3;k++){let q=mix(c[b][k],c[b+1][k],h-b)*l;if(m===1)q=mix(q,[34,97,143][k],.48);out[4*i+k]=q;}
  out[4*i+3]=255;
 }
 return out;
}
function mesh(w,{resolution=48}={}){
 if(w.scale!=='micro')return D.mesh(w,{resolution});
 const n=Math.max(8,Math.min(w.size,Math.trunc(resolution)||48)),groups=new Map;
 function tri(name,a,b,c){const p=groups.get(name)||[];if(!groups.has(name))groups.set(name,p);p.push(...a,...b,...c);}
 function quad(name,a,b,c,d){tri(name,a,b,c);tri(name,a,c,d);}
 const xyz=(u,v)=>[u,v,sample(w,u,v)];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const a=x/n,b=y/n,c=(x+1)/n,d=(y+1)/n,j=Math.floor((a+c)/2*w.size)+w.size*Math.floor((b+d)/2*w.size);
  quad(w.material[j]===1?'tissue-fluid':'tissue',xyz(a,b),xyz(c,b),xyz(c,d),xyz(a,d));
 }
 for(const path of w.features.tissueNetwork)for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],N=Math.hypot(b[0]-a[0],b[1]-a[1]),r=.010,
   dx=(a[1]-b[1])*r/N,dy=(b[0]-a[0])*r/N;
  const A=xyz(...a),B=xyz(...b),p=[a[0]+dx,a[1]+dy,A[2]],q=[a[0]-dx,a[1]-dy,A[2]],r1=[b[0]-dx,b[1]-dy,B[2]],s=[b[0]+dx,b[1]+dy,B[2]],
    U=[a[0],a[1],A[2]+.034],V=[b[0],b[1],B[2]+.034];
  quad('tissue-vein',p,U,V,s);quad('tissue-vein',q,U,V,r1);
 }
 for(const a of w.features.tissueChambers)for(let i=0;i<10;i++){
  const at=(t,r)=>xyz(a.x+r*a.rx*Math.cos(t),a.y+r*a.ry*Math.sin(t));
  const t=i*Math.PI/5,s=(i+1)*Math.PI/5,A=at(t,.82),B=at(s,.82),C=at(s,1),D=at(t,1);
  A[2]+=.040;B[2]+=.040;quad('tissue-wall',A,B,C,D);
 }
 return [...groups].map(([material,coords])=>({material,positions:Float32Array.from(coords)}));
}
function drawLife(ctx,w,t=0,project){
 const W=ctx.canvas.width,H=ctx.canvas.height,map=project||((x,y)=>({x:x*W,y:y*H,scale:1}));
 const order=w.objects.map(o=>({o,p:objectPose(o,t)})).sort((a,b)=>a.p.y-b.p.y);
 function ellipse(x,y,a,b,phi,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,a,b,phi,0,2*Math.PI);ctx.fill();}
 function line(color,width,...points){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.stroke();}
 function triangle(color,a,b,c){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.closePath();ctx.fill();}
 for(const {o,p} of order){
  const q=map(p.x,p.y);if(!q||!Number.isFinite(q.x)||!Number.isFinite(q.y))continue;
  const v=o.genotype,g=(q.scale??1)*Math.min(W,H)*o.radius*.89;
  ctx.save();ctx.translate(q.x,q.y);ctx.rotate(p.angle*.72);ctx.scale(g,g);ctx.lineCap='round';
  ellipse(0,.12,.59,.36,0,'rgba(5,19,24,.40)');
  if(o.role==='plant'){
   const aquatic=['coral','fan','reed'].includes(o.kind),color=aquatic?'#edbd96':'#82be83',stalk=aquatic?'#ca906f':'#5c7252';
   line(stalk,.18,[.43,.43],[.09,-.17],[-.45,-.69]);
   for(let i=0;i<v.boughs;i++){
    const y=-.65+i*.92/v.boughs,side=i%2?-1:1,x=-.42+(y+.65)*.75;
    const r=.23+v.aspect*.38-.13*(i/v.boughs);const tilt=side*(.55+v.tilt*.46);
    line(stalk,.087,[x,y],[x+side*r*.80,y-.16]);
    ellipse(x+side*r*.72,y-.11,r*.62,aquatic?.075:.13,tilt,color);
    if(!aquatic&&v.lobes>4)ellipse(x+side*r*.99,y-.20,r*.27,.087,tilt*.77,'#b5d58e');
   }
  }else if(o.role==='animal'){
   const aquatic=['fish','ray'].includes(o.kind),air=['bird','dragonfly'].includes(o.kind),pulse=Math.sin(t*7+o.phase*7);
   const a=.33+v.aspect*.35,b=.18+v.aspect*.21,body=aquatic?'#80c3d8':air?'#e5c391':'#be8a73';
   ellipse(.08,0,a,b,0,body);ellipse(a*.89,-.012,.19,.19,0,'#eddfb2');
   ellipse(a*.98,-.045,.045,.048,0,'#112133');
   for(let i=0;i<v.fins;i++){
    const x=-a+i*(a*1.32)/v.fins;
    for(const side of [-1,1]){
     if(aquatic||air)triangle(air?'#dfddce':'#4c83a7',[x,0],[x-.27,side*(.43+.17*v.aspect+pulse*.12)],[x+.24,side*.12]);
     else line('#655053',.077,[x,side*.10],[x-.15,side*(.41+pulse*.06)],[x-.31,side*.46]);
    }
   }
   if(aquatic)triangle('#679eb7',[-a+.03,0],[-a-.33,-.22-pulse*.08],[-a-.31,.22-pulse*.08]);
  }else{
   const isLive=o.role==='micro-organism',col=isLive?'#ebc9e9':o.kind==='stoma'?'#b9df9d':'#94c0d3';
   ellipse(0,0,.51+v.aspect*.22,.40+v.aspect*.19,0,col);
   ellipse(0,0,.36,.28,0,o.kind==='stoma'?'#3d704e':'#56618d');
   if(isLive)for(let i=0;i<v.lobes+5;i++){
    const a=i*(Math.PI*2)/(v.lobes+5),s=.77+.08*Math.sin(t*10+i);
    line('#ddc6ef',.065,[Math.cos(a)*.43,Math.sin(a)*.39],[Math.cos(a)*s,Math.sin(a)*s]);
   }
   else for(let i=0;i<v.ring;i++)ellipse((i-v.ring*.5)*.095,.04,.052,.12,.34,'#d3eacf');
  }
  ctx.restore();
 }
}
return Object.freeze({ROOT,SIZE,VERSION,root,descend,enter,enterObject,hit,objectPose,partPose,ancestor,parse,replay,replayAsync,box:D.box,sampleMap:D.sampleMap,shade,mesh,pose:objectPose,drawLife});
});
