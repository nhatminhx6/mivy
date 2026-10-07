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

const out=path.resolve('../back-end/docs/template-v2/reports/fallback-pages-20261006');fs.mkdirSync(out,{recursive:true});
const copy={headline:'Kiểm tra đủ nội dung',subline:'',cta:'Liên hệ',caption:'',points:[]};
const state={industry:'recruitment',categoryId:'recruitment',templateId:'agenda',brand:'MIVY QC',aspect:'4:5',details:'Nội dung một\nNội dung hai\nNội dung ba\nNội dung bốn\nNội dung năm',facts:[],storyPerPage:3,copies:{launch:copy,story:copy,action:copy}};
const pageSource=fs.readFileSync('src/app/studio/marketing/page.tsx','utf8');
const countCode=pageSource.slice(pageSource.indexOf('      const allStoryPoints = snapshot.copies.story.points'),pageSource.indexOf('      for (let p = 0;',pageSource.indexOf('      const allStoryPoints = snapshot.copies.story.points')));
const {balancedPages}=require('./src/lib/balanced-pages.ts');
const count=Function('snapshot','balancedPages',countCode+'return totalStoryPages;')(state,balancedPages);
for(let p=0;p<2;p++){const c=createCanvas(1080,1350);drawIndustryPoster(c,{...state,storyPage:p},'story',copy,null,null);fs.writeFileSync(path.join(out,`page-${p+1}.png`),c.toBuffer('image/png'));}
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({exportPages:count,sourceLines:5,manuallyRenderedPages:2,expectedPages:2},null,2));
console.log({exportPages:count,expectedPages:2});
