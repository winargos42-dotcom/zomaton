'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto'),fs=require('node:fs'),E=require('./engine.js');
const N=E.SIZE, root=E.root(N);
const xyA=[.295,.721],xyB=[.645,.255];
const a=E.descend(root,...xyA),b=E.descend(root,...xyB),a2=E.descend(a,...xyB),b2=E.descend(b,.341,.882);
const hash=b=>createHash('sha256').update(Buffer.from(b.buffer,b.byteOffset,b.byteLength)).digest('hex');
const distances=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
const countDelta=(a,b)=>a.reduce((s,v,i)=>s+(v!==b[i]),0);
function verify(parent,child){
 const {heights,material,flora,fauna,window:b}=child, size=parent.size;
 let rim=0;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,u=b.x+(x+.5)*b.width/size,v=b.y+(y+.5)*b.height/size;
  assert.equal(child.source[i],E.sampleMap(parent.heights,size,u,v));
  if(Math.min(x,y,size-1-x,size-1-y)<2){assert.equal(child.source[i],heights[i]);rim++;}
 }
 assert.ok(countDelta(heights,child.source)>size**2*.6,'new physical geometry expected');
 assert.ok(flora.length>0&&fauna.length>0);
 const isWater=k=>k==='fish'||k==='ray'||k==='ciliate', isAir=k=>k==='bird'||k==='dragonfly';
 for(const p of fauna){
  if(!isAir(p.kind))assert.equal(material[Math.floor(p.y*size)*size+Math.floor(p.x*size)]<=2,isWater(p.kind));
  for(let t=0;t<=p.period;t+=.125){
   const s=E.pose(p,t);
   assert.ok(s.x>=0&&s.x<=1&&s.y>=0&&s.y<=1&&Number.isFinite(s.angle));
  }
  assert.notDeepEqual(E.pose(p,0),E.pose(p,p.period*.29));
 }
 return {id:child.id,biome:child.biome,structure:child.structure,changed_heights:countDelta(child.source,heights),inherited_rim:rim,flora:flora.length,fauna:fauna.length,flora_kinds:[...new Set(flora.map(e=>e.kind))],fauna_kinds:[...new Set(fauna.map(e=>e.kind))],water_fraction:material.reduce((s,v)=>s+(v<=2),0)/material.length,
 height_sha256:hash(heights),rgba_sha256:hash(E.shade(child))};
}
const reports=[verify(root,a),verify(root,b),verify(a,a2),verify(b,b2)];
assert.equal(a.structure,'canyon');assert.equal(b.structure,'archipelago');
assert.notEqual(a.biome,b.biome);assert.ok(distances(a.heights,b.heights)>5000);assert.notEqual(a2.structure,b2.structure);
assert.deepEqual(E.replay(a2.id),a2);assert.deepEqual(E.replay(b2.id),b2);
assert.equal(E.ancestor(a2.id),a.id);assert.equal(E.ancestor(a.id),E.ROOT);
const g=root.heights.slice();let interventionCells=0;
for(let y=0;y<N;y++)for(let x=0;x<N;x++){
 const u=(x+.5)/N,v=(y+.5)/N,K=a.window;
 if(u>K.x+K.width*.23&&u<K.x+K.width*.77&&v>K.y+K.height*.28&&v<K.y+K.height*.68){const i=y*N+x;g[i]=Math.min(65535,g[i]+13500);interventionCells++;}
}
const altered=E.descend({...root,heights:g},...xyA);assert.equal(altered.id,a.id);assert.equal(altered.seed,a.seed);
assert.notEqual(hash(altered.source),hash(a.source));assert.notEqual(hash(altered.heights),hash(a.heights));
const detailDelta=altered.heights.reduce((s,v,i)=>s+((v-altered.source[i])!==(a.heights[i]-a.source[i])),0);
assert.ok(detailDelta>500);
const far=root.heights.slice();far[0]=65535-far[0];assert.deepEqual(E.descend({...root,heights:far},...xyA),a);
let q=E.root(64);const chain=[],ids=new Set([q.id]),types=new Set(),faunaTypes=new Set();
for(let i=0;i<24;i++){
 const x=((i*127+11)%101)/100,y=((i*13+15)%101)/100;
 q=E.descend(q,x,y);
 assert.equal(q.depth,i+1);assert.ok(!ids.has(q.id));ids.add(q.id);
 assert.ok(q.flora.length>0&&q.fauna.length>0);
 types.add(q.structure);q.fauna.forEach(f=>faunaTypes.add(f.kind));
 chain.push({depth:q.depth,structure:q.structure,biome:q.biome,id:q.id,height_sha256:hash(q.heights)});
}
assert.equal(E.parse(q.id).length,24);assert.ok(types.size>=8);assert.ok(faunaTypes.size>=8);assert.deepEqual(q,E.replay(q.id,64));
assert.throws(()=>E.descend(root,NaN,.2));assert.throws(()=>E.replay(q.id+'junk',64));
(async()=>{
 assert.deepEqual(q,await E.replayAsync(q.id,64,{yieldEvery:4}));
 const c=new AbortController();c.abort();
 await assert.rejects(()=>E.replayAsync(q.id,64,{signal:c.signal}),/отменена/);
 const evidence={unit:'u16 elevations',source_patch_cells:interventionCells,same_id_and_seed_detail_delta:detailDelta,sibling_elevation_mae_le16:distances(a.heights,b.heights),branches:reports,
   deep_test:{levels:24,grid:64,structures:[...types],fauna_kinds:[...faunaTypes],chain,sha256:hash(q.heights)}};
 console.log(JSON.stringify({...evidence,deep_test:{...evidence.deep_test,chain:undefined}},null,2));
 console.log('PASS 4 grounded worlds, exact border inherited, actual geometry added, sibling structure/biota differ, same-seed ROI intervention, 24-step exact async & sync replay, animated fauna.');
 if(process.argv.includes('--evidence'))fs.writeFileSync('life-evidence.json',JSON.stringify(evidence,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1});
