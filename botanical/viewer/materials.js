/* Russian material labels shared by readback and the visible renderer. */
(function(g,f){const m=f();if(typeof module==='object'&&module.exports)module.exports=m;else g.ZATMaterialsUI=m;})(globalThis,()=>{
'use strict';
const observed={
 rock:['Камень','трещины и сколы'],stone:['Камень','трещины и сколы'],fracture:['Камень','трещины и сколы'],
 ember:['Тлеющая частица','горячие течения и структура жара'],'lava-crust':['Лавовая корка','горячие каналы под коркой'],'plant-cell':['Клетка растения','жилки и клеточные стенки'],melt:['Раскалённый расплав','каналы расплава и распределение тепла'],lava:['Раскалённый расплав','каналы расплава и распределение тепла'],
 flame:['Пламя','горячие потоки и каналы'],
 magma:['Магма','каналы расплава и распределение тепла'],
 molten:['Раскалённый расплав','каналы расплава и распределение тепла'],
 heat:['Горячая жила','движение расплава и распределение тепла'],
 soil:['Почва','слои грунта'],sand:['Песок','зернистые слои'],water:['Вода','течения и взвесь'],
 leaf:['Зелёная ткань листа','жилки и клетки'],plant:['Растительная ткань','жилки и клетки'],
 chlorophyll:['Зелёная ткань листа','жилки и клетки'],green:['Растительная ткань','жилки и клетки'],
 vein:['Жилка растения','проводящие каналы'],cell:['Клеточная ткань','клеточные оболочки и мембраны'],
 living:['Живая ткань','жилки и клетки'],stem:['Ткань стебля','проводящие пучки'],tissue:['Живая ткань','клетки и мембраны'],
 cuticle:['Кутикула','слои покрова'],skin:['Кожа','покровные слои'],organ:['Ткань тела','органные полости'],
 membrane:['Мембрана','клеточные стенки'],protein:['Белковая ткань','внутренняя структура'],
 crystal:['Кристалл','грани и разломы']
};
function key(src){
 if(typeof src==='string')return src.toLowerCase();
 if(!src)return '';
 const k=src.material??src.key??src.kind??src.name??src.id??src.code;
 return typeof k==='string'?k.toLowerCase():'';
}
function info(src){
 const k=key(src);if(observed[k])return observed[k];
 if(/ember|melt|molten|lava|flame|thermal|heat|magma|vent|fire/.test(k))return observed.lava;
 if(/plant|leaf|green|chlorophyll|phloem|xylem|stom|vein/.test(k))return observed.leaf;
 if(/stone|rock|crust|fracture|basalt|granite|mineral/.test(k))return observed.rock;
 if(/cuticle|skin|tissue|protein|organ|gill|muscle|neural|membran/.test(k))return observed.tissue;
 if(/cell/.test(k))return observed.cell;
 if(/water/.test(k))return observed.water;
 return ['Материал','внутренняя структура'];
}
return Object.freeze({key,info});
});
