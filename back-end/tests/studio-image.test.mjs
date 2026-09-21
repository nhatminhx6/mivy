import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../web/studio.js',import.meta.url),'utf8');
const generation=source.slice(source.indexOf('async function generateImage(){'),source.indexOf('function results(){'));
function harness(current){
 const requests=[];
 const api=async(url,options)=>{requests.push({url,options});return options?{job_id:'test-job'}:{status:'completed'}};
 const noop=()=>{};
 const run=new Function('current','api','setBusy','aiStatus','save','results','toast','$',`let tab;${generation};return generateImage;`)(current,api,noop,noop,noop,noop,noop,()=>null);
 return {run,requests};
}
test('uploaded shoe is sent even when legacy preserveSubject is false',async()=>{
 const current={image:'data:image/png;base64,aGVsbG8=',preserveSubject:false,outputs:{image_prompt:'A bright studio background'}};
 const {run,requests}=harness(current);await run();
 const upload=requests[0].options.body.get('image');
 assert.ok(upload);assert.equal(await upload.text(),'hello');
 assert.equal(current.generatedImage,'/v1/generations/test-job/result');
});
test('no reference still allows illustration generation',async()=>{
 const {run,requests}=harness({image:'',outputs:{image_prompt:'A pottery workshop'}});await run();
 assert.equal(requests[0].options.body.get('image'),null);
});
