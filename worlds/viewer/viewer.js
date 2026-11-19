(() => {
'use strict';
const E=globalThis.ZATMacroMicro, V=globalThis.ZomatonViewerMath;
const $=id=>document.getElementById(id), cv=$('world'), ctx=cv.getContext('2d',{alpha:false});
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const labels=['Панорама','Макромир','Микромир'], upper=['ПАНОРАМА','МАКРОМИР','МИКРОМИР'];
const status=s=>{$('status').textContent=s;};
if(!E||!V){status('Не удалось загрузить движок. Откройте полную сборку ZomATON.');return;}
const N=V.FIELD_SIZE, limit=V.MAX;
function paintSurface(w){
 const c=document.createElement('canvas');c.width=c.height=N;
 c.getContext('2d',{alpha:false}).putImageData(new ImageData(E.shade(w),N,N),0,0);return c;
}
function frame(w){return {world:w,canvas:paintSurface(w)};}
const root=frame(E.root(N));
let route=[root], token=0, busy=false;
function current(){return route.at(-1);}
function draw(view){ctx.globalAlpha=1;ctx.drawImage(view.canvas,0,0,cv.width,cv.height);}
function pointStr(p){return p.map(v=>Math.round(v*10000)/100+'%').join(' · ');}
function update(){
 const depth=route.length-1, points=E.parse(current().world.id);
 $('depth').textContent='0'+depth+' / '+upper[depth];$('scale').textContent=4**depth+'×';
 $('trail').replaceChildren(...labels.slice(0,depth+1).map((label,i)=>{
  const li=document.createElement('li');li.textContent=i?label+' · '+pointStr(points[i-1]):label;return li;
 }));
 $('back').disabled=busy||!depth;$('copy').disabled=busy||!depth;$('open').disabled=busy;
 $('cancel').hidden=!busy;cv.dataset.finished=String(depth===limit);cv.setAttribute('aria-busy',String(busy));
}
function caption(){
 const depth=route.length-1;
 status(depth===0?'Коснитесь точки, чтобы открыть макромир.':
 depth===1?'Теперь выберите точку внутри макромира.':'Вы в микромире. Скопируйте маршрут или вернитесь и выберите другую точку.');
}
function replaceHash(){
 const h=route.length>1?'#route='+current().world.id:'';
 try{if(location.hash!==h){const u=new URL(location.href);u.hash=h;history.replaceState(null,'',u);}}
 catch{/* Some packaged file URLs do not grant history.replaceState. The portable route still works. */}
}
function pointer(ev){return V.pointFromRect(ev.clientX,ev.clientY,cv.getBoundingClientRect());}
function marker(p){
 if(busy||route.length-1===limit)return;
 const m=$('target');m.style.left=(p[0]*100)+'%';m.style.top=(p[1]*100)+'%';m.hidden=false;
}
function clearMarker(){$('target').hidden=true;}
function drawTransition(parent,child,t){
 if(t<=0){draw(parent);return;}
 if(t>=1){draw(child);return;}
 const b=child.world.window, motionEnd=.77;
 ctx.globalAlpha=1;
 const win=V.windowAt(b,t/motionEnd);
 ctx.drawImage(parent.canvas,win.x*N,win.y*N,win.width*N,win.height*N,0,0,cv.width,cv.height);
 if(t>motionEnd){
  ctx.globalAlpha=V.smooth((t-motionEnd)/(1-motionEnd));
  ctx.drawImage(child.canvas,0,0,cv.width,cv.height);
  ctx.globalAlpha=1;
 }
}
function animate(parent,child,reverse,run){
 if(motion.matches){draw(reverse?parent:child);return Promise.resolve(true);}
 return new Promise((resolve,reject)=>{
  let start;
  function tick(ts){
   if(run!==token){resolve(false);return;}
   start??=ts;
   const t=Math.min(1,(ts-start)/670);
   try{drawTransition(parent,child,reverse?1-t:t);}catch(e){reject(e);return;}
   if(t===1){resolve(true);return;}
   requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
 });
}
async function transaction(work){
 if(busy)return;
 const run=++token;busy=true;clearMarker();update();
 try{await work(run);}
 catch{if(run===token){try{draw(current());}catch{}status('Кадр не отрисовался. Предыдущая точка сохранена.');}}
 finally{if(run===token){busy=false;update();}}
}
async function dive(p){
 if(busy||route.length-1>=limit)return;
 await transaction(async run=>{
  const prev=current();
  status(route.length>1?'Погружение в микромир…':'Погружение в макромир…');
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(run!==token)return;
  const next=frame(E.descend(prev.world,p[0],p[1]));
  if(!await animate(prev,next,false,run)||run!==token)return;
  route.push(next);replaceHash();caption();
 });
}
async function back(){
 if(busy||route.length===1)return;
 await transaction(async run=>{
  status('Возврат по тому же маршруту…');
  if(!await animate(route.at(-2),current(),true,run)||run!==token)return;
  route.pop();replaceHash();caption();
 });
}
function cancel(){
 if(!busy)return;
 ++token;busy=false;clearMarker();draw(current());update();status('Погружение отменено. Предыдущая точка сохранена.');
}
function rebuild(id){
 const next=[root];for(const p of E.parse(id))next.push(frame(E.descend(next.at(-1).world,p[0],p[1])));
 if(next.at(-1).world.id!==id)throw Error('Идентификатор пересчитанного пути не совпал.');
 return next;
}
function reopen(id,replay=false){
 if(!replay){const next=rebuild(id);draw(next.at(-1));route=next;replaceHash();update();caption();return;}
 return transaction(async run=>{
  status('Повторяю маршрут…');
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(run!==token)return;
  const next=rebuild(id);draw(root);
  for(let i=1;i<next.length;i++)if(!await animate(next[i-1],next[i],false,run)||run!==token)return;
  route=next;replaceHash();caption();
 });
}
cv.addEventListener('pointermove',e=>marker(pointer(e)));cv.addEventListener('pointerleave',clearMarker);
cv.addEventListener('click',e=>void dive(pointer(e)));
cv.addEventListener('keydown',e=>{
 if(e.key==='Enter'&&!e.repeat){e.preventDefault();void dive([.5,.5]);}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});
$('back').addEventListener('click',()=>void back());$('cancel').addEventListener('click',cancel);
$('copy').addEventListener('click',async()=>{
 const address=current().world.id,hosted=location.protocol==='http:'||location.protocol==='https:',url=new URL(location.href);
 url.hash='route='+address;const value=hosted?url.href:address;
 try{await navigator.clipboard.writeText(value);status(hosted?'Ссылка на маршрут скопирована.':'Маршрут скопирован. Его можно открыть в другой копии ZomATON.');}
 catch{$('route').value=value;$('route').focus();$('route').select();status('Маршрут выделен. Скопируйте его из поля.');}
});
$('route-form').addEventListener('submit',e=>{
 e.preventDefault();if(busy)return;
 try{void reopen(V.parseRoute($('route').value,E),true);}
 catch{status('Маршрут не распознан. Текущая точка не изменилась.');}
});
window.addEventListener('hashchange',()=>{
 if(busy)cancel();
 try{reopen(location.hash?V.parseRoute(location.hash,E):E.ROOT);}
 catch{status('Ссылка не распознана. Текущая точка не изменилась.');}
});
try{reopen(location.hash?V.parseRoute(location.hash,E):E.ROOT);}
catch{draw(root);update();status('Ссылка не распознана. Открыта панорама.');}
})();
