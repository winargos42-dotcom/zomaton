'use strict';
const G=require('./geometry.cjs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const H=b=>crypto.createHash('sha256').update(b).digest('hex'),N=G.N;
const point1=[.1875,.5625],point2=[.4375,.59375];
const root=G.ROOT,child=G.descend(root,...point1),grand=G.descend(child,...point2);
const ids=[root,child,grand],frames=ids.map(id=>G.render(id));
const out=[];
function upscale(source,box,bilinear){
  const b=new Uint8ClampedArray(N*N*4);
  const ix=n=>Math.min(N-1,Math.max(0,n));
  for(let y=0;y<N;y++)for(let x=0;x<N;x++) {
    const sx=box.x*N+(x+.5)/4-.5,sy=box.y*N+(y+.5)/4-.5,u=Math.floor(sx),v=Math.floor(sy),tx=sx-u,ty=sy-v;
    const a=(cx,cy,ch)=>source[(ix(cy)*N+ix(cx))*4+ch],j=4*(y*N+x);
    for(let c=0;c<4;c++)b[j+c]=bilinear
       ? (a(u,v,c)*(1-tx)+a(u+1,v,c)*tx)*(1-ty)+(a(u,v+1,c)*(1-tx)+a(u+1,v+1,c)*tx)*ty
       : a(Math.round(sx),Math.round(sy),c);
  }
  return b;
}
for(const [level,pt] of [point1,point2].entries()){
 const [a,b]=ids.slice(level,level+2),pa=G.camera(a),ch=G.camera(b),B=G.box(...pt);
 const parentX=4*N*B.x,parentY=4*N*B.y;
 assert.equal(ch.span,pa.span/4);assert.equal(G.ancestor(b),a);assert.deepEqual(G.point(ch,...pt),G.point(pa,...pt));
 assert.ok(Number.isInteger(parentX)&&Number.isInteger(parentY));
 const supersampled=G.render(a,N*4),window=new Uint8ClampedArray(N*N*4);
 for(let y=0;y<N;y++){const start=((parentY+y)*N*4+parentX)*4;window.set(supersampled.subarray(start,start+N*4),y*N*4)}
 const actual=frames[level+1];assert.equal(H(actual),H(window));
 const nearest=upscale(frames[level],B,false),linear=upscale(frames[level],B,true);
 assert.notEqual(H(actual),H(nearest));assert.notEqual(H(actual),H(linear));
 let changed=0,L1=0,newArea=0;
 for(let i=0;i<actual.length;i+=4){
  const r=Math.abs(actual[i]-linear[i]),g=Math.abs(actual[i+1]-linear[i+1]),b=Math.abs(actual[i+2]-linear[i+2]);
  if(r+g+b>0)changed++;if(r+g+b>60)newArea++;
  L1+=r+g+b;
 }
 // A specific 4 × 4 child footprint fits inside one parent sample cell.
 // Show actual escape counts split inside that footprint, unlike a color-only effect.
 let orbitSplit;
 for(let y=0;y<N&&!orbitSplit;y+=4) for(let x=0;x<N;x+=4){
  const aa=G.orbit(...G.point(ch,(x+.5)/N,(y+.5)/N)).i,ab=G.orbit(...G.point(ch,(x+3.5)/N,(y+3.5)/N)).i;
  if(aa!==ab&&Math.abs(aa-ab)>=12){
    orbitSplit={child_pixels:[[x,y],[x+3,y+3]],one_parent_cell:[B.x*N+x/4,B.y*N+y/4],escape_counts:[aa,ab]};
    break;
  }
 }
 assert.ok(orbitSplit);
 out.push({route:b,selection:pt,parent_window_px:[B.x*N,B.y*N,N/4,N/4],
  fresh_native_digest:H(actual),aligned_4x_parent_subwindow_digest:H(window),
  upscaled_bilinear_digest:H(linear),changed_pixels_vs_bilinear:changed,
  substantial_change_pixels_vs_bilinear:newArea,mae_rgb_0_255:+(L1/(3*N*N)).toFixed(4),orbit_split:orbitSplit});
 if(process.argv.includes('--visual'))fs.writeFileSync('level-'+(level+1)+'-linear.rgba',linear);
}
const probes=[[.2,.4],[.5,.5],[.784,.277],[0,0],[1,1]];
for(const uv of probes){const id1=G.descend(root,...uv),id2=G.descend(id1,.12345,.87654);
 assert.equal(G.parse(id2).length,2);assert.equal(H(G.render(id2,41)),H(G.render(id2,41)));
 for(let i=0;i<2;i++){const c=G.camera(i?id1:root),d=G.camera(i?id2:id1),p=i?[.12345,.87654]:uv;
  const u=(d.x-c.x)/c.span+.5-.125,v=(d.y-c.y)/c.span+.5-.125;
  assert.ok(Math.abs(u-.75*p[0])<1e-8&&Math.abs(v-.75*p[1])<1e-8);
 }
}
assert.throws(()=>G.camera(root.replace('zp1','roi1')));
assert.throws(()=>G.camera(root.replace(/:.$/,':'+Array(16).fill('8000000080000000').join('.'))));
if(process.argv.includes('--visual')) {
 frames.forEach((f,i)=>fs.writeFileSync('level-'+i+'-native.rgba',f));
 fs.writeFileSync('geometry-evidence.json',JSON.stringify({pixels:N,source:'existing ZAT zp1 camera; geometry-a1 palette',root,levels:out},null,2)+'\n');
}
console.log(JSON.stringify(out,null,2));
console.log('PASS 2 exact ground-truth crops; 2 native/upscale distinctions; split escape orbits inside old pixel; arbitrary locations/replay; invalid route/depth rejection.');
