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

const out=path.resolve('../back-end/docs/template-v2/reports/property-edge-20261004');fs.mkdirSync(out,{recursive:true});
const sheet=createCanvas(1080,1320),ctx=sheet.getContext('2d');ctx.fillStyle='#ddd';ctx.fillRect(0,0,1080,1320);
const sparse={type:'Căn hộ studio',contact:'nhadat@example.com'};
const en={type:'Spacious family apartment with a private terrace and flexible home office',price:'From 12 billion VND — payment schedule available on request',area:'125 m² interior plus 35 m² private outdoor terrace',address:'Apartment 1802, Riverside Residence, 123 Example Boulevard, Thu Duc City, Ho Chi Minh City',bedrooms:'Three bedrooms plus a separate home office',amenities:'Residents have access to a landscaped rooftop garden and shaded outdoor seating areas\nA fully equipped fitness room is available daily with advance reservation for personal training\nSecure bicycle parking and electric vehicle charging\nChildren playground and communal library',contact:'Contact the property team at property-enquiries@example.com or +84 900 123 456 to arrange a private viewing; appointments available Monday through Saturday.'};
const manifest=[];
for(const [i,aspect] of ['1:1','4:5','9:16'].entries())for(const [j,fields] of [sparse,en].entries()){
 const copy=makeIndustryCopy('property',fields);copy.cta=j?'CONTACT US':'Liên hệ';
 const state={industry:'general',categoryId:'property',conceptId:'property-architecture',industryFields:fields,brand:'MIVY · QC',aspect,outputLanguage:j?'en':'vi',copies:{launch:copy,story:copy,action:copy},selected:'launch'};
 const canvas=createCanvas(1080,1350);drawIndustryPoster(canvas,state,'launch',copy,null,null);
 const file=`property-${j?'en':'vi'}-${aspect.replace(':','x')}.png`;fs.writeFileSync(path.join(out,file),canvas.toBuffer('image/png'));
 const scale=Math.min(340/canvas.width,610/canvas.height),x=i*360,y=j*660;ctx.drawImage(canvas,x+10,y+30,canvas.width*scale,canvas.height*scale);ctx.fillStyle='#111';ctx.font='16px sans-serif';ctx.fillText(file,x+10,y+20);
 manifest.push({file,aspect,language:j?'en':'vi',width:canvas.width,height:canvas.height,fontParity:false});
}
fs.writeFileSync(path.join(out,'contact-sheet.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));console.log(out);
