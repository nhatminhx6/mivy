// Integration QC: real handler + ZIP writer; canvas encoding is simulated.
const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
const {marketingZip}=require('./src/lib/marketing-zip.ts');
const {balancedPages}=require('./src/lib/balanced-pages.ts');
const source=fs.readFileSync('src/app/studio/marketing/page.tsx','utf8');
const block=source.slice(source.indexOf('  const prepareExport ='),source.indexOf('  // Copy caption'));
const compiled=ts.transpileModule(block,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
async function run(fail=false){
 const points=Array.from({length:10},(_,i)=>`Ý ${i+1} / English`);
 const copy={headline:'Bản gốc',caption:'Nội dung tiếng Việt',points};
 const state={selected:'story',storyPage:3,conceptId:'food-menu',industry:'general',aspect:'9:16',image:'original-main',backgroundImage:'original-bg',name:'Món ăn',brand:'Brand',details:'Nguồn gốc',offer:'',facts:[],storyPerPage:3,copies:{launch:{...copy},story:{...copy},action:{...copy}}};
 const statuses=[],renders=[];let archive,clicked=0;let release;
 const doc={fonts:{ready:new Promise(r=>release=r)},createElement:type=>type==='a'?{click:()=>clicked++}:{toBlob(cb){queueMicrotask(()=>cb(fail?null:new Blob([JSON.stringify(this.record)])));}}};
 const factory=Function('state','document','loadAsset','loadBgImg','drawIndustryPoster','setStatusText','balancedPages','extractFactsFromDetails','marketingZip','URL','setTimeout',compiled+';return handleDownloadZip;');
 const handler=factory(state,doc,async url=>({url}),async url=>({url}),(c,s,k,copy,a,b)=>{c.record={kind:k,page:s.storyPage,headline:copy.headline,asset:a.url,bg:b.url,points:k==='story'?balancedPages(copy.points,3)[s.storyPage]:[]};renders.push(c.record);},s=>statuses.push(s),balancedPages,()=>[],marketingZip,{createObjectURL:b=>(archive=b,'blob:test'),revokeObjectURL:()=>{}},()=>{});
 const pending=handler();state.copies.story.headline='Edited mid-export';state.details='Changed';state.image='changed';release();await pending;
 if(fail){assert.equal(clicked,0);assert.ok(statuses.at(-1).includes('Lỗi'));return;}
 assert.equal(clicked,1);assert.equal(renders.length,6);assert.deepEqual(renders.filter(r=>r.kind==='story').map(r=>r.points.length),[3,3,2,2]);assert.deepEqual(renders.filter(r=>r.kind==='story').flatMap(r=>r.points),points);assert.ok(renders.every(r=>r.headline==='Bản gốc'&&r.asset==='original-main'&&r.bg==='original-bg'));
 const bytes=Buffer.from(await archive.arrayBuffer());const entries={};let pos=0;
 while(bytes.readUInt32LE(pos)===0x04034b50){const len=bytes.readUInt32LE(pos+18),nl=bytes.readUInt16LE(pos+26),el=bytes.readUInt16LE(pos+28);const name=bytes.subarray(pos+30,pos+30+nl).toString();const start=pos+30+nl+el;entries[name]=bytes.subarray(start,start+len);pos=start+len;}
 assert.equal(Object.keys(entries).length,11);assert.equal(JSON.parse(entries['manifest.json']).story_carousel_pages,4);assert.ok(entries['source.txt'].toString().includes('Nguồn gốc'));assert.equal(entries['02-story-caption.txt'].toString(),'Nội dung tiếng Việt');
 console.log('ZIP integration passed: 11 entries, 4 balanced story pages, frozen text/assets, UTF-8 source/caption');
}
(async()=>{await run();await run(true);console.log('Null encoder result aborts download with error');})().catch(e=>{console.error(e);process.exit(1)});
