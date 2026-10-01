const ts=require('typescript');
const fs=require('node:fs');
const assert=require('node:assert/strict');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const {drawCatalogPoster}=require('./src/lib/catalog-renderer.ts');
const {TEMPLATES}=require('./src/lib/template-catalog.ts');
const bg={naturalWidth:1600,naturalHeight:900}, im={naturalWidth:600,naturalHeight:800};
let count=0;
for(const t of TEMPLATES) for(const h of [1080,1350,1920]) for(const mode of ['background','main','both','neither']) {
 const calls=[];
 const ctx=new Proxy({measureText:s=>({width:s.length*12}),drawImage:(...args)=>calls.push(args)}, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 const canvas={width:1080,height:h,getContext:()=>ctx};
 const asset=['main','both'].includes(mode)?{im,l:0,t:0,w:600,h:800}:null;
 const background=['background','both'].includes(mode)?bg:null;
 const state={templateId:t.id,brand:'Thương hiệu / Brand',details:'Thông tin tiếng Việt\nEnglish details',backgroundDim:40,backgroundBlur:4};
 assert.equal(drawCatalogPoster(canvas,state,'launch',{headline:'Tiêu đề quảng cáo / Marketing',subline:'Chi tiết',cta:'Tìm hiểu thêm'},asset,background),true);
 assert.equal(calls.filter(c=>c[0]===bg).length,background?1:0);
 assert.equal(calls.filter(c=>c[0]===im).length,asset?1:0);
 if(background && asset) assert.equal(calls[0][0],bg);
 count++;
}
console.log(`${count} image-role cases passed: 6 templates × 3 ratios × 4 image combinations`);
// A landscape image in the portrait frame must cover without letterboxing,
// while contain preserves the whole image and panning moves the crop.
function placement(fit,zoom=100,x=50){
 const calls=[];
 const ctx=new Proxy({measureText:s=>({width:s.length*12}),drawImage:(...args)=>calls.push(args)}, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 drawCatalogPoster({width:1080,height:1350,getContext:()=>ctx},{templateId:'portrait',brand:'MIVY',details:'Details',mainImageFit:fit,mainImageZoom:zoom,mainImageX:x},'launch',{headline:'Headline',subline:'',cta:'Apply'},{im:bg,l:0,t:0,w:1600,h:900});
 return calls[0];
}
const cover=placement('cover'), contain=placement('contain');
assert.ok(cover[3]>=1080*.455 && cover[4]>=1350*.58);
assert.ok(contain[3]<=1080*.455+.001 && contain[4]<=1350*.58+.001);
assert.ok(placement('cover',150)[3]>cover[3]);
assert.notEqual(placement('cover',100,0)[1],placement('cover',100,100)[1]);
console.log('Cover, contain, zoom and crop position passed');
