'use strict';
const {createCanvas,ImageData,GlobalFonts}=require('@napi-rs/canvas'),{writeFileSync}=require('node:fs'),{createHash}=require('node:crypto'),assert=require('node:assert/strict'),E=require('./engine.js');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','Evidence Sans');
const genesis=E.root(), canyon=E.descend(genesis,.295,.721),reef=E.descend(genesis,.645,.255);
const microA=E.descend(canyon,.645,.255),microB=E.descend(reef,.341,.882);
const panels=[
 [canyon,'01 / Речные острова','Каньон: ивы, камыш, стрекозы и рыбы'],
 [reef,'01 / Коралловая бухта','Архипелаг: кораллы, рыбы и скаты'],
 [microA,'02 / Лабиринт волокон','Микромир каньона: волокна и личинки'],
 [microB,'02 / Поля спор','Микромир бухты: грибы, колонии, жуки'],
];
function scene(w,time,onlyLife=false){
 const v=createCanvas(448,328),ctx=v.getContext('2d'),u=E.shade(w),n=w.size,S=32;
 const hex=(r,g,b)=>'rgb('+r+','+g+','+b+')';
 const project=(x,y)=>{
  const h=E.sampleMap(w.heights,n,x,y)/65535;
  return {x:224+(x-y)*194,y:103+(x+y)*90-h*106,scale:1.48};
 };
 const polygon=(p,f)=>{ctx.fillStyle=f;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(const q of p.slice(1))ctx.lineTo(q.x,q.y);ctx.closePath();ctx.fill();};
 if(!onlyLife){
  const sky=ctx.createLinearGradient(0,0,0,332);sky.addColorStop(0,'#091c26');sky.addColorStop(.55,'#294b50');sky.addColorStop(1,'#0c202c');
  ctx.fillStyle=sky;ctx.fillRect(0,0,448,328);
  ctx.save();ctx.translate(220,250);ctx.scale(1,.42);
  const s=ctx.createRadialGradient(0,5,20,0,5,173);s.addColorStop(0,'#061018dd');s.addColorStop(1,'#06101800');
  ctx.fillStyle=s;ctx.fillRect(-200,-150,400,300);ctx.restore();
  for(let i=0;i<S;i++)for(const [a,b] of [[project(1,i/S),project(1,(i+1)/S)],[project(i/S,1),project((i+1)/S,1)]]){
   polygon([a,b,{x:b.x,y:b.y+46},{x:a.x,y:a.y+46}],i%3===0?'#233a40':'#1b3138');
  }
  for(let d=0;d<2*S-1;d++)for(let x=Math.max(0,d-(S-1));x<=Math.min(S-1,d);x++){
   const y=d-x,ux=x/S,uy=y/S,j=(Math.min(n-1,Math.floor((uy+.5/S)*n))*n+Math.min(n-1,Math.floor((ux+.5/S)*n)))*4;
   const p=[project(ux,uy),project(ux+1/S,uy),project(ux+1/S,uy+1/S),project(ux,uy+1/S)];
   polygon(p,hex(u[j],u[j+1],u[j+2]));
   ctx.strokeStyle='rgba('+u[j]+','+u[j+1]+','+u[j+2]+',.74)';ctx.lineWidth=.67;ctx.stroke();
  }
 }
 E.drawLife(ctx,w,time,project);
 return v;
}
const pngHash=v=>createHash('sha256').update(v.toBuffer('image/png')).digest('hex');
for(const [w] of panels){
 assert.notEqual(pngHash(scene(w,0,true)),pngHash(scene(w,.85,true)));
 assert.equal(pngHash(scene(w,0,true)),pngHash(scene(E.replay(w.id),0,true)));
}
const full=createCanvas(952,884),ctx=full.getContext('2d');
ctx.fillStyle='#08151c';ctx.fillRect(0,0,952,884);
ctx.fillStyle='#e9d4a1';ctx.font='24px Evidence Sans';ctx.fillText('ZomATON / Живые ветви Genesis №0',20,40);
ctx.fillStyle='#aac2bf';ctx.font='14px Evidence Sans';ctx.fillText('Две произвольные точки одного корня. Под каждой — следующее погружение.',20,66);
for(let i=0;i<panels.length;i++){
 const [w,title,sub]=panels[i],x=(i%2)*464+20,y=(i>=2?390:0)+86;
 ctx.drawImage(scene(w,0),x,y);
 ctx.font='18px Evidence Sans';ctx.fillStyle='#f3ede1';ctx.fillText(title,x,y+350);
 ctx.font='12px Evidence Sans';ctx.fillStyle='#a7bfbd';ctx.fillText(sub,x,y+373);
}
ctx.font='12px Evidence Sans';ctx.fillStyle='#aac2bf';ctx.fillText('Растения и животные отрисованы движком. Перспектива — визуализация вычисленного рельефа.',20,866);
writeFileSync('Living_Worlds_Actual.png',full.toBuffer('image/png'));
console.log('PASS actual canvas rendering: motion changes life-only image at all four scenes; exact frame recreation at same time.');
