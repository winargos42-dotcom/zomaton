/* ZomATON botanical geometry extension. Offline and versioned, zow3. */
(function(g,f){if(typeof module==='object'&&module.exports)module.exports=f(require('./baseline/material-engine.js'));else g.ZATBotanical=f(g.ZATMaterial);})(globalThis,M=>{
'use strict';
const Q=65535,SIZE=M.SIZE, V='zow3:', O='zow2:', ROOT=V+M.ROOT.slice(O.length);
const clamp=(v,l,r)=>Math.min(r,Math.max(l,v)),sat=v=>clamp(v,0,1),mix=(a,b,t)=>a+(b-a)*t;
const u16=v=>Math.round(sat(v)*Q);
function rng(x,y,s){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^s;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function oldID(id){if(typeof id!=='string'||!id.startsWith(V))throw Error('Нужен адрес zow3');return O+id.slice(V.length);}
function newID(id){return V+id.slice(O.length);}
function base(w){return {...w,id:oldID(w.id)};}
function nearest(n,x,y){return Math.min(n-1,Math.floor(sat(x)*n))+n*Math.min(n-1,Math.floor(sat(y)*n));}
function slope(w,x,y){
 const v=(dx,dy)=>w.physics.vein[nearest(w.size,x+dx,y+dy)]/Q;
 return [v(.032,0)-v(-.032,0),v(0,.032)-v(0,-.032)];
}
function physicalSignal(w,p){
 const e=w.origin.material, parentGradient=slope(p,e.x,e.y);
 let gx=parentGradient[0],gy=parentGradient[1], anatomical=0;
 if(e.kind==='object'){
  const s=p.objects.find(x=>x.id===e.objectId)?.parts.find(q=>q.key===e.partKey)?.surface;
  if(s){
   const r=(u,v)=>s.physics.vein[nearest(s.size,u,v)]/Q,k=1/s.size;
   gx=mix(gx,r(e.u+k,e.v)-r(e.u-k,e.v),.72);
   gy=mix(gy,r(e.u,e.v+k)-r(e.u,e.v-k),.72);
   anatomical=r(e.u,e.v);
  }
 }
 const q=(e.material==='vein'? .82 :e.material==='plant-cell'?.28:.37),strength=sat(.22+q*.45+e.vascular*.31+anatomical*.16);
 const angle=Math.abs(gx)+Math.abs(gy)>.0001?Math.atan2(gy,gx)+Math.PI/2:(rng(13,15,w.seed)-.5)*2.4;
 const s=(w.seed^Math.round(strength*Q)^Math.round((gx+gy)*97831)^Math.round(e.x*Q)<<3)>>>0;
 return {material:e.material,coordinate:[e.x,e.y],local:e.kind==='object'?[e.u,e.v]:null,vascular:e.vascular,anatomical,
  parentGradient,gradient:[gx,gy],orientation:angle,strength,seed:s};
}
function polyClip(poly,p,q){
 const A=q.x-p.x,B=q.y-p.y,C=(q.x*q.x+q.y*q.y-p.x*p.x-p.y*p.y)*.5,out=[];
 if(!poly.length)return out;
 for(let i=0;i<poly.length;i++){
  const X=poly[i],Y=poly[(i+1)%poly.length],dx=A*X[0]+B*X[1]-C,dy=A*Y[0]+B*Y[1]-C;
  if(dx<=0)out.push(X);
  if((dx<=0)!==(dy<=0)){const t=dx/(dx-dy);out.push([mix(X[0],Y[0],t),mix(X[1],Y[1],t)]);}
 }
 return out;
}
function lineDist(x,y,paths){
 let d=2;
 for(const tube of paths)for(let i=1;i<tube.points.length;i++){
  const [a,b]=tube.points[i-1],[c,e]=tube.points[i],X=c-a,Y=e-b,t=sat(((x-a)*X+(y-b)*Y)/(X*X+Y*Y||1));
  d=Math.min(d,Math.hypot(x-a-X*t,y-b-Y*t));
 }
 return d;
}
const point=(x,y,z)=>[clamp(x,.025,.975),clamp(y,.025,.975),clamp(z,.09,.97)];
function microGeometry(w,s){
 const veinDominant=s.material==='vein',count=veinDominant?13:22,sites=[],cells=[],bridges=[],veins=[];
 const osc=rng(1,7,s.seed),theta=Math.sin(s.orientation)*.27;
 const warp=(x,y)=>[clamp(x+theta*(y-.5),.055,.945),y];
 // Seeded sites + exact Voronoi half-spaces. Chambers are recessed closed walls with an open lumen.
 for(let i=0;i<count;i++){
  const cols=veinDominant?4:5,row=Math.floor(i/cols);
  const [x,y]=warp(.09+(i%cols+.25+.52*rng(i,4,s.seed))*.81/cols,.11+(row+.17+.61*rng(i,5,s.seed))*.79/Math.ceil(count/cols));
  const source=M.sampleMap(w.source,w.size,x,y)/Q;
  sites.push({id:i,x,y,floor:.216+source*.10+((i%3)*.005),height:(veinDominant?.091:.125)+.075*rng(i,9,s.seed)});
 }
 for(const p of sites){
  let polygon=[[.036,.04],[.964,.04],[.964,.96],[.036,.96]];
  for(const q of sites)if(p!==q)polygon=polyClip(polygon,p,q);
  if(polygon.length<3)continue;
  polygon=polygon.map(([x,y])=>[mix(p.x,x,.83),mix(p.y,y,.83)]);
  const roof=p.floor+p.height, aperture=.66+.12*rng(p.id,17,s.seed);
  cells.push({...p,roof,aperture,polygon});
 }
 const width=(veinDominant?.088:.047)+.025*s.strength;
 const center=.43+.16*rng(2,5,s.seed),main=[];
 for(let i=0;i<10;i++){const y=.03+.94*i/9,x=center+theta*(y-.45)+.071*Math.sin(y*(4.1+5*s.strength)+osc*Math.PI);main.push(point(x,y,.36+.077*s.strength+.057*Math.sin(y*4.3+osc)));}
 veins.push({kind:'primary',points:main,radius:width,lumen:veinDominant?.61:.52});
 const branches=(veinDominant?6:3)+Math.floor(rng(8,6,s.seed)*2);
 for(let i=0;i<branches;i++){
  const c=main[1+i%8],d=i%2?1:-1,edge=point(.47+d*(.32+.06*rng(i,15,s.seed)),c[1]-.05+(rng(i,19,s.seed)-.5)*.28,c[2]-.037);
  veins.push({kind:'secondary',points:[c,point(mix(c[0],edge[0],.44),mix(c[1],edge[1],.45)+.052,c[2]+.031),edge],radius:width*(.32+.18*rng(i,44,s.seed)),lumen:.54});
 }
 const pairs=new Set();
 for(const c of cells){
  const order=cells.filter(d=>d!==c).sort((a,b)=>Math.hypot(c.x-a.x,c.y-a.y)-Math.hypot(c.x-b.x,c.y-b.y));
  for(const q of order.slice(0,2)){
   const key=Math.min(c.id,q.id)+':'+Math.max(c.id,q.id);if(pairs.has(key))continue;pairs.add(key);
   const a=point(c.x,c.y,c.roof-.029),b=point(q.x,q.y,q.roof-.029),radius=.012+.011*rng(c.id,q.id,s.seed);
   bridges.push({kind:'stroma',from:c.id,to:q.id,points:[a,point(mix(a[0],b[0],.5),mix(a[1],b[1],.5),Math.max(a[2],b[2])+.033),b],radius,lumen:.32});
  }
 }
 return {kind:veinDominant?'vascular-cross-section':'cellular-lamina',cells,bridges,veins,roots:[],leaves:[],signal:s};
}
function macroGeometry(w,s){
 const roots=[],leaves=[],veins=[],bridges=[],origin=point(.43+.16*rng(0,7,s.seed),.51+rng(4,11,s.seed)*.13,.28);
 const mainTop=point(origin[0]+(rng(3,33,s.seed)-.5)*.17,origin[1]-.055,.69+s.strength*.13);
 const main=[origin,point(origin[0]-.08,origin[1]+.021,.46),mainTop];
 roots.push({kind:'pillar',points:main,radius:.066+.042*s.strength,lumen:.10});
 const count=7+Math.floor(rng(3,14,s.seed)*4),rotate=s.orientation;
 for(let i=0;i<count;i++){
  const a=(i/count)*Math.PI*2+rotate,dx=Math.cos(a),dy=Math.sin(a),len=.19+.24*rng(i,11,s.seed);
  const end=point(origin[0]+dx*len,origin[1]+dy*len,.22+.130*rng(i,8,s.seed)),bend=point(origin[0]+dx*len*.46,origin[1]+dy*len*.51,.36+.06*rng(i,6,s.seed));
  roots.push({kind:'anchor-root',points:[origin,bend,end],radius:.030+.022*rng(i,41,s.seed),lumen:.06});
  if(i%2===0){
   const L=point(end[0]+dy*len*.23,end[1]-dx*len*.20,.21+.061*rng(i,12,s.seed));
   roots.push({kind:'rootlet',points:[bend,end,L],radius:.013+.009*rng(i,57,s.seed),lumen:0});
  }
  const stem=[.475+.074*rng(i,18,s.seed),.34+.122*rng(i,22,s.seed),.46+.14*rng(i,23,s.seed)];
  const axis=point(mix(mainTop[0],origin[0],.55),mix(mainTop[1],origin[1],.55),stem[2]+.03);
  const attachment=point(mainTop[0]+dx*(.12+.14*rng(i,52,s.seed)),mainTop[1]+dy*(.11+.14*rng(i,55,s.seed)),.64+.13*rng(i,42,s.seed));
  roots.push({kind:'canopy-branch',points:[axis,point(mix(axis[0],attachment[0],.64),mix(axis[1],attachment[1],.64),mix(axis[2],attachment[2],.72)-.03),attachment],radius:.014+.016*rng(i,66,s.seed),lumen:0});
  const tip=point(attachment[0]+dx*(.19+.16*rng(i,67,s.seed)),attachment[1]+dy*(.18+.15*rng(i,69,s.seed)),.64+.23*rng(i,48,s.seed));
  const l={id:i,base:attachment,tip,width:.054+.037*rng(i,88,s.seed)+.021*s.strength,ribs:5+Math.floor(rng(i,74,s.seed)*6),curl:(rng(i,85,s.seed)-.35)*.085,kind:i%2?'canopy-lamina':'lamina'};
  leaves.push(l);
 }
 return {kind:'root-canopy-architecture',cells:[],bridges,veins,roots,leaves,signal:s};
}
function enrich(w,parent){
 const id=newID(w.id),origin=w.origin&&({...w.origin,parentId:newID(w.origin.parentId)});
 if(w.realm!=='plant')return {...w,id,origin,botanical:null};
 const signal=physicalSignal(w,parent),botanical=w.scale==='micro'?microGeometry(w,signal):macroGeometry(w,signal);
 const n=w.size,N=n*n,heights=new Uint16Array(N),vein=new Uint16Array(N),materialField=new Uint8Array(N);
 const tubes=w.scale==='micro'?botanical.veins:botanical.roots;
 for(let i=0;i<N;i++){
  const x=(i%n+.5)/n,y=(Math.floor(i/n)+.5)/n,source=w.source[i]/Q,d=lineDist(x,y,tubes);
  const power=sat(1-d/(.041+.032*signal.strength));
  const veins=sat(power*.64+w.physics.vein[i]/Q*.36);vein[i]=u16(veins);
  heights[i]=u16(.17+.26*source+.067*power+.027*Math.sin(x*14+y*18+source*.6));
  materialField[i]=veins>.485?4:source>.47?12:3;
 }
 const physics={...w.physics,vein};
 const organisms=[];
 const objects=w.objects.map((o,i)=>{
  let x=o.x,y=o.y,z=heights[nearest(n,o.x,o.y)]/Q,model='root-dweller',ax=o.ax,ay=o.ay;
  if(w.scale==='micro'){
   if(o.role==='micro-material'){
    const c=botanical.cells[i%botanical.cells.length],k=i%3;
    if(k===0){x=c.x;y=c.y;z=c.floor+.016;model='open-cell-lumen';}
    else {const v=c.polygon[(i+2)%c.polygon.length];x=mix(c.x,v[0],.76);y=mix(c.y,v[1],.76);z=c.roof+.012;model='membrane-rim';}
   }else{
    const c=botanical.cells[(i*71)%botanical.cells.length];
    x=c.x;y=c.y;z=c.roof+.029;ax=.009+.009*rng(i,24,signal.seed);ay=.005+.011*rng(i,31,signal.seed);model='stromal-swimmer';
   }
  }else if(o.role==='plant'){
   const l=botanical.leaves[i%botanical.leaves.length],a=.33+.45*rng(i,50,signal.seed);
   x=mix(l.base[0],l.tip[0],a);y=mix(l.base[1],l.tip[1],a);z=mix(l.base[2],l.tip[2],a)+Math.sin(a*Math.PI)*(l.curl+.06)+.009;model='lamina';
  }else{
   const anchor=botanical.roots[(i*31)%botanical.roots.length],p=anchor.points.at(-1);
   x=p[0];y=p[1];z=p[2]+.013;ax=.008+.011*rng(i,8,signal.seed);ay=.007+.008*rng(i,18,signal.seed);model='canopy-glider';
  }
  const local=vein[nearest(n,x,y)]/Q;
  const parts=o.parts.map(p=>{
   const surface=p.surface,texture=surface.physics.vein;
   const v=Uint16Array.from(texture,q=>u16(sat(.79*q/Q+.21*local)));
   const f=Uint8Array.from(surface.field,(q,i)=>v[i]/Q>.685?4:q===4?3:q);
   return {...p,x:sat(x+p.dx*o.radius),y:sat(y+p.dy*o.radius),z,surface:{...surface,field:f,physics:{...surface.physics,vein:v}}};
  });
  if(o.role==='animal'||o.role==='micro-organism')organisms.push({id:o.id,model,anchor:[x,y,z],vascular:local});
  return {...o,x,y,z,ax,ay,model,parts,traits:{...o.traits,vascularReliance:sat(local*.67+o.traits.vascularReliance*.33)}};
 });
 botanical.organisms=organisms;
 const title=w.scale==='macro'?'Кроны и гигантские корни':signal.material==='vein'?'Сечение сосудистого пучка':'Клетки и строма листа';
 return {...w,id,origin,botanical,heights,materialField,physics,objects,title,structure:botanical.kind,
  surface:{...w.surface,heights},features:{...w.features,botanical},morphology:{...w.morphology,family:botanical.kind,
  cells:botanical.cells.length,tubes:botanical.veins.length,roots:botanical.roots.length,leaves:botanical.leaves.length}};
}
function root(n=SIZE){return enrich(M.root(n));}
function descend(p,x,y){return enrich(M.descend(base(p),x,y),p);}
function enterObject(p,id,key,u=.5,v=.5){return enrich(M.enterObject(base(p),id,key,u,v),p);}
function enter(p,x,y,t=0){const h=M.hit(p,x,y,t);return h?enterObject(p,h.id,h.partKey,h.u,h.v):descend(p,x,y);}
function parse(id){return M.parse(oldID(id));}
function ancestor(id){return newID(M.ancestor(oldID(id)));}
function next(p,s){return s.type==='terrain'?descend(p,s.x,s.y):enterObject(p,s.id,s.partKey,s.u,s.v);}
function replay(id,n=SIZE){let p=root(n);for(const s of parse(id))p=next(p,s);return p;}
async function replayAsync(id,n=SIZE,{signal,yieldEvery=1}={}){
 let p=root(n),i=0;const steps=parse(id),stride=Math.max(1,Math.trunc(yieldEvery)||1);
 for(const s of steps){if(signal?.aborted)throw Error('Отменено');p=next(p,s);if(++i<steps.length&&i%stride===0)await new Promise(r=>setTimeout(r,0));}
 if(signal?.aborted)throw Error('Отменено');return p;
}
function mesh(w,{resolution=48}={}){
 if(!w.botanical)return M.mesh(w,{resolution});
 const groups=new Map(),P=w.botanical,n=Math.max(8,Math.min(w.size,Math.trunc(resolution)||48));
 function push(name,...a){const data=groups.get(name)||[];if(!groups.has(name))groups.set(name,data);for(const p of a)data.push(...p);}
 const quad=(g,a,b,c,d)=>{push(g,a,b,c);push(g,a,c,d);};
 const bed=(x,y)=>[x,y,M.sampleMap(w.heights,w.size,x,y)/Q];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const a=x/n,b=y/n,c=(x+1)/n,d=(y+1)/n;quad('botanical-bed',bed(a,b),bed(c,b),bed(c,d),bed(a,d));
 }
 function tube(T,outerName,innerName,{cut=false,sides=9}={}){
  const len=T.points.length,outer=[],inner=[];
  for(let i=0;i<len;i++){
   const p=T.points[i],a=T.points[Math.max(0,i-1)],b=T.points[Math.min(len-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
   const L=Math.hypot(dx,dy,dz)||1,d=Math.hypot(dx,dy),v=d>.00001?[-dy/d,dx/d,0]:[1,0,0];
   const u=[(dy*v[2]-dz*v[1])/L,(dz*v[0]-dx*v[2])/L,(dx*v[1]-dy*v[0])/L];
   const r=T.radius*(1-(T.kind==='primary'?.17:.42)*i/Math.max(1,len-1));let R=[],r1=[];
   for(let j=0;j<sides;j++){
    const angle=j*Math.PI*2/sides,A=Math.cos(angle),B=Math.sin(angle),k=[v[0]*A+u[0]*B,v[1]*A+u[1]*B,v[2]*A+u[2]*B];
    R.push(p.map((q,c)=>q+k[c]*r));r1.push(p.map((q,c)=>q+k[c]*r*T.lumen));
   }
   outer.push(R);inner.push(r1);
  }
  for(let i=1;i<len;i++)for(let j=0;j<sides;j++){
   const k=(j+1)%sides,A=outer[i-1][j],B=outer[i-1][k],C=outer[i][k],D=outer[i][j];
   const removed=cut&&i<len-1&&i>0&&(A[2]+B[2]+C[2]+D[2])*.25>(T.points[i][2]+T.points[i-1][2])*.5;
   if(!removed)quad(outerName,A,B,C,D);
   if(T.lumen&&innerName&&(!cut||(j%2===0&&!removed)))quad(innerName,inner[i-1][j],inner[i][j],inner[i][k],inner[i-1][k]);
  }
  for(const i of [0,len-1])for(let j=0;j<sides;j++){
   const k=(j+1)%sides;
   quad(outerName,outer[i][j],outer[i][k],inner[i][k],inner[i][j]);
  }
 }
 for(const c of P.cells){
  const b=c.polygon,z0=c.floor,z1=c.roof;
  const pos=(p,z,r=1)=>[mix(c.x,p[0],r),mix(c.y,p[1],r),z];
  for(let i=0;i<b.length;i++){
   const p=b[i],q=b[(i+1)%b.length];
   // Outer high walls. The annulus leaves the central chamber physically open.
   quad('cell-membrane',pos(p,z0,.87),pos(q,z0,.87),pos(q,z1),pos(p,z1));
   quad('cell-rim',pos(p,z1),pos(q,z1),pos(q,z1+.006,c.aperture),pos(p,z1+.006,c.aperture));
   quad('cell-inner',pos(p,z1+.006,c.aperture),pos(q,z1+.006,c.aperture),pos(q,z0+.008,c.aperture*.90),pos(p,z0+.008,c.aperture*.90));
   push('cell-floor',[c.x,c.y,z0+.008],pos(p,z0+.008,c.aperture*.90),pos(q,z0+.008,c.aperture*.90));
  }
 }
 P.veins.forEach(t=>tube(t,'vein-outer','vein-inner',{cut:true,sides:12}));
 P.bridges.forEach(t=>tube(t,'stroma-bridge','stroma-lumen',{sides:7}));
 P.roots.forEach(t=>tube(t,t.kind==='pillar'?'plant-column':t.kind==='canopy-branch'?'canopy-branch':'giant-root',null,{sides:10}));
 for(const l of P.leaves){
  const a=l.base,b=l.tip,dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
  const V=(f,u)=>{
   const width=l.width*Math.sin(Math.PI*f)**1.20*(1+.12*Math.sin(l.ribs*f*Math.PI));
   const k=width*u,z=mix(a[2],b[2],f)+Math.sin(f*Math.PI)*(l.curl+.06*(1-u*u))+.014*Math.sin(3*Math.PI*f)*u;
   return [clamp(mix(a[0],b[0],f)+nx*k,0,1),clamp(mix(a[1],b[1],f)+ny*k,0,1),z];
  };
  const seg=12,wide=6;
  for(let s=0;s<seg;s++)for(let j=0;j<wide;j++){
   const f=s/seg,e=(s+1)/seg,p=-1+2*j/wide,q=-1+2*(j+1)/wide;quad(l.kind,V(f,p),V(e,p),V(e,q),V(f,q));
  }
  const points=Array.from({length:11},(_,j)=>{const p=V(j/10,0);p[2]+=.007;return p;});
  tube({kind:'leaf-vein',points,radius:.008,lumen:0},'lamina-vein',null,{sides:6});
  for(let r=1;r<l.ribs;r++)for(const side of [-1,1]){
   const pos=r/l.ribs,a=V(pos,0),b=V(Math.min(.98,pos+.09),side*.54),c=V(Math.min(.99,pos+.17),side*.88);
   [a,b,c].forEach(p=>p[2]+=.006);
   tube({kind:'leaf-vein',points:[a,b,c],radius:.0037,lumen:0},'lamina-vein',null,{sides:5});
  }
 }
 return [...groups].map(([material,coords])=>({material,positions:Float32Array.from(coords)}));
}
function drawLife(ctx,w,time=0,project){
 if(!w.botanical)return M.drawLife(ctx,w,time,project);
 const W=ctx.canvas.width,H=ctx.canvas.height,map=project||((x,y)=>({x:x*W,y:y*H,scale:1}));
 const list=w.objects.map(o=>({o,p:M.objectPose(o,time)})).sort((a,b)=>a.p.y-b.p.y);
 for(const {o,p} of list){
  if(o.role==='plant'||o.role==='micro-material')continue; // The actual lamina/membrane mesh is the surface.
  const b=map(p.x,p.y,o.z);if(!b||!Number.isFinite(b.x)||!Number.isFinite(b.y))continue;
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(p.angle*.62);const z=Math.min(W,H)*o.radius*(b.scale??1)*.74;ctx.scale(z,z);
  const wave=Math.sin(time*7+o.phase*Math.PI*2),lobes=o.genotype.lobes;
  if(o.model==='canopy-glider'){
   ctx.fillStyle='#e0c384';ctx.beginPath();ctx.moveTo(.49,0);ctx.lineTo(-.32,-.68-wave*.14);ctx.lineTo(-.12,-.14);ctx.lineTo(-.68,0);ctx.lineTo(-.12,.14);ctx.lineTo(-.32,.68+wave*.14);ctx.closePath();ctx.fill();
  }else{
   ctx.fillStyle='#c9a3d5';ctx.beginPath();ctx.ellipse(0,0,.52,.34,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f1d2e8';ctx.lineWidth=.06;
   for(let j=0;j<lobes+4;j++){
    const a=j*Math.PI*2/(lobes+4),x=Math.cos(a),y=Math.sin(a);
    ctx.beginPath();ctx.moveTo(x*.37,y*.22);ctx.lineTo(x*(.66+wave*.07),y*(.51-wave*.07));ctx.stroke();
   }
  }
  ctx.restore();
 }
}
return Object.freeze({ROOT,SIZE,VERSION:'zow3',MATERIALS:M.MATERIALS,root,descend,enter,enterObject,
 hit:M.hit,materialAt:M.materialAt,objectMaterialAt:M.objectMaterialAt,objectPose:M.objectPose,partPose:M.partPose,pose:M.pose,
 box:M.box,sampleMap:M.sampleMap,shade:M.shade,mesh,drawLife,ancestor,parse,replay,replayAsync});
});
