/* The same visible primitives are painted and hit-tested. No buttons or hitboxes stand in for bodies. */
(function(root,f){const m=f();if(typeof module==='object'&&module.exports)module.exports=m;else root.ZATObjectLayer=m;})(globalThis,()=>{
'use strict';
const sat=x=>Math.max(0,Math.min(1,x));
const clamp=(x,l,h)=>Math.max(l,Math.min(h,x));
const tone=(obj,key)=>{
 const s=obj.kind?.toLowerCase()||'',t=key?.toLowerCase()||'';
 if(t.includes('wing'))return s.includes('bird')?['#ffe2b1','#4d9fa5','#223c59']:['#f2c75d','#fd9569','#51376c'];
 if(t.includes('eye'))return ['#f7f0dc','#e2dbb5','#1a2632'];
 if(t.includes('petal')||t.includes('flower'))return ['#f7a3ba','#eb668c','#602650'];
 if(t.includes('leaf')||t.includes('stem'))return ['#d3f57d','#5dbd67','#234e3d'];
 if(s.includes('crystal'))return ['#e6ffff','#75b5ec','#384b84'];
 if(s.includes('spore')||s.includes('pollen')||s.includes('cell'))return ['#fae887','#dda948','#653c68'];
 if(obj.role==='fauna'||obj.role==='animal'||/beetle|mite|bird|fish|butterfly|moth|insect|tardigrade/.test(s))return ['#fff0ac','#db795d','#512f55'];
 if(/seed|spore|crystal|lake|cell/.test(s))return ['#dcf0af','#a489d4','#465c7b'];
 return ['#fcdfac','#78cd6f','#30543d'];
};
function roles(key, kind){
 const k=String(key||'').toLowerCase(),s=String(kind||'').toLowerCase();
 if(/wing|flap/.test(k))return 'wing';
 if(/leaf|blade|petal|frond/.test(k))return 'leaf';
 if(/stem|stalk|antenna|tail/.test(k))return 'stem';
 if(/facet|crystal|prism/.test(k)||/crystal/.test(s))return 'stone';
 if(/shell|body|head|thorax|eye|back|bell|leg|fin/.test(k))return 'body';
 if(/flora|flower|fern|orchid|plant|willow|lotus/.test(s))return 'bud';
 return 'body';
}
function geom(x,y,r,k,a){
 const point=(u,v)=>[x+u*r*Math.cos(a)-v*r*Math.sin(a),y+u*r*Math.sin(a)+v*r*Math.cos(a)];
 if(k==='leaf'||k==='wing')return {type:'poly',points:[[-1,0],[-.55,-.55],[.03,-.69],[.76,-.45],[1.06,-.05],[.62,.54],[-.08,.57],[-.61,.40]].map(p=>point(...p))};
 if(k==='stem')return {type:'poly',points:[[-.93,-.10],[1,-.18],[1,.15],[-.94,.11]].map(p=>point(...p))};
 if(k==='stone')return {type:'poly',points:[[-.76,.54],[-.82,-.13],[-.28,-.90],[.35,-.78],[.70,-.20],[.64,.67],[.21,.82]].map(p=>point(...p))};
 if(k==='bud'){
  const petals=[];for(let i=0;i<20;i++){const b=i*Math.PI/10,f=i%4===0?1:i%2===0?.72:.80;petals.push(point(f*Math.cos(b),f*Math.sin(b)));}
  return {type:'poly',points:petals};
 }
 return {type:'ellipse',x,y,rx:r*.89,ry:r*.60,angle:a};
}
function hitShape(shape,x,y){
 if(shape.type==='ellipse'){
  const dx=x-shape.x,dy=y-shape.y,c=Math.cos(shape.angle),s=Math.sin(shape.angle);
  return ((dx*c+dy*s)/shape.rx)**2+((-dx*s+dy*c)/shape.ry)**2<=1;
 }
 let inside=false;
 for(let i=0,j=shape.points.length-1;i<shape.points.length;j=i++){
  const [a,b]=shape.points[i],[c,d]=shape.points[j];
  if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
 }
 return inside;
}
function toPath(ctx,s){
 ctx.beginPath();
 if(s.type==='ellipse'){ctx.ellipse(s.x,s.y,s.rx,s.ry,s.angle,0,2*Math.PI);return;}
 for(const [i,[x,y]] of s.points.entries())if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
 ctx.closePath();
}
function layout(world,projection,engine,time=0){
 const entries=[];
 for(const object of world.objects??[]){
  const place=engine.objectPose?.(object,time)??object;
  const dx=(place.x??object.x)-object.x,dy=(place.y??object.y)-object.y;
  const footprint=projection.project(object.x+dx,object.y+dy,object.z??projection.terrain(object.x,object.y));
  if(footprint.z<.045)continue;
  for(const part of object.parts??[]){
   const actual=engine.partPose?.(object,part.key,time);
   const anchorX=actual?.x??part.x+dx,anchorY=actual?.y??part.y+dy;
   const z=(actual?.z??part.z??object.z??projection.terrain(anchorX,anchorY))+(object.role==='plant'?(part.key==='leaf'?.035:.016):.015);
   const p=projection.project(anchorX,anchorY,z),surface=projection.depthAt(p.sx/projection.width,p.sy/projection.height);
   if(p.z<.045||p.z>surface+.058||p.sx<-35||p.sx>projection.width+35||p.sy<-35||p.sy>projection.height+35)continue;
   const raw=part.r??Math.max(.013,(object.scale??1)*.015),q=projection.project(anchorX+raw,anchorY,z);
   const size=clamp(Math.hypot(q.sx-p.sx,q.sy-p.sy),9,47)*(/stem/.test(part.key)?1.10:1);
   const k=roles(part.key,object.kind);
   const a=(place.angle??0)+({wing:-.62,leaf:-.60,stem:-1.37,stone:.14,bud:0,body:.25}[k]);
   const add=(x,y,r,kind,angle,palette=tone(object,part.key),priority=0)=>{
    const adapted=world.realm==='fire'?(object.role==='animal'||object.role==='micro-organism'
      ? ['#fff4a1','#ea6335','#6e2637'] : ['#ffbd64','#c44f36','#56303c'])
      : world.realm==='stone'?['#deebf9','#8eacc7','#485363']
      :world.realm==='plant'&&object.role!=='animal'?['#deed98','#76b863','#2b503a']:palette;
    entries.push({object,part,kind,shape:geom(x,y,r,kind,angle),z:p.z+.01*priority,x,y,size:r,angle,tone:adapted});
   };
   const style=String(object.kind||'').toLowerCase();
   if(object.role==='plant'&&part.key==='leaf'){
    const x0=footprint.sx,y0=footprint.sy,dist=Math.hypot(x0-p.sx,y0-p.sy);
    if(dist>4)add((x0+p.sx)/2,(y0+p.sy)/2,dist*.53+1.4,'stem',Math.atan2(y0-p.sy,x0-p.sx),['#94c584','#5a9356','#40603c'],2);
    add(p.sx-size*.56,p.sy+size*.42,size*.62,'leaf',a+1.8,['#dbeb87','#67a95b','#285344'],1);
    add(p.sx+size*.50,p.sy+size*.29,size*.54,'leaf',a-.43,['#c5e390','#59965a','#25443a'],1);
   }
   if(object.role==='animal'&&part.key==='body'){
    const dir=a-.45;
    if(/bird|moth|butterfly|dragonfly/.test(style)){
     add(p.sx-size*.58,p.sy-size*.46,size*1.10,'wing',dir+.92,tone(object,'wing'),2);
     add(p.sx+size*.56,p.sy-size*.45,size*1.10,'wing',dir-.79,tone(object,'wing'),2);
     add(p.sx-size*.85,p.sy+size*.20,size*.63,'leaf',dir+1.66,['#b2ead1','#60b3b5','#284858'],1);
     add(p.sx+size*.63,p.sy-size*.05,size*.46,'body',dir,['#f9d37f','#d6815c','#392a39'],0);
     add(p.sx+size*.74,p.sy-size*.15,size*.11,'body',dir,['#ecfffa','#3e5965','#18242a'],-1);
    }else if(/fish|ray/.test(style)){
     add(p.sx-size*.91,p.sy+size*.24,size*.57,'leaf',dir+1.72,tone(object,'wing'),2);
     add(p.sx-size*.06,p.sy+size*.45,size*.49,'leaf',dir-.42,tone(object,'wing'),1);
    }else{
     for(let j=-1;j<=1;j++){
      add(p.sx+j*size*.44,p.sy+size*.42,size*.58,'stem',1.15,['#f8c471','#a76253','#523a43'],2);
      add(p.sx+j*size*.40,p.sy-size*.41,size*.52,'stem',1.96,['#f8c471','#a76253','#523a43'],2);
     }
    }
   }
   add(p.sx,p.sy,size,k,a);
  }
 }
 entries.sort((a,b)=>b.z-a.z||a.part.key.localeCompare(b.part.key)||a.object.id.localeCompare(b.object.id));
 function hit(u,v){
  const x=u*projection.width,y=v*projection.height;
  for(let i=entries.length-1;i>=0;i--){
   const e=entries[i];if(!hitShape(e.shape,x,y))continue;
   const c=Math.cos(e.angle),s=Math.sin(e.angle),dx=x-e.x,dy=y-e.y;
   return {object:e.object,part:e.part,localX:sat(.5+(dx*c+dy*s)/(2.25*e.size)),localY:sat(.5+(-dx*s+dy*c)/(2.25*e.size))};
  }
  return null;
 }
 return {entries,hit};
}
function draw(ctx,layer){
 for(const e of layer.entries){
  const [hi,mid,deep]=e.tone;
  ctx.save();ctx.lineJoin='round';
  toPath(ctx,e.shape);
  const g=ctx.createLinearGradient(e.x-e.size*.72,e.y-e.size*.72,e.x+e.size*.57,e.y+e.size);
  g.addColorStop(0,hi);g.addColorStop(.36,mid);g.addColorStop(1,deep);
  ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=deep;ctx.lineWidth=1.25;ctx.stroke();ctx.clip();
  ctx.globalAlpha=.65;ctx.lineWidth=Math.max(.8,e.size*.055);ctx.strokeStyle=hi;
  ctx.translate(e.x,e.y);ctx.rotate(e.angle);
  const surface=e.part.surface;
  if(surface?.field&&surface.size&&e.size>=10){
   const n=surface.size,cell=e.size*2.25/n,origin=-e.size*1.125;
   const swatch={1:'#b9ac9d',2:'#ffa229',3:'#93de63',4:'#dfeb9d',5:'#61bbd7',6:'#a69378',7:'#f28a94',8:'#e4af7d',9:'#b5d9eb',10:'#c67b52',11:'#ffca45',12:'#b7db73'};
   ctx.globalAlpha=.34;
   for(let i=0;i<surface.field.length;i++){
    const color=swatch[surface.field[i]];if(!color)continue;
    ctx.fillStyle=color;ctx.fillRect(origin+(i%n)*cell,origin+Math.floor(i/n)*cell,cell+.05,cell+.05);
   }
   ctx.globalAlpha=.65;
  }
  ctx.beginPath();
  if(e.kind==='wing'||e.kind==='leaf'||e.kind==='stone'){
   ctx.moveTo(-e.size*.75,0);ctx.lineTo(e.size*.83,0);
   for(let j=-2;j<=2;j++){
    const x=j*e.size*.19;ctx.moveTo(x,0);ctx.lineTo(x+e.size*.25,-e.size*.49);ctx.moveTo(x,0);ctx.lineTo(x+e.size*.16,e.size*.43);
   }
  }else{
   ctx.ellipse(-e.size*.26,-e.size*.14,e.size*.36,e.size*.13,-.13,Math.PI*.13,Math.PI*.98);
   if(e.kind==='bud')for(let j=0;j<5;j++){const a=j*Math.PI*.4;ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*e.size*.73,Math.sin(a)*e.size*.73);}
  }
  ctx.stroke();ctx.restore();
 }
}
return Object.freeze({layout,draw,geom,hitShape});
});
