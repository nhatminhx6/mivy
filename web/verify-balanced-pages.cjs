const ts=require('typescript'),fs=require('node:fs'),assert=require('node:assert/strict');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
const {balancedPages,pageAt}=require('./src/lib/balanced-pages.ts');
for(let n=0;n<=20;n++)for(let limit=1;limit<=6;limit++){
 const input=Object.freeze(Array.from({length:n},(_,i)=>`Yêu cầu ${i} / English ${i}`));const pages=balancedPages(input,limit);
 assert.deepEqual(pages.flat(),input);assert.ok(pages.every(p=>p.length<=limit));assert.ok(Math.max(...pages.map(p=>p.length))-Math.min(...pages.map(p=>p.length))<=1);
 pages.forEach((p,i)=>{const got=pageAt(pages,i);assert.deepEqual(got.items,p);assert.equal(got.offset,pages.slice(0,i).flat().length);});
 assert.equal(pageAt(pages,999).index,pages.length-1);assert.equal(pageAt(pages,-1).index,0);
}
assert.deepEqual(balancedPages(Array.from({length:10},(_,i)=>i),3).map(p=>p.length),[3,3,2,2]);
for(const bad of [0,-1,1.5,NaN,Infinity])assert.throws(()=>balancedPages([1],bad),RangeError);
console.log('126 pagination combinations passed, including 10→3/3/2/2, content/order, bounds, offsets');
