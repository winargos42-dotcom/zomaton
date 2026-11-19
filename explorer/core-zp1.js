function sha256BytesHex(bytes){
 const length=bytes.length;
 const paddedLength=Math.ceil((length+9)/64)*64;
 const msg=new Uint8Array(paddedLength);msg.set(bytes);msg[length]=0x80;
 const view=new DataView(msg.buffer);const bitLength=BigInt(length)*8n;
 view.setUint32(paddedLength-8,Number((bitLength>>32n)&0xffffffffn),false);
 view.setUint32(paddedLength-4,Number(bitLength&0xffffffffn),false);
 const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 let H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
 const rotr=(x,n)=>(x>>>n)|(x<<(32-n));
 for(let offset=0;offset<paddedLength;offset+=64){
  const W=new Uint32Array(64);
  for(let i=0;i<16;i++)W[i]=view.getUint32(offset+i*4,false);
  for(let i=16;i<64;i++){
   const a=W[i-15],b=W[i-2];
   const s0=rotr(a,7)^rotr(a,18)^(a>>>3);
   const s1=rotr(b,17)^rotr(b,19)^(b>>>10);
   W[i]=(W[i-16]+s0+W[i-7]+s1)>>>0;
  }
  let [a,b,c,d,e,f,g,h]=H;
  for(let i=0;i<64;i++){
   const S1=rotr(e,6)^rotr(e,11)^rotr(e,25);
   const ch=(e&f)^(~e&g);
   const t1=(h+S1+ch+K[i]+W[i])>>>0;
   const S0=rotr(a,2)^rotr(a,13)^rotr(a,22);
   const maj=(a&b)^(a&c)^(b&c);
   const t2=(S0+maj)>>>0;
   h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
  }
  H=H.map((v,i)=>(v+[a,b,c,d,e,f,g,h][i])>>>0);
 }
 return H.map(n=>n.toString(16).padStart(8,'0')).join('');
}

// ZomATON Genesis 0 v1.3 | Off-chain prototype, no TON mint.
const ROOT_HASH='7e62552bea7203e6fc9c3c21a481b995e6847dac9f42135fd1a3a665885e99b1';
const ROOT=`zp1:0:${ROOT_HASH}:-`;
const NFT_CAP=42000000;
const ROOT_INDEX=0;
const GRID=2**32;
const GALLERY_POINTS=Object.freeze(Array.from({length:6},(_,i)=>[(i+.5)/6,.5]));
const FAMILIES=['mandelbrot','julia','burning_ship','tricorn','multibrot3','perpendicular_burning_ship','celtic','buffalo'];
const BIOMES=['Crystal Abyss','Aerial Garden','Submerged Archive','Moss Cathedral','Saffron Dunes','Luminous Canopy','Obsidian Valley','Clockwork Ruins','Meteoric Reef','Frosted Spires','Bioluminescent Caves','Celestial Machine'];
function q32(x){if(!Number.isFinite(x)||x<0||x>1)throw Error('Coordinate outside [0,1]');return Math.min(4294967295,Math.floor(x*GRID));}
function segment(x,y){return q32(x).toString(16).padStart(8,'0')+q32(y).toString(16).padStart(8,'0');}
function parse(id){if(typeof id!=='string'|| !new RegExp('^zp1:0:'+ROOT_HASH+':(-|[a-f0-9]{16}(\\.[a-f0-9]{16})*)$').test(id))throw Error('Invalid Genesis World ID'); const p=id.split(':').at(-1);return p==='-'?[]:p.split('.');}
function descend(id,x,y){const path=parse(id);path.push(segment(x,y));return `zp1:0:${ROOT_HASH}:${path.join('.')}`;}
function ancestor(id){const path=parse(id);path.pop();return `zp1:0:${ROOT_HASH}:${path.length?path.join('.'):'-'}`;}
function worldSeed(id){return sha256Hex('ZAT/GENESIS/0/v1.3|'+id);}
function bit(hex,n=0){return parseInt(hex.slice(n*8,n*8+8),16)>>>0;}
function seededPRNG(seed){
 // xoshiro128**: 128-bit state to avoid the 32-bit PRNG bottleneck in large world graphs.
 let a=bit(seed,0),b=bit(seed,1),c=bit(seed,2),d=bit(seed,3);
 if(!(a|b|c|d))a=0x9e3779b9;
 const rot=(n,k)=>(n<<k)|(n>>>(32-k));
 return ()=>{const value=Math.imul(rot(Math.imul(b,5),7),9)>>>0;
 const t=b<<9;
 c^=a;d^=b;b^=c;a^=d;c^=t;d=rot(d,11);
 return value/4294967296;};
}
function specFor(id){let path=parse(id),seed=worldSeed(id),roll=seededPRNG(seed);const pos=path.length;
 const preset=path.length?GALLERY_POINTS.findIndex(([x,y])=>path[0]===segment(x,y)):-1;
 const family=FAMILIES[bit(seed,1)%FAMILIES.length];const a=roll(),b=roll();
 const paletteAngle=(a*360 + 47*pos)%360;
 return {world_id:id,seed,depth:pos,parent:pos?ancestor(id):null,
 family,biome:BIOMES[bit(seed,2)%BIOMES.length],
 art_index:preset>=0?preset:bit(seed,3)%6,art_zoom:0.83+roll()*1.45,art_x:roll(),art_y:roll(),
 julia_re:roll()*1.4-0.7,julia_im:roll()*1.4-0.7,
 hue:paletteAngle,hue2:(paletteAngle+90+roll()*160)%360,
 complexity:4+(bit(seed,4)%8),landform:bit(seed,5)%6,
 rarity:bit(seed,6)/4294967296<.006?'legendary':bit(seed,6)/4294967296<.05?'rare':'common',
 fractal_cx:(b-.5)*1.2,fractal_cy:(roll()-.5)*1.2};}
function sha256Hex(text){return sha256BytesHex(new TextEncoder().encode(text));}
function validateProof(proof){if(!proof||proof.schema!=='ZAT/GENESIS/PROOF/1.3')return false;
 const canonical=JSON.stringify(proof.data);return proof.sha256===sha256Hex(canonical)&&proof.data.world_seed===worldSeed(proof.data.world_id);
}
window.ZAT={ROOT,ROOT_HASH,NFT_CAP,ROOT_INDEX,FAMILIES,BIOMES,segment,parse,descend,ancestor,worldSeed,GALLERY_POINTS,seededPRNG,specFor,validateProof,sha256Hex,sha256BytesHex};
