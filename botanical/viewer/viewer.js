(() => {
'use strict';
const E=globalThis.ZATBotanical, P=globalThis.ZATPerspective, M=globalThis.ZATObjectViewMath, O=globalThis.ZATObjectLayer, L=globalThis.ZATMaterialsUI, $=id=>document.getElementById(id);
const cv=$('world'),ctx=cv.getContext('2d',{alpha:false}), motion=matchMedia('(prefers-reduced-motion: reduce)');
const text=s=>{$('status').textContent=s};
if(!E||!P||!M||!O||!L||!ctx){text('Не удалось загрузить движок. Откройте полную сборку.');return;}
const W=cv.width,H=cv.height,N=128,CAP=3,cache=new Map();

let token=0,busy=false,present=null,interruption=null;
let live=false,lifeFrame=0,stamp=null,clock=0;
function summary(material){const [name,detail]=L.info(material);return name+' → '+detail;}
const info={
 cavern:'Свод со сквозным отверстием и нависающим камнем.',
 archipelago:'Острова отделены каналами воды. Клик по воде открывает точку под ней.',
 'forest-ravine':'Деревья стоят вдоль склонов, а овраг идёт между ними.',
 genesis:'Обзорный мир. Выберите видимую поверхность, чтобы войти в неё.'
};
function view(world){
 const projected=P.render(world,W,H),c=document.createElement('canvas');c.width=W;c.height=H;
 const cc=c.getContext('2d',{alpha:false});
 const ground=new ImageData(projected.pixels,W,H);cc.putImageData(ground,0,0);
 const layer=O.layout(world,projected,E,0);O.draw(cc,layer);
 return {world,projected,ground,layer,canvas:c,tap:null};
}
function keep(v){cache.delete(v.world.id);cache.set(v.world.id,v);if(cache.size>CAP)cache.delete(cache.keys().next().value);return v;}
function totalDepth(w){return w.depth??E.parse(w.id).length;}
const root=keep(view(E.root(N)));present=root;
function paint(v){ctx.globalAlpha=1;ctx.drawImage(v.canvas,0,0);}
let lifeScratch=document.createElement('canvas');lifeScratch.width=W;lifeScratch.height=H;
function refreshPose(v,time){
 const layer=O.layout(v.world,v.projected,E,time);
 const draft=lifeScratch.getContext('2d',{alpha:false});draft.putImageData(v.ground,0,0);O.draw(draft,layer);
 // Publish matching pixels and hit primitives together. No physics change or terrain rerender.
 ctx.globalAlpha=1;ctx.drawImage(lifeScratch,0,0);
 const previous=v.canvas;v.canvas=lifeScratch;lifeScratch=previous;v.layer=layer;
}
function stopLife(){
 if(lifeFrame)cancelAnimationFrame(lifeFrame);
 lifeFrame=0;stamp=null;
}
function canAnimate(){return live&&!busy&&!document.hidden&&!motion.matches;}
function startLife(){
 if(lifeFrame||!canAnimate())return;
 const tick=timestamp=>{
  lifeFrame=0;if(!canAnimate())return;
  stamp??=timestamp;
  if(timestamp-stamp>=100){
   clock+=(timestamp-stamp)/1000;stamp=timestamp;
   try{refreshPose(present,clock);}catch{live=false;update();return;}
  }
  lifeFrame=requestAnimationFrame(tick);
 };
 lifeFrame=requestAnimationFrame(tick);
}
function syncLife(){
 if(!canAnimate())stopLife();else startLife();
}
function hash(){
 const h=totalDepth(present.world)?'#route='+present.world.id:'';
 try{if(location.hash!==h){const u=new URL(location.href);u.hash=h;history.replaceState(null,'',u);}}catch{}
}
function update(){
 const w=present.world,path=E.parse(w.id),d=totalDepth(w);
 $('depth').textContent=String(d);$('world-kind').textContent=w.scale==='micro'?'МИКРОМИР':'МАКРОМИР';
 $('world-title').textContent=w.title||'Genesis №0';
 const habitat={stone:'Этот путь остаётся каменным: трещины, кристаллы и грани.',
  fire:'Этот путь остаётся огненным: горячие жилы, лавовая корка и тлеющие частицы.',
  plant:w.scale==='micro'?'Клеточные камеры, мембраны и жилки имеют объём. Выберите поверхность или видимый организм.':'Вы внутри растительной кроны: сосуды и пластины листьев продолжают микромир.',
  animal:'Этот путь остаётся внутри тканей животного.',
  water:'Этот путь остаётся водным.',soil:'Этот путь остаётся внутри грунта.'};
 $('life').textContent=habitat[w.realm]??'Начальный мир. Коснитесь камня, горячей жилы или самой формы растения.';
 const origin=w.origin?.material;
 $('material').hidden=!origin;
 if(origin)$('material').textContent='Из точки входа: '+summary(origin);
 $('breadcrumbs').textContent=d?'Шагов: '+d+'. Путь хранит точку выбранной поверхности.':'Панорама Genesis. Маршрут ещё не начат.';
 $('back').disabled=busy||!d;$('copy').disabled=busy||!d;$('open').disabled=busy;$('center').disabled=busy;
 $('cancel').hidden=!busy;cv.setAttribute('aria-busy',String(busy));
 const toggle=$('life-toggle');toggle.setAttribute('aria-pressed',String(live&&!motion.matches));toggle.disabled=busy||motion.matches;
 toggle.title=motion.matches?'Устройство запрашивает меньше движения.':'Включить или приостановить движения обитателей.';
}
function ready(s){text((s?s+' ':'')+'Коснитесь тела, листа или поверхности.');}
function marker(p,confirmed=false){
 const m=$('target');m.style.left=(p[0]*100)+'%';m.style.top=(p[1]*100)+'%';m.hidden=false;m.dataset.confirmed=String(confirmed);
}
function clear(){$('target').hidden=true;}
const point=e=>M.point(e.clientX,e.clientY,cv.getBoundingClientRect());
function resolveNear(p){
 if(present.layer.hit(...p)||present.projected.pick(...p))return p;
 for(let d=1;d<=7;d++)for(const q of [[0,d],[d,0],[-d,0],[0,-d],[d,d],[-d,d]]){
  const xy=[p[0]+q[0]/12,p[1]+q[1]/12];if(present.layer.hit(...xy)||present.projected.pick(...xy))return xy;
 }
 return null;
}
const stage=()=>new Promise(resolve=>requestAnimationFrame(resolve));
function animate(parent,child,p,reverse,run){
 if(motion.matches){paint(reverse?parent:child);return Promise.resolve(true);}
 return new Promise((resolve,reject)=>{
  let first;
  function step(ts){
   if(run!==token){resolve(false);return;}
   first??=ts;const pos=Math.min(1,(ts-first)/560),t=reverse?1-pos:pos;
   try{
    if(t<=0)paint(parent);
    else if(t>=1)paint(child);
    else {
     const r=M.windowAt({x:.64*p[0],y:.64*p[1],width:.36,height:.36},t/.72);
     ctx.globalAlpha=1;ctx.drawImage(parent.canvas,r.x*W,r.y*H,r.width*W,r.height*H,0,0,W,H);
     if(t>.72){ctx.globalAlpha=M.smooth((t-.72)/.28);ctx.drawImage(child.canvas,0,0);ctx.globalAlpha=1;}
    }
   }catch(e){reject(e);return;}
   if(pos===1)resolve(true);else requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
 });
}
async function transaction(fn){
 if(busy)return;const run=++token;busy=true;stopLife();interruption=new AbortController();update();
 try{await fn(run);}catch(e){if(run===token){paint(present);text(e?.message||'Кадр не готов. Предыдущий мир сохранён.');}}
 finally{if(run===token){busy=false;interruption=null;clear();update();syncLife();}}
}
function install(v){present=keep(v);hash();update();}
async function dive(screen) {
 if(busy)return;
 const visible=present.layer.hit(...screen), picked=visible?null:present.projected.pick(...screen);
 if(!visible&&!picked){text('Здесь небо. Коснитесь тела, листа или поверхности.');return;}
 marker(screen,true);
 await transaction(async run=>{
  const parent=present;
  const source=visible?
   E.objectMaterialAt(parent.world,visible.object.id,visible.part.key,visible.localX,visible.localY):
   E.materialAt(parent.world,picked.x,picked.y,0,'terrain');
  text('Выбрано: '+summary(source)+'.');await stage();if(run!==token)return;
  const entry=visible?E.enterObject(parent.world,visible.object.id,visible.part.key,visible.localX,visible.localY):E.descend(parent.world,picked.x,picked.y);
  const child=view(entry);child.tap=screen;
  clear();if(!await animate(parent,child,screen,false,run)||run!==token)return;
  install(child);ready((child.world.scale==='micro'?'Микромир':'Макромир')+' открыт. '+summary(entry.origin?.material??source)+'.');
 });
}
async function rebuild(id,run){
 const hit=cache.get(id);if(hit)return hit;
 let w=root.world;
 if(typeof E.replayAsync==='function'){
  w=await E.replayAsync(id,N,{yieldEvery:1,signal:interruption?.signal});
  if(run!==token)return null;
 }else for(const p of E.parse(id)){
  await stage();if(run!==token)return null;
  w=p.type==='object'?E.enterObject(w,p.id,p.partKey,p.u,p.v):E.descend(w,p.x,p.y);
 }
 if(w.id!==id)throw Error('Не совпал пересчитанный адрес.');
 return view(w);
}
function open(id){
 return transaction(async run=>{
  text('Восстанавливаю выбранный путь…');await stage();if(run!==token)return;
  const v=await rebuild(id,run);if(!v||run!==token)return;
  install(v);paint(v);ready('Путь восстановлен.');
 });
}
async function back(){
 if(!totalDepth(present.world)||busy)return;
 await transaction(async run=>{
  const child=present; text('Возврат на предыдущую глубину…');
  const parent=await rebuild(E.ancestor(child.world.id),run);if(!parent||run!==token)return;
  // Use the actual clicked screen position when retained, or reopen saved parent directly.
  if(child.tap&&!await animate(parent,child,child.tap,true,run))return;
  if(run!==token)return;install(parent);paint(parent);ready('Предыдущее место восстановлено.');
 });
}
function cancel(){if(!busy)return;++token;interruption?.abort();interruption=null;busy=false;clear();paint(present);update();syncLife();text('Переход отменён. Текущий мир сохранён.');}
function diveNearCenter(){const at=resolveNear([.5,.5]);if(at)void dive(at);}
cv.addEventListener('pointermove',e=>{if(!busy&&e.pointerType!=='touch'){const p=point(e);const target=present.layer.hit(...p);if(target||present.projected.pick(...p)){marker(p);cv.title=target?(target.object.title??target.object.kind)+' · '+target.part.key:'';}else{cv.title='';clear();}}});
cv.addEventListener('pointerleave',()=>{if(!busy)clear();});cv.addEventListener('click',e=>void dive(point(e)));
cv.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.repeat){e.preventDefault();diveNearCenter();}});
$('center').addEventListener('click',diveNearCenter);$('back').addEventListener('click',()=>void back());$('cancel').addEventListener('click',cancel);
$('copy').addEventListener('click',async()=>{
 const id=present.world.id,u=new URL(location.href);u.hash='route='+id;const value=location.protocol==='file:'?id:u.href;
 try{await navigator.clipboard.writeText(value);text('Путь скопирован. Откройте его в другой копии ZomATON.');}
 catch{$('route').value=value;$('route').focus();$('route').select();text('Путь выделен для копирования.');}
});
function address(input){
 return M.read(input,E);
}
function bad(){text('Ссылка не распознана. Текущее место сохранено.');}
$('route-form').addEventListener('submit',e=>{e.preventDefault();if(!busy)try{void open(address($('route').value));}catch{bad();}});
window.addEventListener('hashchange',()=>{if(busy)cancel();try{void open(location.hash?address(location.hash):E.ROOT);}catch{bad();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});
$('life-toggle').addEventListener('click',()=>{
 if(busy||motion.matches)return;
 live=!live;update();syncLife();
 text(live?'Движение обитателей включено. Коснитесь объекта там, где он сейчас виден.':'Движение обитателей приостановлено.');
});
document.addEventListener('visibilitychange',syncLife);
motion.addEventListener?.('change',()=>{update();syncLife();});
paint(root);update();ready();
if(location.hash)try{void open(address(location.hash));}catch{bad();}
})();
