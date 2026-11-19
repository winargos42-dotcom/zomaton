'use strict';
const fs=require('node:fs'), path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8'), output=process.argv[2];
if(!output)throw Error('usage: node bundle.cjs output.html');
const css=read('viewer.css');
if(/<\/style/i.test(css))throw Error('Unsafe CSS delimiter');
const src=new Map([['../engine/engine.js',read('../engine/engine.js')],['./route.js',read('route.js')],['./viewer.js',read('viewer.js')]]);
let page=read('index.html').replace('<link rel="stylesheet" href="./viewer.css">','<style>\n'+css+'\n</style>');
// Retain execution after the DOM is present, just like defer in the directory build.
const scripts=[];
page=page.replace(/<script src="([^"]+)" defer><\/script>/g,(_,url)=>{
 const body=src.get(url);if(!body||/<\/script/i.test(body))throw Error('Unsafe or unknown script: '+url);
 scripts.push('<script>\n'+body+'\n</script>');return '';
});
if(scripts.length!==src.size||!page.includes('</body>'))throw Error('Missing viewer script or body');
fs.writeFileSync(output,page.replace('</body>',scripts.join('\n')+'\n</body>'));
