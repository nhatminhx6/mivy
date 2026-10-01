// Native raster QC using actual renderer. This does not replace browser/font parity QA.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const runtime=process.env.MIVY_CANVAS_MODULE;
if(!runtime)throw Error('Set MIVY_CANVAS_MODULE to installed @napi-rs/canvas');
const {createCanvas,GlobalFonts}=require(runtime);
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Arial.ttf','Be Vietnam Pro');
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Arial Bold.ttf','Be Vietnam Pro');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
const {drawIndustryPoster}=require('./src/lib/design-engine.ts');
const {CONCEPTS,EXAMPLES,makeIndustryCopy}=require('./src/lib/industry-concepts.ts');

const out=path.resolve('../back-end/docs/template-v2/reports/menu-edge-20260929');fs.mkdirSync(out,{recursive:true});
const sheet=createCanvas(1080,1320),ctx=sheet.getContext('2d');ctx.fillStyle='#ddd';ctx.fillRect(0,0,1080,1320);
const sparse={item:'Menu hôm nay',description:'Cơm gà',booking:'Đặt món tại quầy'};
const long={item:'Seasonal family sharing menu with vegetarian options',price:'499,000 VND',description:Array.from({length:10},(_,i)=>`Item ${i+1}: freshly prepared seasonal vegetables with house-made sauce and optional accompaniments`).join('\n'),offer:'Dessert included with advance booking',booking:'Contact the restaurant team to arrange your preferred collection time'};
const manifest=[];
for(const [i,aspect] of ['1:1','4:5','9:16'].entries())for(const [j,fields] of [sparse,long].entries()){
 const copy=makeIndustryCopy('food',fields);copy.cta=j?'ORDER NOW':'Đặt món';
 const state={industry:'general',categoryId:'food',conceptId:'food-menu',industryFields:fields,brand:'MIVY · QC',aspect,outputLanguage:j?'en':'vi',copies:{launch:copy,story:copy,action:copy},selected:'launch'};
 const canvas=createCanvas(1080,1350);drawIndustryPoster(canvas,state,'launch',copy,null,null);
 const file=`menu-${j?'en':'vi'}-${aspect.replace(':','x')}.png`;fs.writeFileSync(path.join(out,file),canvas.toBuffer('image/png'));
 const scale=Math.min(340/canvas.width,610/canvas.height),x=i*360,y=j*660;ctx.drawImage(canvas,x+10,y+30,canvas.width*scale,canvas.height*scale);ctx.fillStyle='#111';ctx.font='16px sans-serif';ctx.fillText(file,x+10,y+20);
 manifest.push({file,aspect,language:j?'en':'vi',width:canvas.width,height:canvas.height,fontParity:false});
}
fs.writeFileSync(path.join(out,'contact-sheet.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));console.log(out);
