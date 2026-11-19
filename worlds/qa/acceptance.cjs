'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const path=require('node:path');
const E=require(path.resolve(process.argv[2]||path.join(__dirname,'../engine/engine.js')));
const digest=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
const root=E.root(128),xyA=[.359375,.578125],xyB=[.671875,.4375],xyMicro=[.4296875,.6484375];
const a=E.descend(root,...xyA),b=E.descend(root,...xyB);
const m=E.descend(a,...xyMicro), replay=E.replay(m.id,root.size);
assert.equal(a.depth,1);
assert.equal(m.depth,2);
assert.notEqual(a.kind,m.kind);
assert.notEqual(a.id,b.id);
assert.notEqual(a.id,m.id);
for(const world of [a,b,m]){
 const n=world.size;
 assert.equal(world.heights.length,n*n);
 assert.equal(world.source.length,n*n);
 const changes=[]; let localCurvature=0;
 for(let y=8;y<n-8;y++)for(let x=8;x<n-8;x++){
  const i=y*n+x;
  const d=world.heights[i]-world.source[i];
  changes.push(d);
  if(Math.abs(2*d-(world.heights[i-1]-world.source[i-1])-(world.heights[i+1]-world.source[i+1]))>5)localCurvature++;
 }
 assert.ok(changes.filter(v=>Math.abs(v)>20).length>n*n*.02,'world has a new height structure, not only colors');
 assert.ok(localCurvature>n*n*.008,'new height is not just a constant or uniform plane');
}
assert.notEqual(digest(a.source),digest(b.source),'different points use different inherited terrain');
const replayFrame=E.shade(replay),microFrame=E.shade(m);
assert.equal(digest(E.shade(m)),digest(replayFrame),'same route redraws exactly');
assert.equal(digest(m.heights),digest(replay.heights),'same route reproduces exact geometry');
assert.notEqual(digest(E.shade(a)),digest(microFrame));
assert.throws(()=>E.parse(m.id+'x'));
console.log(JSON.stringify({status:"PASS",tested:"two non-preset points and exact replay; substantial new terrain, not only RGB",macro:{kind:a.kind,point:xyA,id:a.id,frame_sha:digest(E.shade(a))},micro:{kind:m.kind,point:xyMicro,id:m.id,frame_sha:digest(microFrame)}},null,2));
