const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/app/studio/marketing/page.tsx','utf8');
const start=source.indexOf('  const prepareExport =');const end=source.indexOf('  // Download single PNG',start);
const code=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
async function run(){
 let ready;const fonts=new Promise(r=>ready=r);const calls=[];
 const state={aspect:'9:16',storyPage:2,selected:'story',image:'first',backgroundImage:'back',copies:{story:{headline:'Original'}}};
 const prep=Function('state','document','loadAsset','loadBgImg','drawIndustryPoster',code+';return prepareExport;')(state,{fonts:{ready:fonts},createElement:()=>({})},async url=>({url}),async url=>({url}),(canvas,s,kind,copy,asset,bg)=>calls.push({canvas,s,kind,copy,asset,bg}));
 const pending=prep();state.image='changed';state.copies.story.headline='Changed';assert.equal(calls.length,0);ready();const result=await pending;result.draw('story',result.snapshot.storyPage);
 assert.equal(calls[0].asset.url,'first');assert.equal(calls[0].copy.headline,'Original');assert.equal(calls[0].s.storyPage,2);assert.equal(calls[0].canvas.height,1920);assert.equal(calls[0].bg.url,'back');
 const broken=Function('state','document','loadAsset','loadBgImg','drawIndustryPoster',code+';return prepareExport;')(state,{fonts:{ready:Promise.resolve()},createElement:()=>({})},async()=>null,async()=>null,()=>{throw Error('must not render')});
 await assert.rejects(broken(),/ảnh chính/);
 console.log('Export snapshot passed: fonts awaited, frozen input/copy/assets, selected page, dimensions, failed image rejects');
}
run().catch(e=>{console.error(e);process.exit(1)});
