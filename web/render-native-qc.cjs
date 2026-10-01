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
const out=path.resolve('../back-end/docs/template-v2/reports/native-20260928');fs.mkdirSync(out,{recursive:true});
const sheet=createCanvas(1080,990),ctx=sheet.getContext('2d');ctx.fillStyle='#ddd';ctx.fillRect(0,0,1080,990);
const manifest=[];
CONCEPTS.forEach((c,i)=>{
 const copy=makeIndustryCopy(c.category,EXAMPLES[c.category]);copy.cta='Liên hệ';
 const state={industry:c.category==='recruitment'?'recruitment':'general',categoryId:c.category,conceptId:c.id,industryFields:EXAMPLES[c.category],brand:'MIVY · QC',name:copy.headline,details:copy.caption,aspect:'4:5',theme:'emerald_pro',copies:{launch:copy,story:copy,action:copy},selected:'launch'};
 const canvas=createCanvas(1080,1350);drawIndustryPoster(canvas,state,'launch',copy,null,null);
 const file=c.id+'.png';fs.writeFileSync(path.join(out,file),canvas.toBuffer('image/png'));
 const x=(i%3)*360,y=Math.floor(i/3)*495;ctx.drawImage(canvas,x+10,y+30,340,425);ctx.fillStyle='#111';ctx.font='16px sans-serif';ctx.fillText(c.id,x+10,y+20);
 manifest.push({concept:c.id,file,width:canvas.width,height:canvas.height,mode:'no-image',fontParity:'Arial registered as Be Vietnam Pro for native QC; NOT browser typography parity'});
});
fs.writeFileSync(path.join(out,'contact-sheet.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));console.log(out);
