'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto');
const E=require('./engine.js'),N=128,W=N*N,root=E.root(N);
const xy1=[.295,.721],xy2=[.645,.255];
const macro=E.descend(root,...xy1),micro=E.descend(macro,...xy2);
const H=(w)=>{const b=Buffer.alloc(w.length*2);for(let i=0;i<w.length;i++)b.writeUInt16LE(w[i],i*2);return createHash('sha256').update(b).digest('hex')};
const count=(a,b)=>a.reduce((n,v,i)=>n+(v!==b[i]),0);
const classes=(w)=>Object.fromEntries([...new Set(w.material)].sort().map(m=>[m,w.material.reduce((a,p)=>a+(p===m),0)]));
function independentSample(a,w,u,v){
 const px=Math.min(w-1,Math.max(0,u*w-.5)),py=Math.min(w-1,Math.max(0,v*w-.5));
 const x=Math.floor(px),y=Math.floor(py),dx=px-x,dy=py-y;
 const x1=Math.min(w-1,x+1),y1=Math.min(w-1,y+1);
 return Math.round((a[y*w+x]*(1-dx)+a[y*w+x1]*dx)*(1-dy)+(a[y1*w+x]*(1-dx)+a[y1*w+x1]*dx)*dy);
}
function verifyGeometry(parent,child){
 const b=child.window;let ring=0,raised=0,lowered=0;
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const i=y*N+x;assert.equal(child.source[i],independentSample(parent.heights,N,b.x+(x+.5)*b.width/N,b.y+(y+.5)*b.height/N));
  if(Math.min(x,y,N-1-x,N-1-y)<2){assert.equal(child.heights[i],child.source[i]);ring++}
  if(child.heights[i]>child.source[i]+256)raised++;
  if(child.heights[i]<child.source[i]-256)lowered++;
 }
 assert.ok(raised+lowered>W*.3);
 assert.equal(ring,W-(N-4)*(N-4));
 return {route:child.id,kind:child.kind,window:b,root_source_sha256le:H(child.source),solid_sha256le:H(child.heights),
  inherited_rim_samples:ring,different_elevations:count(child.source,child.heights),raised_gt_256:raised,lowered_gt_256:lowered,material_class_counts:classes(child)};
}
const rows=[verifyGeometry(root,macro),verifyGeometry(macro,micro)];
assert.equal(macro.kind,'macro');assert.equal(micro.kind,'micro');assert.ok(classes(macro)[2]>10);assert.ok(classes(micro)[6]>10);
assert.equal(E.ancestor(micro.id),macro.id);assert.equal(E.ancestor(macro.id),E.ROOT);assert.deepEqual(E.parse(micro.id).length,2);
assert.deepEqual(E.replay(micro.id,N),micro);
assert.notEqual(H(E.descend(root,.742,.231).heights),H(macro.heights));
assert.notEqual(H(E.descend(macro,.14,.82).heights),H(micro.heights));
// Same route/seed; intervention in exact parent ROI only. IDs and style/noise seeds stay fixed.
function intervention(parent,xy,original,expectedGeometry=true){
 const newmap=parent.heights.slice(), b=original.window;let amount=0;
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const u=(x+.5)/N,v=(y+.5)/N;
  if(u>b.x+b.width*.17&&u<b.x+b.width*.72&&v>b.y+b.height*.19&&v<b.y+b.height*.73){
   const j=y*N+x;newmap[j]=Math.min(65535,newmap[j]+13500);amount++;
  }
 }
 const altered=E.descend({...parent,heights:newmap},...xy);
 assert.equal(altered.id,original.id);assert.notEqual(H(altered.source),H(original.source));
 assert.notEqual(H(altered.heights),H(original.heights));
 const deltaDifference=altered.heights.reduce((c,v,i)=>c+((v-altered.source[i])!==(original.heights[i]-original.source[i])),0);
 assert.ok(deltaDifference>600,'child detail must respond to inherited geometry, not merely recopy a raised baseline');
 return {parent_patch_samples:amount,source_changed_samples:count(altered.source,original.source),
  solid_changed_samples:count(altered.heights,original.heights),different_added_relief_samples:deltaDifference};
}
rows[0].same_seed_parent_roi_intervention=intervention(root,xy1,macro);
rows[1].same_seed_parent_roi_intervention=intervention(macro,xy2,micro);
// Change wholly outside support: proves the exact validity window, not whole-parent checksum dependence.
const far=root.heights.slice();far[0]=65535-far[0];
assert.deepEqual(E.descend({...root,heights:far},...xy1),macro);
assert.equal(E.shade(micro).length,W*4);
assert.throws(()=>E.descend(root,NaN,.2));assert.throws(()=>E.descend(root,-.1,.2));assert.throws(()=>E.replay(micro.id+'junk',N));
console.log(JSON.stringify(rows,null,2));
console.log('PASS exact crop, inherited two-cell edge, altered geometry, distinct material classes, fixed-seed ROI intervention and two-hop replay.');
if(process.argv.includes('--evidence')){
 fs.writeFileSync('terrain-evidence.json',JSON.stringify({grid:N,clicks:[xy1,xy2],rows},null,2)+'\n');
 for(const w of [root,macro,micro])fs.writeFileSync(w.kind+'.rgba',E.shade(w));
}
