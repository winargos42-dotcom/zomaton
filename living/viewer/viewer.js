(() => {
'use strict';
const E=globalThis.ZATLiving, M=globalThis.ZATLivingViewMath, $=id=>document.getElementById(id);
const cv=$('world'),ctx=cv.getContext('2d',{alpha:false}), motion=matchMedia('(prefers-reduced-motion: reduce)');
const setStatus=s=>{$('status').textContent=s};
if(!E||!M||!ctx){setStatus('Не удалось загрузить движок. Откройте полную сборку.');return;}
const N=224,CAP=3,cache=new Map(); // Three decoded worlds; breadcrumb path is the compact World ID.
let token=0,busy=false,present=null,liveAt=0,alive=0;
function canvas(n=N){const c=document.createElement('canvas');c.width=c.height=n;return c;}
function create(w){
 const ground=canvas(),warm=canvas(),c=ground.getContext('2d',{alpha:false});
 c.putImageData(new ImageData(E.shade(w),w.size,w.size),0,0);
 return {world:w,ground,warm,ec:warm.getContext('2d',{alpha:false})};
}
function remember(v){cache.delete(v.world.id);cache.set(v.world.id,v);if(cache.size>CAP)cache.delete(cache.keys().next().value);return v;}
const root=remember(create(E.root(N)));present=root;
function ecology(v,time){
 const c=v.ec;c.globalAlpha=1;c.drawImage(v.ground,0,0);
 if(typeof E.drawLife==='function')E.drawLife(c,v.world,time);
 return v.warm;
}
function display(v,time=0){ctx.globalAlpha=1;ctx.drawImage(ecology(v,time),0,0,cv.width,cv.height);}
function beginLive(){
 if(motion.matches||alive||busy||document.hidden)return;
 liveAt=0;let paintAt=-1;
 const tick=t=>{
  alive=0;
  if(busy||document.hidden||motion.matches)return;
  if(!liveAt)liveAt=t;
  if(t-paintAt>=42){display(present,(t-liveAt)/1000);paintAt=t;}
  alive=requestAnimationFrame(tick);
 };
 alive=requestAnimationFrame(tick);
}
function stopLive(){if(alive)cancelAnimationFrame(alive);alive=0;}
function writeHash(){
 const h=present.world.depth?'#route='+present.world.id:'';
 try{if(location.hash!==h){const u=new URL(location.href);u.hash=h;history.replaceState(null,'',u);}}catch{}
}
function counts(v){
 const w=v.world,a=w.flora?.length??0,b=w.fauna?.length??0;
 return (a?('Растительные формы: '+a+'. '):'')+(b?('Подвижные существа: '+b+'.'):'');
}
function update(){
 const w=present.world,path=E.parse(w.id);
 $('depth').textContent=String(w.depth);
 $('world-kind').textContent=String(w.levelName||w.biome||'Живой мир').toLocaleUpperCase('ru');
 $('world-title').textContent=w.title||'Genesis №0';
 const c=counts(present);$('life').textContent=c||'На этом участке организмы пока не обнаружены.';
 const p=path.at(-1);$('breadcrumbs').textContent=p?'Последняя точка: '+p.map(x=>(x*100).toFixed(1)+'%').join(' · ')+'. Шагов: '+path.length+'.':'Начальная точка пути.';
 $('back').disabled=busy||!w.depth;$('copy').disabled=busy||!w.depth;$('open').disabled=busy;$('center').disabled=busy;
 $('cancel').hidden=!busy;cv.setAttribute('aria-busy',String(busy));
}
function ready(action=''){setStatus(action? action+' Коснитесь любой точки, чтобы идти глубже.':'Коснитесь любой точки на карте: можно идти глубже.');}
function marker(p,confirmed=false){
 if(busy&&!confirmed)return;
 const m=$('target');m.style.left=(p[0]*100)+'%';m.style.top=(p[1]*100)+'%';m.hidden=false;m.dataset.confirmed=String(confirmed);
}
function clearMarker(){$('target').hidden=true;}
const point=e=>M.point(e.clientX,e.clientY,cv.getBoundingClientRect());
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
function animate(parent,child,reverse,run){
 if(motion.matches){display(reverse?parent:child);return Promise.resolve(true);}
 function length(t){
  const b=child.world.window,k=.75;
  if(t<=0){display(parent);return;}if(t>=1){display(child);return;}
  const a=M.windowAt(b,t/k);
  ctx.globalAlpha=1;ctx.drawImage(parent.warm,a.x*N,a.y*N,a.width*N,a.height*N,0,0,cv.width,cv.height);
  if(t>k){
   ctx.globalAlpha=M.smooth((t-k)/(1-k));
   ctx.drawImage(child.warm,0,0,cv.width,cv.height);ctx.globalAlpha=1;
  }
 }
 ecology(parent,0);ecology(child,0);
 return new Promise((resolve,reject)=>{
  let start;
  function tick(ts){
   if(run!==token){resolve(false);return;}
   start??=ts;const t=Math.min(1,(ts-start)/490);
   try{length(reverse?1-t:t);}catch(e){reject(e);return;}
   if(t===1){resolve(true);return;}requestAnimationFrame(tick);
  } requestAnimationFrame(tick);
 });
}
async function transact(work,holdMarker=false){
 if(busy)return;
 const run=++token;busy=true;stopLive();if(!holdMarker)clearMarker();update();
 try{await work(run);}
 catch(e){if(run===token){display(present);setStatus(e?.message||'Кадр не готов. Текущая точка сохранена.');}}
 finally{if(run===token){busy=false;clearMarker();update();beginLive();}}
}
function install(v){present=remember(v);writeHash();update();}
function getStep(w,x,y){return remember(create(E.descend(w,x,y)));}
async function dive(p){
 if(busy)return;
 marker(p,true);
 await transact(async run=>{
  const parent=present;setStatus('Точка выбрана. Открываю глубину '+(parent.world.depth+1)+'…');
  await nextFrame();if(run!==token)return;
  const child=getStep(parent.world,...p);
  clearMarker();
  if(!await animate(parent,child,false,run)||run!==token)return;
  install(child);ready('Глубина '+child.world.depth+' открыта.');
 },true);
}
async function rebuild(id,run){
 const saved=cache.get(id);if(saved)return saved;
 let prev=root;
 // Incremental replay keeps up to three decoded worlds; yields between generated frames.
 for(const p of E.parse(id)){
  if(run!==token)return null;
  await nextFrame();if(run!==token)return null;
  prev=getStep(prev.world,...p);
 }
 if(prev.world.id!==id)throw Error('Путь не прошёл проверку.');
 return prev;
}
async function back(){
 if(!present.world.depth||busy)return;
 await transact(async run=>{
  const child=present;setStatus('Возвращаюсь на предыдущую глубину…');
  const parent=await rebuild(E.ancestor(child.world.id),run);
  if(!parent||run!==token)return;
  if(!await animate(parent,child,true,run)||run!==token)return;
  install(parent);ready('Предыдущий мир восстановлен.');
 });
}
function cancel(){
 if(!busy)return;++token;busy=false;clearMarker();display(present);update();setStatus('Переход отменён. Текущий мир сохранён.');beginLive();
}
function openRoute(id){
 return transact(async run=>{
  setStatus('Восстанавливаю путь…');
  const v=await rebuild(id,run);
  if(!v||run!==token)return;
  install(v);display(v);ready('Путь восстановлен.');
 });
}
function inputError(){setStatus('Не удалось прочитать путь. Текущий мир не изменился.');}
cv.addEventListener('pointermove',e=>{if(!busy&&e.pointerType!=='touch')marker(point(e));});
cv.addEventListener('pointerleave',()=>{if(!busy)clearMarker();});cv.addEventListener('pointercancel',()=>{if(!busy)clearMarker();});
cv.addEventListener('click',e=>void dive(point(e)));
cv.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.repeat){e.preventDefault();void dive([.5,.5]);}});
$('center').addEventListener('click',()=>void dive([.5,.5]));$('back').addEventListener('click',()=>void back());$('cancel').addEventListener('click',cancel);
$('copy').addEventListener('click',async()=>{
 const id=present.world.id,u=new URL(location.href);u.hash='route='+id;
 const out=location.protocol==='file:'?id:u.href;
 try{await navigator.clipboard.writeText(out);setStatus('Путь скопирован. Его можно открыть в другой копии ZomATON.');}
 catch{$('route').value=out;$('route').focus();$('route').select();setStatus('Путь выделен. Скопируйте его из поля.');}
});
$('route-form').addEventListener('submit',e=>{
 e.preventDefault();if(busy)return;
 try{void openRoute(M.read($('route').value,E));}catch{inputError();}
});
window.addEventListener('hashchange',()=>{
 if(busy)cancel();
 try{void openRoute(location.hash?M.read(location.hash,E):E.ROOT);}catch{inputError();}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});
document.addEventListener('visibilitychange',()=>document.hidden?stopLive():beginLive());
display(present);update();
if(location.hash){try{void openRoute(M.read(location.hash,E));}catch{inputError();beginLive();}}
else{ready();beginLive();}
})();
