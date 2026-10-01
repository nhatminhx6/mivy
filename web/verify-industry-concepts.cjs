const ts=require('typescript'), fs=require('node:fs'), assert=require('node:assert/strict');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const {CONCEPTS,EXAMPLES,makeIndustryCopy}=require('./src/lib/industry-concepts.ts');
const {drawIndustryConcept}=require('./src/lib/industry-renderer.ts');
const {switchIndustry}=require('./src/lib/industry-drafts.ts');
let n=0;
for(const c of CONCEPTS)for(const h of [1080,1350,1920])for(const mode of [0,1,2,3])for(const kind of ['launch','story','action']){
 const photos=[];
 const ctx=new Proxy({measureText:s=>({width:s.length*12}),drawImage:(...a)=>photos.push(a)}, {get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 const im={naturalWidth:1000,naturalHeight:700},bg={naturalWidth:1600,naturalHeight:900};
 const state={categoryId:c.category,conceptId:c.id,brand:'MIVY',industryFields:EXAMPLES[c.category],storyPage:0,storyPerPage:3};
 assert.equal(drawIndustryConcept({width:1080,height:h,getContext:()=>ctx},state,kind,makeIndustryCopy(c.category,EXAMPLES[c.category]),mode&1?{im}:null,mode&2?bg:null),true);
 if(mode&2)assert.equal(photos[0][0],bg);
 n++;
}
for(const category of ['recruitment','property','food']){
 const data={...EXAMPLES[category]};const copy=makeIndustryCopy(category,data);
 for(const value of Object.values(data))assert.ok(copy.caption.includes(value),`caption missing ${category}: ${value}`);
 const empty=makeIndustryCopy(category,{});assert.equal(empty.subline,'');
}
const mem={};const store={getItem:k=>mem[k]||null,setItem:(k,v)=>mem[k]=v};
const initial={categoryId:'recruitment',industry:'recruitment',name:'My real JD',copies:{},details:'Keep this'};
const property=switchIndustry(initial,'property','service',store);assert.equal(property.name,'');assert.equal(property.details,'');
assert.equal(switchIndustry(property,'recruitment','recruitment',store).name,'My real JD');
console.log(`${n} render cases passed; all supplied facts retained in caption; isolated drafts passed`);
