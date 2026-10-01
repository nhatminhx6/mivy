const ts=require('typescript'),fs=require('node:fs'),assert=require('node:assert/strict');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,f);
const React=require('react');React.useState=()=>[false,()=>{}];
const {IndustryForm}=require('./src/components/marketing/IndustryForm.tsx');
const {makeIndustryCopy}=require('./src/lib/industry-concepts.ts');
const fields={role:'Developer',salary:'100',contact:'hr@example.com',requirements:'React',__notes:'PRIVATE SCRATCH NOTE'};
const copy=makeIndustryCopy('recruitment',fields);assert.ok(!copy.caption.includes('PRIVATE'));
let updated;
const state={categoryId:'recruitment',industry:'recruitment',industryFields:fields,copies:{launch:{...copy,headline:'My edited headline'},story:{...copy},action:{...copy}},image:'keep-image',facts:[{text:'keep-fact'}]};
const tree=IndustryForm({state,onChange:s=>updated=s});
function walk(n){if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(walk);return;}if(n.type==='input'&&n.props['aria-label']==='Mức lương')n.props.onChange({target:{value:'200'}});if(n.type==='button')assert.equal(n.props.type,'button');walk(n.props?.children);}
walk(tree);assert.equal(updated.copies.launch.headline,'My edited headline');assert.equal(updated.copies.story.subline,'200');assert.equal(updated.industryFields.contact,fields.contact);assert.equal(updated.image,'keep-image');assert.deepEqual(updated.facts,state.facts);assert.ok(!updated.details.includes('PRIVATE'));
console.log('Input QC passed: manual edits, auto updates, notes isolation, assets/facts retention, non-submit controls');
