'use strict';
const E=require('./engine'),M=require('./baseline/material-engine'),assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto');
const H=b=>createHash('sha256').update(Buffer.from(b.buffer,b.byteOffset,b.byteLength)).digest('hex');
const g=E.root(),tree=g.objects.find(o=>o.role==='plant'),leafUV=[.18,.30],veinUV=[.42,.50];
const leaf=E.enterObject(g,tree.id,'leaf',...leafUV),vein=E.enterObject(g,tree.id,'leaf',...veinUV);
const topology=w=>{
 const p=w.botanical,stats={};
 for(const group of E.mesh(w,{resolution:32})){
  const a=group.positions;assert.ok(a.length&&a.length%9===0&&a.every(Number.isFinite));let low=9,high=-9;
  for(let i=2;i<a.length;i+=3){low=Math.min(low,a[i]);high=Math.max(high,a[i]);}
  stats[group.material]={triangles:a.length/9,z:[low,high],digest:H(a)};
 }
 assert.ok(p.organisms.length>0);
 for(const q of p.organisms){
  const o=w.objects.find(o=>o.id===q.id);
  assert.deepEqual([o.x,o.y,o.z],q.anchor);
  assert.notDeepEqual(E.objectPose(o,.13),E.objectPose(o,1.45));
 }
 return stats;
};
const T1=topology(leaf),T2=topology(vein);
assert.equal(leaf.origin.material.material,'leaf');assert.equal(vein.origin.material.material,'vein');
assert.equal(leaf.realm,'plant');assert.equal(vein.realm,'plant');assert.equal(leaf.scale,'micro');
assert.equal(leaf.botanical.kind,'cellular-lamina');assert.equal(vein.botanical.kind,'vascular-cross-section');
assert.ok(leaf.botanical.cells.length>vein.botanical.cells.length);
assert.ok(vein.botanical.veins[0].radius>leaf.botanical.veins[0].radius*1.6);
assert.ok(vein.botanical.veins.length>leaf.botanical.veins.length);
const a=E.parse(leaf.id)[0],b=E.parse(vein.id)[0];assert.equal(a.id,b.id);assert.equal(a.partKey,b.partKey);assert.notEqual(a.u,b.u);
for(const [w,m] of [[leaf,T1],[vein,T2]]){
 assert.ok(w.botanical.cells.every(c=>c.roof>c.floor+.08&&c.aperture>.6&&c.aperture<.84&&c.polygon.length>=3));
 assert.ok(m['cell-inner']&&m['cell-rim']&&m['cell-floor']&&m['stroma-lumen']&&m['vein-inner']);
 for(const key of ['cell-membrane','stroma-bridge','vein-outer'])assert.ok(m[key].z[1]-m[key].z[0]>.09);
}
const choose=w=>w.objects.find(o=>o.role==='micro-material'&&o.model==='membrane-rim');
const exit1=E.enterObject(leaf,choose(leaf).id,'core',.44,.55),exit2=E.enterObject(vein,choose(vein).id,'core',.44,.55);
const M1=topology(exit1),M2=topology(exit2);
for(const [w,m] of [[exit1,M1],[exit2,M2]]){
 assert.equal(w.realm,'plant');assert.equal(w.scale,'macro');assert.equal(w.structure,'root-canopy-architecture');
 assert.ok(w.botanical.roots.length>12&&w.botanical.leaves.length>=7);
 assert.ok(m['plant-column'].z[1]-m['plant-column'].z[0]>.30);
 assert.ok(m['lamina-vein']&&m['canopy-branch']&&m['canopy-lamina']);
 assert.ok(w.objects.filter(o=>o.role==='plant').every(o=>o.model==='lamina'&&o.z>.5));
}
assert.notEqual(M1['giant-root'].digest,M2['giant-root'].digest);
assert.notEqual(M1['lamina'].digest,M2['lamina'].digest);
const fake={...g,objects:g.objects.map(o=>{
 if(o.id!==tree.id)return o;
 return {...o,parts:o.parts.map(part=>{
  if(part.key!=='leaf')return part;
  const n=part.surface.size,v=part.surface.physics.vein.slice();
  for(let y=3;y<8;y++)for(let x=1;x<5;x++)v[y*n+x]=(x+y)%2?63710:59332;
  return {...part,surface:{...part.surface,physics:{...part.surface.physics,vein:v}}};
 })};
})};
const shifted=E.enterObject(fake,tree.id,'leaf',...leafUV);
assert.equal(shifted.id,leaf.id);assert.equal(shifted.realm,leaf.realm);assert.equal(shifted.origin.material.material,'leaf');
assert.equal(H(shifted.source),H(leaf.source));
assert.notEqual(shifted.botanical.signal.strength,leaf.botanical.signal.strength);
assert.notEqual(topology(shifted)['vein-outer'].digest,T1['vein-outer'].digest);
const old=M.enterObject(M.root(),tree.id,'leaf',...leafUV);
assert.throws(()=>E.replay(old.id));
for(const w of [leaf,vein,exit1,exit2])assert.deepEqual(E.replay(w.id),w);
let start=E.root(40),world=E.enterObject(start,start.objects.find(o=>o.role==='plant').id,'leaf',...leafUV),trace=[];
for(let i=0;i<10;i++){
 assert.equal(world.realm,'plant');assert.ok(world.materialField.every(c=>c===3||c===4||c===12));
 for(const o of world.objects)for(const p of o.parts)assert.ok(p.surface.field.every(c=>c===3||c===4||c===12));
 trace.push({scale:world.scale,id:world.id,signature:world.botanical.signal.material});
 if(i%3===1)world=E.descend(world,.46,.62);
 else{
  const object=world.objects.find(o=>o.role===(world.scale==='micro'?'micro-material':'plant'));
  assert.ok(object);
  world=E.enterObject(world,object.id,object.parts[0].key,.39,.46);
 }
}
assert.ok(trace.some(c=>c.scale==='macro')&&trace.some(c=>c.scale==='micro'));
assert.deepEqual(E.replay(world.id,40),world);
(async()=>{
 assert.deepEqual(await E.replayAsync(exit1.id),exit1);
 const Q={leaf:{id:leaf.id,signal:leaf.botanical.signal,cells:leaf.botanical.cells.length,bridges:leaf.botanical.bridges.length,
   primary_vessel_radius:leaf.botanical.veins[0].radius,mesh:T1},
 vein:{id:vein.id,signal:vein.botanical.signal,cells:vein.botanical.cells.length,bridges:vein.botanical.bridges.length,
   primary_vessel_radius:vein.botanical.veins[0].radius,mesh:T2},
 macro_exits:[[exit1,M1],[exit2,M2]].map(([w,mesh])=>({id:w.id,roots:w.botanical.roots.length,laminas:w.botanical.leaves.length,organisms:w.botanical.organisms.length,mesh})),
 inherited_vein_counterfactual:{same_address:true,same_height_source:true,before_strength:leaf.botanical.signal.strength,after_strength:shifted.botanical.signal.strength,changed_tube_triangles:true},
 deep_replay:{levels:world.depth,trace}};
 if(process.argv.includes('--evidence'))fs.writeFileSync('botanical-evidence.json',JSON.stringify(Q,null,2)+'\n');
 console.log('PASS exact leaf vs vessel, hollow 3D chambers/tubes, macro root + lamina, real moving organisms, fixed-route vascular-signal counterfactual, 11-layer strict-domain replay.');
})().catch(e=>{console.error(e);process.exitCode=1});
