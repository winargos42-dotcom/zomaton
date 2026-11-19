/* CPU perspective rasterizer. Terrain, water, roof, and plant meshes share one depth/pick buffer. */
(function(root,f){if(typeof module==='object'&&module.exports)module.exports=f(require('../engine/engine.js'),require('./materials.js'));else root.ZATPerspective=f(root.ZATBotanical,root.ZATBotanicalsUI);})(globalThis,(engine,labels)=>{
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), sat=x=>clamp(x,0,1), mix=(a,b,t)=>a+(b-a)*t;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const unit=a=>{const m=Math.hypot(...a)||1;return a.map(v=>v/m)};
const mp=(x,y)=>Math.sin(x*83.613+y*57.619)*43758.5453;
const grain=(x,y)=>{const a=mp(x,y);return a-Math.floor(a)};
const STYLES={
 cavern:{eye:[.51,.82,.235],look:[.47,.23,.28],sky0:[25,45,68],sky1:[88,130,147],fog:[45,37,48],stone:[[26,24,31],[66,51,54],[127,88,76],[183,125,100]],sun:[-.40,.28,.89]},
 archipelago:{eye:[.30,-.38,.56],look:[.52,.72,.33],sky0:[63,121,155],sky1:[180,211,197],fog:[116,170,172],stone:[[29,61,61],[167,151,105],[96,123,71],[199,192,132]],sun:[-.39,-.36,.84]},
 'forest-ravine':{eye:[.46,.065,.65],look:[.55,.70,.35],sky0:[86,133,136],sky1:[171,193,165],fog:[108,143,124],stone:[[31,49,38],[65,83,47],[110,120,70],[159,145,97]],sun:[-.43,-.18,.88]},
 lithic:{eye:[.34,-.035,.66],look:[.54,.76,.26],sky0:[35,43,59],sky1:[129,139,143],fog:[94,100,108],stone:[[26,29,40],[66,74,83],[123,128,134],[189,194,185]],sun:[-.51,-.20,.83]},
 thermal:{eye:[.31,-.02,.64],look:[.52,.76,.29],sky0:[38,22,42],sky1:[118,58,65],fog:[98,60,66],stone:[[26,20,30],[73,33,45],[150,66,41],[237,151,72]],sun:[-.51,.33,.81]},
 petri:{eye:[.47,.03,.51],look:[.53,.65,.22],sky0:[13,39,47],sky1:[24,72,68],fog:[26,69,64],stone:[[20,50,54],[44,103,69],[104,163,93],[212,218,127]],sun:[-.37,-.19,.91]},
 canopy:{eye:[.43,.012,.58],look:[.53,.69,.39],sky0:[17,52,53],sky1:[92,138,104],fog:[52,101,72],stone:[[18,44,40],[39,92,62],[82,146,74],[186,184,101]],sun:[-.39,-.26,.88]},
 botanical:{eye:[.34,-.06,.64],look:[.54,.76,.27],sky0:[31,62,49],sky1:[153,189,141],fog:[105,153,104],stone:[[21,45,37],[47,114,58],[100,160,75],[213,221,131]],sun:[-.36,-.30,.87]},
 micro:{eye:[.38,.015,.66],look:[.54,.76,.21],sky0:[42,45,68],sky1:[87,127,131],fog:[82,106,111],stone:[[28,52,59],[105,155,103],[195,208,139],[234,207,168]],sun:[-.31,.36,.81]},
 genesis:{eye:[.30,-.02,.64],look:[.55,.65,.24],sky0:[35,87,123],sky1:[164,194,180],fog:[112,153,153],stone:[[24,52,54],[70,109,77],[122,154,108],[199,190,134]],sun:[-.34,-.37,.89]}
};
const SCALE=.70;
function projectCamera(config,w,h){
 const forward=unit(sub(config.look,config.eye)),right=unit(cross(forward,[0,0,1])),up=cross(right,forward);
 const focal=h*(config.focal??1.0);
 return p=>{
  const delta=sub(p,config.eye),z=dot(delta,forward),d=1/Math.max(.012,z);
  return {sx:w*.5+dot(delta,right)*focal*d,sy:h*.5-dot(delta,up)*focal*d,z,wx:p[0],wy:p[1]};
 };
}
function data(world,key){
 const s=world.surface??world;
 const a=s[key]??world.features?.[key]??world[key];
 return a&&typeof a==='object'&&'grid' in a?a.grid:a;
}
function values(world){
 const h=data(world,'heights'), c=data(world,'ceilingGrid');
 if(!h||!h.length)throw Error('Нет поверхности мира');
 const n=world.surface?.size??world.size??Math.sqrt(h.length);
 const terrain=(x,y)=>sample(h,n,x,y)*(h instanceof Uint16Array?1/65535:1);
 const ceil=(x,y)=>c?sample(c,n,x,y)*(c instanceof Uint16Array?1/65535:1):NaN;
 const wl=world.surface?.waterLevel??world.features?.waterPlane?.z??world.waterLevel;
 return {terrain,ceil,hasCeil:!!c,water:Number.isFinite(wl)&&wl>0?wl:null};
}
function sample(arr,n,u,v){
 const x=clamp(u,0,1)*(n-1),y=clamp(v,0,1)*(n-1),i=Math.floor(x),j=Math.floor(y),r=Math.min(n-1,i+1),s=Math.min(n-1,j+1);
 const q=[arr[j*n+i],arr[j*n+r],arr[s*n+i],arr[s*n+r]];
 return q.some(v=>!Number.isFinite(v))?NaN:mix(mix(q[0],q[1],x-i),mix(q[2],q[3],x-i),y-j);
}
function render(world,width=480,height=360,core=engine){
 const realm=String(world.realm??world.domain??world.origin?.realm??'').toLowerCase();
 const inFire=/fire|thermal|lava|melt|heat/.test(realm),inPlant=/plant|veget|botan|green|leaf/.test(realm);
 const kind=inFire?'thermal':inPlant&&world.botanical?(world.scale==='micro'?'petri':'canopy'):inPlant?'botanical':realm==='stone'?'lithic':world.scale==='micro'?'micro':world.structure==='cavern'||world.structure==='archipelago'||world.structure==='forest-ravine'?world.structure:'genesis';
 const style=kind==='micro'&&!/leaf|stem|matrix/.test(world.structure)?{...STYLES.micro,sky0:[35,28,61],sky1:[109,85,108],fog:[92,64,102],stone:[[35,21,49],[119,64,96],[198,100,130],[250,194,147]]}:STYLES[kind], val=values(world), dims=width*height;
 const pixels=new Uint8ClampedArray(dims*4), zbuf=new Float32Array(dims).fill(Infinity);
 const pickX=new Float32Array(dims).fill(NaN),pickY=new Float32Array(dims).fill(NaN),mask=new Uint8Array(dims),meshHits=new Uint8Array(dims);
 const meshNames=['background'];
 const project=projectCamera(style,width,height),sun=unit(style.sun);
 const field=world.materialField, perMaterial=field&&core.materialAt;
 let counts=[0,0,0,0,0];  // sky, ground, water, ceiling, plants
 const horizon=project([style.eye[0],100,style.eye[2]]).sy;
 for(let y=0;y<height;y++){
  const h=sat((y-horizon+height*.52)/(height*.52)),o=style.sky0.map((v,i)=>mix(v,style.sky1[i],h));
  for(let x=0;x<width;x++){
   const i=(y*width+x)*4,underLeaf=kind==='petri'||kind==='canopy';
   const beam=underLeaf?16*Math.pow(sat(.61+.28*Math.sin(x*.027+y*.011)+.19*Math.sin(x*.014-y*.026)),3):0;
   const cloud=kind==='cavern'||underLeaf?0:Math.pow(sat(.45+.32*Math.sin(x/32-y*.11)+.23*Math.sin(x/59+y*.14)-.91),1.07)*95;
   const haze=kind==='cavern'?Math.max(0,1-Math.hypot((x-width*.52)/(width*.58),(y-height*.12)/(height*.62)))*24:0;
   for(let c=0;c<3;c++)pixels[i+c]=o[c]+cloud+haze+beam;
   pixels[i+3]=255;
  }
 }
 const tinted={
  burn:[248,89,33], ember:[252,117,35], molten:[246,78,32], lava:[250,96,35],
  rock:[116,113,114], soil:[134,115,85], leaf:[84,157,70], water:[63,126,150], plant:[97,169,72]
 };
 function surfaceType(x,y){
  if(!perMaterial||x<0||x>1||y<0||y>1)return '';
  const n=world.size, q=v=>Math.min(n-1,Math.floor(Math.round(v*65535)*n/65535));
  if(field.length===n*n){
   switch(field[q(y)*n+q(x)]){
    case 1:case 9:return 'rock';
    case 2:case 11:return 'lava';
    case 3:case 4:case 12:return 'leaf';
    case 5:return 'water';case 6:return 'soil';case 10:return 'ember';
    default:return '';
   }
  }
  const k=labels.key(core.materialAt(world,x,y,0,'terrain'));
  if(/lava|melt|molten|magma|flame|heat/.test(k))return 'lava';
  if(/leaf|green|vein|plant|cell|chlorophyll/.test(k))return 'leaf';
  if(/stone|rock|basalt|mineral|granite|crystal/.test(k))return 'rock';
  if(/sediment|sand|soil/.test(k))return 'soil';
  if(/water/.test(k))return 'water';
  return '';
 }
 function triangle(a,b,c,color,material,opts){
  const near=.025, polygon=[a,b,c],depths=polygon.map(p=>project(p).z);
  if(depths.every(d=>d<near))return;
  if(depths.some(d=>d<near)){
   const out=[];
   for(let i=0;i<3;i++){
    const j=(i+1)%3,k=depths[i]>=near,v=depths[j]>=near;
    if(k)out.push(polygon[i]);
    if(k!==v){const t=(near-depths[i])/(depths[j]-depths[i]);out.push(polygon[i].map((x,axis)=>mix(x,polygon[j][axis],t)));}
   }
   for(let i=1;i+1<out.length;i++) clipped(out[0],out[i],out[i+1],color,material,opts);
  }else clipped(a,b,c,color,material,opts);
 }
 function clipped(a,b,c,color,material,opts){
  const A=project(a),B=project(b),C=project(c);
  const loX=Math.max(0,Math.floor(Math.min(A.sx,B.sx,C.sx))),hiX=Math.min(width-1,Math.ceil(Math.max(A.sx,B.sx,C.sx)));
  const loY=Math.max(0,Math.floor(Math.min(A.sy,B.sy,C.sy))),hiY=Math.min(height-1,Math.ceil(Math.max(A.sy,B.sy,C.sy)));
  if(loX>hiX||loY>hiY)return;
  const den=(B.sy-C.sy)*(A.sx-C.sx)+(C.sx-B.sx)*(A.sy-C.sy);
  if(Math.abs(den)<1e-6)return;
  const na=unit(cross(sub(b,a),sub(c,a)));
  if(na[2]<0&&(material===1||opts?.botanical))for(let i=0;i<3;i++)na[i]*=-1;
  let light=material===2?.94:clamp((material===3?.53:.59)+Math.abs(dot(na,sun))*.49,.32,1.20);
  const variation=opts?.vary===false?1:opts?.botanical?.96+grain(a[0]*138.1,a[1]*138.1)*.07:.87+grain(a[0]*138.1,a[1]*138.1)*.21;
  if(opts?.botanical)light=.47+.63*Math.max(0,dot(na,sun))+.15*Math.abs(na[2]);

  light*=variation;
  for(let y=loY;y<=hiY;y++)for(let x=loX;x<=hiX;x++){
   const u=((B.sy-C.sy)*(x+.5-C.sx)+(C.sx-B.sx)*(y+.5-C.sy))/den;
   if(u<-.00001)continue;
   const v=((C.sy-A.sy)*(x+.5-C.sx)+(A.sx-C.sx)*(y+.5-C.sy))/den,w=1-u-v;
   if(v<-.00001||w<-.00001)continue;
   const ua=u/A.z,vb=v/B.z,wc=w/C.z,depth=1/(ua+vb+wc),off=y*width+x;
   if(depth>=zbuf[off])continue;
   const X=(ua*A.wx+vb*B.wx+wc*C.wx)*depth,Y=(ua*A.wy+vb*B.wy+wc*C.wy)*depth;
   if(opts?.filter&&!opts.filter(X,Y))continue;
   zbuf[off]=depth;pickX[off]=X>=0&&X<=1&&Y>=0&&Y<=1?X:NaN;pickY[off]=Number.isFinite(pickX[off])?Y:NaN;mask[off]=material;meshHits[off]=opts?.meshId??0;
   const fog=clamp((depth-.48)/(kind==='cavern'?2.35:2.15),0,kind==='cavern'?.31:.70),i=off*4;
   let ripple=material===2?5*Math.sin(X*165+Y*269)+3.6*Math.sin((X+Y)*44):0;
   const striation=material===3?7*Math.sin((X+Y)*44+depth*28):0;
   if(material===2&&kind==='archipelago'&&y<height*.48)ripple+=10;
   const type=!opts?.botanical&&(material===1||material===2)?surfaceType(X,Y):'';
   if(type==='lava'){
    const hot=.62+.38*Math.abs(Math.sin(X*96+Math.sin(Y*109)*.86)*Math.cos(Y*121));
    const rim=.82+.18*Math.abs(Math.sin(X*337+Y*178));
    pixels[i]=224+30*hot;pixels[i+1]=56+125*hot*rim;pixels[i+2]=14+58*hot*hot;
   }else{
    const t=tinted[type], f=type==='rock'?.22:type==='leaf'?.32:type==='soil'?.12:.11;
    const fleck=opts?.botanical?2.7*Math.sin(X*466+Y*317)*Math.sin(X*132-Y*489):0;
    const glint=opts?.biolight?11+9*Math.sin(6*Y+X*17):0;
    for(let c=0;c<3;c++)pixels[i+c]=mix((t?mix(color[c],t[c],f):color[c])*light+ripple+striation+fleck+glint,style.fog[c],fog);

   }
  }
 }
 const meshes=core?.mesh(world,{resolution:62});
 if(!meshes)throw Error('Нет геометрии для перспективы');
 const bot=(color,mask=4,biolight=false)=>({color,mask,botanical:true,biolight});
 const shades={
  'botanical-bed':bot([47,103,78],1),
  'cell-membrane':bot([114,173,123],3,true),
  'cell-rim':bot([160,209,143],4,true),
  'cell-inner':bot([58,110,104],3),
  'cell-floor':bot([39,98,91],1),
  'cell-core':bot([173,200,111],4,true),
  'stroma-bridge':bot([86,152,118],4),
  'stroma-lumen':bot([142,205,158],4,true),
  'vein-inner':bot([191,199,128],4,true),
  'vein-outer':bot([68,129,86],3),
  'plant-column':bot([85,132,69],3),
  'giant-root':bot([116,132,70],3),
  'canopy-branch':bot([97,137,71],3),
  'lamina':bot([94,145,74],4),
  'lamina-vein':bot([178,201,111],4,true),
  'canopy-lamina':bot([71,145,82],4),

  'open-water':{color:inFire?[236,83,30]:inPlant?[113,189,92]:[36,117,146],mask:2,vary:false},
  'channel-water':{color:inFire?[222,71,27]:inPlant?[108,183,82]:[56,121,107],mask:2,vary:false},
  'ceiling':{color:[71,56,61],mask:3},
  'cave-wall':{color:[115,79,71],mask:3},
  'vascular-ridge':{color:[123,194,94],mask:4},
  'fracture-wall':{color:[55,49,45],mask:3},
  'molten-channel':{color:[249,96,31],mask:2,vary:false},
  'heat-channel':{color:[247,102,30],mask:2,vary:false},
  'thermal-flow':{color:[246,99,23],mask:2,vary:false},
  'fracture':{color:[43,39,42],mask:3},
  'rock-wall':{color:[112,105,105],mask:3},
  'plant-vein':{color:[103,179,74],mask:4},
  'tissue-vein':{color:/leaf|stem|matrix/.test(world.structure)?[130,184,92]:[173,96,151],mask:4},
  'tissue-wall':{color:/leaf|stem|matrix/.test(world.structure)?[164,150,119]:[198,134,137],mask:3},
  'tissue-fluid':{color:/leaf|stem|matrix/.test(world.structure)?[46,120,132]:[92,79,144],mask:2,vary:false},
  'trunk':{color:[85,64,49],mask:4},
  'canopy':{color:[46,101,64],mask:4}
 };
 if(kind==='archipelago'&&val.water!==null){
  const z=val.water*SCALE;
  const k={vary:false};
  triangle([-4,-2,z],[5,-2,z],[-4,7,z],[38,113,142],2,k);
  triangle([5,-2,z],[5,7,z],[-4,7,z],[38,113,142],2,k);
 }
 for(const layer of meshes){
  const {material,positions}=layer;const meshId=meshNames.push(material)-1;
  const styleOverride=shades[material]??(world.botanical&&/membrane|lamina|stroma|vein|cell|root|canopy/.test(material)?bot(/membrane|cell/.test(material)?[102,177,115]:[111,149,69]):undefined)??(/heat|flame|magma|molten|lava|thermal/.test(material)?{color:[241,90,24],mask:2,vary:false}:undefined);
  if(material==='ceiling'||(kind==='archipelago'&&material==='open-water'))continue;
  const options={...styleOverride,meshId};
  for(let i=0;i<positions.length;i+=9){
   const a=[positions[i],positions[i+1],positions[i+2]*SCALE];
   const b=[positions[i+3],positions[i+4],positions[i+5]*SCALE];
   const c=[positions[i+6],positions[i+7],positions[i+8]*SCALE];
   let color;
   if(styleOverride) color=styleOverride.color;
   else {
    const k=sat(((a[2]+b[2]+c[2])/(3*SCALE))*1.28)*3,j=Math.min(2,Math.floor(k)),f=k-j;
    color=style.stone[j].map((v,i)=>mix(v,style.stone[j+1][i],f));
   }
   triangle(a,b,c,color,styleOverride?.mask??1,options);
  }
 }
 if(kind==='cavern'&&val.hasCeil){
  const c=data(world,'ceilingGrid'),sz=world.surface?.size??world.size, roofAt=(x,y)=>{
   const a=clamp(Math.round(x*sz-.5),0,sz-1),b=clamp(Math.round(y*sz-.5),0,sz-1);return c[b*sz+a];
  };
  const smoothRoof=(x,y)=>{
   let sum=0,n=0;
   for(const dx of [-.006,.006])for(const dy of [-.006,.006]){
    const a=roofAt(x+dx,y+dy);if(Number.isFinite(a)){sum+=a;n++;}
   }
   return (n?sum/n:.66)*SCALE;
  };
  const n=92;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const x=i/n,y=j/n,b=(i+1)/n,d=(j+1)/n;
   if(!Number.isFinite(roofAt((x+b)*.5,(y+d)*.5)))continue;
   const A=[x,y,smoothRoof(x,y)],B=[b,y,smoothRoof(b,y)],C=[x,d,smoothRoof(x,d)],D=[b,d,smoothRoof(b,d)];
   triangle(A,B,C,[84,67,75],3);triangle(B,D,C,[84,67,75],3);
  }
 }
 if(kind==='cavern'&&val.hasCeil)for(let k=0;k<48;k++){
  const x=.05+.90*grain(k,.12),y=.09+.88*grain(k,.27),z=val.ceil(x,y)*SCALE,h=.024+.062*grain(k,.38),r=.003+.011*grain(k,.49);
  if(!Number.isFinite(z))continue;
  const tip=[x+.003,y+.004,z-h],q=[[x-r,y-r,z],[x+r,y-r,z],[x+r,y+r,z],[x-r,y+r,z]];
  for(let j=0;j<4;j++)triangle(q[j],q[(j+1)%4],tip,j%2?[104,82,76]:[66,52,62],3);
 }
 const visibleGroups=Object.fromEntries(meshNames.map(name=>[name,0]));
 for(let i=0;i<mask.length;i++){counts[mask[i]]++;visibleGroups[meshNames[meshHits[i]]]++;}
 function pick(fx,fy){
  if(!Number.isFinite(fx)||!Number.isFinite(fy)||fx<0||fy<0||fx>1||fy>1)return null;
  const x=clamp(Math.floor(fx*width),0,width-1),y=clamp(Math.floor(fy*height),0,height-1),i=y*width+x;
  return Number.isFinite(pickX[i])?{x:pickX[i],y:pickY[i],material:mask[i],geometry:meshNames[meshHits[i]]}:null;
 }
 return {pixels,width,height,pick,counts,visibleGroups,project:(x,y,z)=>project([x,y,z*SCALE]),terrain:val.terrain,depthAt:(u,v)=>zbuf[clamp(Math.floor(v*height),0,height-1)*width+clamp(Math.floor(u*width),0,width-1)]};
}
return Object.freeze({render});
});
