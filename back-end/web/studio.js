const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types = {event:'Sự kiện & khóa học',service:'Giới thiệu dịch vụ',app:'Ra mắt app / website',product:'Sản phẩm',personal:'Thương hiệu cá nhân'};
const demos = [
 {type:'event',name:'Một chiều chạm vào đất',brand:'Nhà Gốm',audience:'Người mới muốn thử làm gốm',details:'Workshop hướng dẫn nặn một chiếc cốc. Không cần kinh nghiệm.',when:'15:00, Chủ nhật 27/09/2026',where:'Nhà Gốm, TP. Hồ Chí Minh',cta:'Nhắn tin để đăng ký',tone:'Gần gũi',theme:'terracotta'},
 {type:'service',name:'Một góc xanh cho ngôi nhà',brand:'Lá Studio',audience:'Người muốn làm mới không gian sống',details:'Tư vấn bố trí cây xanh phù hợp ánh sáng và diện tích. Thiết kế theo nhu cầu từng không gian.',when:'',where:'',cta:'Đặt lịch tư vấn',tone:'Chuyên nghiệp',theme:'forest'},
 {type:'app',name:'Bớt việc nhỏ. Thêm thời gian.',brand:'Daylight',audience:'Người làm việc độc lập',details:'App sắp xếp công việc theo ngày, ghi chú và theo dõi tiến độ trong một nơi.',when:'',where:'',cta:'Khám phá ứng dụng',tone:'Súc tích',theme:'indigo'}
];
let drafts=[];try{drafts=JSON.parse(localStorage.getItem('mivy-drafts-v1')||'[]');if(!Array.isArray(drafts))drafts=[]}catch{}
let current=null,tab='copy',screen='home';
let uploadPending=false;
function toast(message){$('#notice').textContent=message;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#notice').textContent='',4500)}
function shell(title,html){$('#crumb').textContent=title;$('#screen').innerHTML=html;document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===screen));window.scrollTo(0,0)}
function store(){try{localStorage.setItem('mivy-drafts-v1',JSON.stringify(drafts));return true}catch{toast('Bộ nhớ trình duyệt đã đầy. Anh tải bản JSON để giữ bản nháp nhé.');return false}}
function save(silent=false){if(!current)return;current.updated=new Date().toISOString();const i=drafts.findIndex(d=>d.id===current.id);if(i<0)drafts.unshift(structuredClone(current));else drafts[i]=structuredClone(current);if(store()&&!silent)toast('Đã lưu bản nháp trên trình duyệt này.');}
function start(demo=null,quick=''){current={id:crypto.randomUUID(),type:'event',name:'',brand:'',audience:'',details:'',when:'',where:'',cta:'',tone:'Gần gũi',theme:'terracotta',concept:0,image:'',quick,...structuredClone(demo||{})};brief()}
function art(d){return `<div class="tile-art ${esc(d.theme)}"><small>${esc(types[d.type])}</small><span>${esc(d.name)}</span><span class="symbol">${d.type==='event'?'◒':d.type==='app'?'▧':'✳'}</span></div>`}
function home(){screen='home';shell('Tổng quan',`<div class="simple-heading"><div><h1>Mivy Studio</h1><p class="muted">Tạo ảnh và nội dung quảng cáo từ một mô tả ngắn.</p></div></div>
<div class="grid feature-grid">
 <button class="card feature" data-nav="marketing"><span class="feature-icon">✦</span><h2>Tạo bộ hình quảng cáo</h2><p>Một ảnh và mô tả ngắn → ba thiết kế có chữ, CTA và caption. Sửa trực tiếp rồi tải.</p><span class="feature-go">Tạo 3 mẫu →</span></button>
 <button class="card feature" data-nav="image"><span class="feature-icon">▦</span><h2>Ảnh sản phẩm bán hàng</h2><p>Đưa ảnh sản phẩm lên, chọn nền đẹp và khổ Shopee/TikTok/Facebook → tải về đăng luôn.</p><span class="feature-go">Tạo ảnh →</span></button>
 <button class="card feature" data-action="new"><span class="feature-icon">✍</span><h2>Viết cả bộ nội dung</h2><p>Một mô tả ngắn → bài viết, caption, kịch bản video, ảnh và poster đồng bộ.</p><span class="feature-go">Bắt đầu →</span></button>
</div>
<div class="section-top"><h2>Mẫu có sẵn</h2></div><div class="grid">${demos.map((d,i)=>`<button class="card home-template" data-demo="${i}">${art(d)}<span>${esc(types[d.type])} →</span></button>`).join('')}</div>
<div class="section-top"><h2>Đã tạo</h2><button class="text-button" data-nav="drafts">Xem tất cả</button></div>${draftList(3)}`)}
const bgPresets=[
 {k:'studio_white',name:'Nền trắng',c:'#ffffff'},
 {k:'gradient',name:'Gradient pastel',c:'linear-gradient(135deg,#f6d9e0,#d9e4f6)'}
];
const platforms=[
 {a:'1:1',name:'Shopee / Lazada',sub:'Vuông 1:1'},
 {a:'9:16',name:'TikTok / Reels',sub:'Dọc 9:16'},
 {a:'4:5',name:'Facebook',sub:'Dọc 4:5'}
];
let img={dataUrl:'',bg:'studio_white',aspect:'1:1',note:'',result:'',job:null};
function imageStudio(){screen='image';shell('Tạo ảnh',`<div class="simple-heading"><div><h1>Ảnh sản phẩm để đăng bán</h1><p class="muted">Giữ sản phẩm gốc, đổi nền và xuất đúng khổ.</p></div></div>
<div class="result-grid">
 <form id="imgform" class="card">
  <label class="upload">Ảnh sản phẩm của anh <span class="hint">· JPG/PNG/WEBP dưới 2 MB</span><input type="file" id="imgfile" accept="image/png,image/jpeg,image/webp"><img id="imgprev" ${img.dataUrl?`src="${esc(img.dataUrl)}"`:'hidden'} alt="Ảnh sản phẩm"><button class="text-button" type="button" data-action="img-remove" ${img.dataUrl?'':'hidden'}>Bỏ ảnh</button></label>
  <div class="picker-label">Chọn nền</div>
  <div class="bg-grid">${bgPresets.map(p=>`<button type="button" class="bg-opt ${img.bg===p.k?'sel':''}" data-bg="${p.k}"><span class="swatch" style="background:${p.c}"></span>${esc(p.name)}</button>`).join('')}</div>
  <div class="picker-label">Đăng ở đâu?</div>
  <div class="platform-row">${platforms.map(p=>`<button type="button" class="plat-opt ${img.aspect===p.a?'sel':''}" data-aspect="${p.a}"><b>${esc(p.name)}</b><span>${esc(p.sub)}</span></button>`).join('')}</div>
  <div class="form-submit"><button class="primary" type="submit">Tạo ảnh bán hàng</button></div>
 </form>
 <section class="result-panel"><div class="image-result-top"><h2>Kết quả</h2>${img.result?'<button class="primary" data-action="img-download">↓ Tải ảnh</button>':''}</div><div class="picture-preview product-preview">${img.result?`<img src="${esc(img.result)}" alt="Ảnh đã tạo">`:'<div class="picture-empty">Ảnh sẽ hiện ở đây</div>'}</div>${img.result?'<p class="hint">'+({'1:1':'1080 × 1080','4:5':'1080 × 1350','9:16':'1080 × 1920'}[img.resultAspect||img.aspect])+' · PNG</p>':''}</section>
</div>`);
 $('#imgfile').onchange=e=>{const f=e.target.files[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>2*1024*1024){toast('Anh chọn ảnh JPG, PNG hoặc WEBP dưới 2 MB nhé.');e.target.value='';return}uploadPending=true;img.dataUrl='';img.result='';img.job=null;const r=new FileReader();r.onerror=()=>{uploadPending=false;toast('Không đọc được ảnh. Anh chọn lại nhé.')};r.onload=()=>{uploadPending=false;img.dataUrl=r.result;$('#imgprev').src=img.dataUrl;$('#imgprev').hidden=false;$('[data-action="img-remove"]').hidden=false;imageStudio()};r.readAsDataURL(f)};
 $('#imgform').onsubmit=async e=>{e.preventDefault();if(aiBusy)return;await runImage()};
}
async function runImage(){
 if(uploadPending){toast('Ảnh đang tải lên, anh chờ một chút nhé.');return}
 if(!img.dataUrl){aiStatus('Anh thêm ảnh sản phẩm trước nhé.',true);return}
 setBusy(true);aiStatus('Đang tách nền và sắp ảnh…');
 try{
  const form=new FormData();form.append('background',img.bg);form.append('aspect_ratio',img.aspect);
  if(img.dataUrl){const blob=await (await fetch(img.dataUrl)).blob();form.append('image',blob,'product.'+(blob.type==='image/jpeg'?'jpg':blob.type==='image/webp'?'webp':'png'))}
  const accepted=img.job?{job_id:img.job}:await api('/v1/creative/images',{method:'POST',body:form});
  img.job=accepted.job_id;img.jobAspect=img.aspect;
  const started=Date.now();
  while(Date.now()-started<650000){
   const job=await api('/v1/generations/'+encodeURIComponent(accepted.job_id));
   if(job.status==='completed'){img.result='/v1/generations/'+encodeURIComponent(accepted.job_id)+'/result';img.resultAspect=img.jobAspect;img.job=null;imageStudio();toast('Xong! Anh tải ảnh ở bên phải.');return}
   if(job.status==='failed'){img.job=null;throw new Error(job.error||'Tạo ảnh thất bại. Anh thử lại nhé.')}
   aiStatus(job.status==='queued'?'Ảnh đang trong hàng đợi…':'Đang tạo ảnh…');
   await new Promise(r=>setTimeout(r,1800));
  }
  throw new Error('Ảnh vẫn đang xử lý. Anh bấm Kiểm tra ảnh để xem tiếp.');
 }catch(err){aiStatus(err.message,true)}finally{setBusy(false);const submit=$('#imgform button[type=submit]');if(submit)submit.textContent=img.job?'Kiểm tra ảnh':'Tạo ảnh bán hàng'}
}
function draftList(limit=100){return drafts.length?drafts.slice(0,limit).map(d=>`<article class="card draft"><div><h3>${esc(d.name||'Chiến dịch chưa đặt tên')}</h3><span class="muted">${esc(types[d.type])} · ${d.outputs?(d.source==='ai'?'Nội dung AI':'Bản mẫu cũ'):'Bản nháp brief'}</span></div><button class="secondary" data-open="${esc(d.id)}">Mở lại →</button></article>`).join(''):'<div class="empty">Chưa có chiến dịch. Bản nháp của anh sẽ xuất hiện tại đây.</div>'}
function listing(){screen='drafts';shell('Chiến dịch',`<div class="hero"><div><span class="eyebrow">THƯ VIỆN CỦA ANH</span><h1>Chiến dịch</h1><p class="muted">Bản nháp được lưu trên trình duyệt này, chưa đồng bộ tài khoản.</p></div><button class="primary" data-action="new">＋ Tạo chiến dịch</button></div>${draftList()}`)}
function steps(n){return `<div class="steps">${['Thông tin','Chọn ý tưởng','Bộ kết quả'].map((s,i)=>`<span class="${i===n?'current':''}">0${i+1} &nbsp; ${s}</span>`).join('<span>→</span>')}</div>`}
function field(key,title,placeholder='',wide=false){return `<label class="${wide?'wide':''}">${title}<input name="${key}" value="${esc(current[key])}" placeholder="${esc(placeholder)}" ${['name','details'].includes(key)?'required':''} maxlength="${key==='details'?2000:200}"></label>`}
function brief(){
 screen='brief';shell('Tạo mới',`<div class="simple-heading"><h1>Anh muốn quảng cáo gì?</h1></div><form id="brief" class="simple-form card">
 <label>Tên sản phẩm, dịch vụ hoặc sự kiện<input name="name" required maxlength="200" value="${esc(current.name)}" placeholder="Ví dụ: Workshop làm gốm"></label>
 <label>Mô tả ngắn<textarea name="details" required maxlength="2000" placeholder="Giới thiệu điều gì, dành cho ai, có gì nổi bật?">${esc(current.details)}</textarea></label>
 <label class="upload">Thêm ảnh <span class="hint">· không bắt buộc, tối đa 2 MB</span><input type="file" id="asset" accept="image/png,image/jpeg,image/webp"><img id="asset-preview" ${current.image?`src="${esc(current.image)}"`:'hidden'} alt="Ảnh của anh"><button class="text-button" type="button" data-action="remove-image" ${current.image?'':'hidden'}>Bỏ ảnh</button></label>
 <details class="disclosure"><summary>Thêm thông tin & chọn phong cách</summary><div class="fields">
 <label>Loại nội dung<select name="type">${Object.entries(types).map(([k,v])=>`<option value="${k}" ${current.type===k?'selected':''}>${v}</option>`).join('')}</select></label>
 ${field('brand','Thương hiệu')}${field('audience','Dành cho ai?')}${field('cta','Lời kêu gọi','Ví dụ: Nhắn tin đăng ký')}
 <div class="wide fields" id="event-fields" ${current.type==='event'?'':'hidden'}>${field('when','Thời gian')}${field('where','Địa điểm')}</div>
 <label>Giọng văn<select name="tone">${['Gần gũi','Chuyên nghiệp','Súc tích'].map(x=>`<option ${x===current.tone?'selected':''}>${x}</option>`).join('')}</select></label>
 <label>Cách viết<select name="concept">${concepts.map((c,i)=>`<option value="${i}" ${current.concept===i?'selected':''}>${c.title}</option>`).join('')}</select></label></div></details>
 <div class="form-submit"><button class="primary" type="submit">Tạo ảnh & nội dung</button><button type="button" class="text-button" data-action="save-brief">Lưu nháp</button></div></form>`);
 $('#brief').onchange=e=>{if(e.target.name==='type')$('#event-fields').hidden=e.target.value!=='event'};
 $('#asset').onchange=e=>{const f=e.target.files[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>2*1024*1024){toast('Anh chọn ảnh JPG, PNG hoặc WEBP dưới 2 MB nhé.');e.target.value='';return}uploadPending=true;current.image='';delete current.generatedImage;delete current.imageJob;const reader=new FileReader();reader.onerror=()=>{uploadPending=false;toast('Không đọc được ảnh. Anh chọn lại nhé.')};reader.onload=()=>{uploadPending=false;current.preserveSubject=true;current.image=reader.result;$('#asset-preview').src=current.image;$('#asset-preview').hidden=false;$('[data-action="remove-image"]').hidden=false};reader.readAsDataURL(f)};
 $('#brief').onsubmit=async e=>{e.preventDefault();if(aiBusy)return;readBrief();current.preserveSubject=Boolean(current.image);save(true);if(!current.name||!current.details){toast('Anh nhập tên và mô tả nhé.');return}await build(true)};
}
function readBrief(){const data=new FormData($('#brief'));for(const [k,v]of data)if(k!=='asset')current[k]=String(v).trim();current.concept=Number(current.concept)||0;if(current.type!=='event'){current.when='';current.where=''}}
const concepts=[{title:'Kể một câu chuyện',desc:'Mở đầu gần gũi, dẫn vào trải nghiệm và lời mời.',theme:'terracotta',symbol:'◒'},{title:'Làm rõ giá trị',desc:'Đi thẳng vào điều nổi bật, thông tin dễ đọc và rõ ràng.',theme:'forest',symbol:'✳'},{title:'Tạo sự chú ý',desc:'Tiêu đề ngắn, bố cục đậm và lời kêu gọi nổi bật.',theme:'indigo',symbol:'↗'}];
function ideas(){screen='ideas';shell('Chọn ý tưởng',`${steps(1)}<h1 class="compact-title">Một ý tưởng, ba cách kể.</h1><p class="muted">Chọn hướng phù hợp cho “${esc(current.name)}”. AI sẽ viết theo hướng anh chọn.</p><div class="grid">${concepts.map((c,i)=>`<button class="card select-card ${current.concept===i?'selected':''}" data-concept="${i}" aria-pressed="${current.concept===i}"><div class="tile-art ${c.theme}"><small>${esc(current.brand||'MIVY STUDIO')}</small><span>${esc(current.name)}</span><span class="symbol">${c.symbol}</span></div><h3>0${i+1} · ${c.title}</h3><p>${c.desc}</p><span>${current.concept===i?'● Đã chọn':'○ Chọn hướng này'}</span></button>`).join('')}</div><div class="actions"><button class="secondary" data-action="back-brief">← Sửa thông tin</button><button class="primary" data-action="build">Viết bộ nội dung bằng AI →</button></div>`)}
let aiBusy=false;
function aiStatus(message,error=false){
 let box=$('#ai-status');if(!box){box=document.createElement('div');box.id='ai-status';box.setAttribute('role','status');$('#screen').prepend(box)}
 box.className=error?'info ai-error':'info';box.textContent=message;
}
function setBusy(value){aiBusy=value;document.querySelectorAll('button,input,select,textarea').forEach(el=>el.disabled=value||(el.hasAttribute('data-needs-image')&&!designImage()));document.body.classList.toggle('ai-busy',value)}
async function api(url,options={}){
 const response=await fetch(url,{...options,signal:AbortSignal.timeout(330000)});
 const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Yêu cầu không thành công. Anh thử lại nhé.');return data;
}
async function build(withImage=false){
 if(uploadPending){toast('Ảnh đang tải lên, anh chờ một chút nhé.');return}
 let written=false;
 save(true);setBusy(true);aiStatus('Đang viết nội dung…');
 try{
  const payload={};for(const key of ['name','details','type','brand','audience','when','where','cta','tone','concept'])payload[key]=current[key];
  const result=await api('/v1/creative/text',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  current.outputs=result.outputs;current.source='ai';current.model=result.model;current.theme=concepts[current.concept].theme;
  delete current.imageError;
  save(true);results();written=true;
  if(!withImage)toast('Đã viết xong.');
 }catch(error){aiStatus(error.name==='TimeoutError'?'AI xử lý quá lâu. Anh thử lại; bản nháp vẫn được giữ.':error.message,true)}
 finally{setBusy(false)}
 if(written&&withImage)await generateImage();
}
function designImage(){return current?.generatedImage||current?.image||''}
async function generateImage(){
 if(!current.outputs?.image_prompt){aiStatus('Anh bấm Viết lại để tạo nội dung AI trước.',true);return}
 setBusy(true);aiStatus('Đang gửi yêu cầu tạo ảnh…');
 try{
  if(!current.imageJob){
   const form=new FormData();form.append('prompt',current.outputs.image_prompt);
   if(current.image){const blob=await (await fetch(current.image)).blob();form.append('image',blob,'reference.'+(blob.type==='image/jpeg'?'jpg':blob.type==='image/webp'?'webp':'png'))}
   const accepted=await api('/v1/creative/images',{method:'POST',body:form});current.imageJob=accepted.job_id;save(true);
  }
  const started=Date.now();
  while(Date.now()-started<650000){
   const job=await api('/v1/generations/'+encodeURIComponent(current.imageJob));
   if(job.status==='completed'){
    current.generatedImage='/v1/generations/'+encodeURIComponent(current.imageJob)+'/result';
    current.lastImageJob=current.imageJob;delete current.imageJob;delete current.imageError;save(true);tab='design';results();toast('Xong! Anh tải hình và text ngay phía trên.');return;
   }
   if(job.status==='failed'){delete current.imageJob;throw new Error(job.error||'Tạo ảnh thất bại. Anh thử lại nhé.')}
   aiStatus(job.status==='queued'?'Ảnh đang trong hàng đợi…':'Đang tạo hình…');
   await new Promise(resolve=>setTimeout(resolve,1800));
  }
  throw new Error('Ảnh vẫn đang xử lý. Anh bấm Kiểm tra ảnh để xem tiếp.');
 }catch(error){current.imageError=error.message;save(true);aiStatus(error.message,true)}finally{setBusy(false);const b=$('[data-action="generate-ai-image"]');if(b)b.textContent=current.imageJob?'Kiểm tra hình':current.generatedImage?'Tạo lại hình':'Tạo hình'}
}
function results(){
 screen='results';shell('Kết quả',`<div class="result-toolbar"><h1>${esc(current.name)}</h1><div class="download-actions"><button class="primary" data-action="download-picture" data-needs-image ${designImage()?'':'disabled'}>↓ Tải hình</button><button class="primary" data-action="export-text">↓ Tải text</button></div></div>${current.source==='ai'?'':'<p class="hint">Bản mẫu cũ · Chọn Viết lại để tạo bằng AI.</p>'}<div id="result-body"></div>`);
 drawResult();if(current.imageJob)aiStatus('Hình đang xử lý. Bấm Kiểm tra hình để tiếp tục.');else if(current.imageError)aiStatus(current.imageError,true);
}
function drawResult(){
 const o=current.outputs;
 $('#result-body').innerHTML=`<div class="result-grid"><section class="result-panel"><div class="panel-heading"><h2>Hình ảnh</h2><button class="text-button" data-action="generate-ai-image">${current.imageJob?'Kiểm tra hình':current.generatedImage?'Tạo lại hình':'Tạo hình'}</button></div><div class="picture-preview">${designImage()?`<img src="${esc(designImage())}" alt="${current.generatedImage?'Hình AI đã tạo':'Ảnh gốc của anh'}">`:'<div class="picture-empty">Chưa có hình<button class="secondary" data-action="generate-ai-image">Tạo hình</button></div>'}</div>${!current.generatedImage&&current.image?'<p class="hint">Ảnh gốc của anh</p>':''}${current.image?'<p class="hint">Giữ chủ thể từ ảnh gốc, chỉ đổi nền.</p>':''}</section>
 <section class="result-panel"><div class="panel-heading"><h2>Nội dung</h2><button class="secondary" data-copy="body">Sao chép</button></div><textarea class="main-copy" aria-label="Nội dung" data-output="body">${esc(o.body)}</textarea><button class="text-button" data-action="build">Viết lại</button></section></div>
 <details class="disclosure"><summary>Caption ngắn & kịch bản video</summary><div class="editor">${[['reminder','Caption ngắn'],['script','Kịch bản video']].map(([k,t])=>`<section><div class="panel-heading"><h3>${t}</h3><button class="text-button" data-copy="${k}">Sao chép</button></div><textarea aria-label="${t}" data-output="${k}">${esc(o[k])}</textarea></section>`).join('')}</div></details>
 <details class="disclosure"><summary>Thêm chữ lên hình</summary><div class="editor"><div id="poster" class="poster ${esc(current.theme)}"><span>${esc(current.brand||'MIVY STUDIO')}</span><h2 id="poster-title">${esc(o.headline)}</h2>${designImage()?`<img src="${esc(designImage())}" alt="Hình trên poster">`:''}<p>${esc([current.when,current.where].filter(Boolean).join(' · '))}</p><div id="poster-cta" class="poster-cta">${esc(o.cta)}</div></div><div><label>Tiêu đề<input data-output="headline" value="${esc(o.headline)}" maxlength="200"></label><label>Lời kêu gọi<input data-output="cta" value="${esc(o.cta)}" maxlength="200"></label><label>Màu nền<select id="theme">${[['terracotta','Đất nung'],['forest','Vườn xanh'],['indigo','Tím sáng']].map(([k,v])=>`<option value="${k}" ${current.theme===k?'selected':''}>${v}</option>`).join('')}</select></label><button class="secondary poster-download" data-action="export-image">↓ Tải hình có chữ</button></div></div></details>
 <details class="disclosure"><summary>Thông tin & bản nháp</summary><div class="quick"><button data-action="back-brief">Sửa thông tin</button><button data-action="export-json">Tải bản nháp JSON</button></div></details>`;

 $('#theme').onchange=e=>{current.theme=e.target.value;$('#poster').className=`poster ${current.theme}`;save(true)};
 document.querySelectorAll('[data-output]').forEach(el=>el.oninput=()=>{current.outputs[el.dataset.output]=el.value;const id={headline:'#poster-title',cta:'#poster-cta'}[el.dataset.output];if(id&&$(id))$(id).textContent=el.value;save(true)});
}
function download(blob,name){const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
async function exportImage(){const canvas=document.createElement('canvas');canvas.width=canvas.height=1080;const ctx=canvas.getContext('2d');const colors={terracotta:['#e8c5ac','#693e2b'],forest:['#cbd5a9','#284631'],indigo:['#c9c6ef','#363057']}[current.theme];ctx.fillStyle=colors[0];ctx.fillRect(0,0,1080,1080);ctx.fillStyle=colors[1];ctx.font='28px sans-serif';ctx.fillText((current.brand||'MIVY STUDIO').slice(0,45),70,90);ctx.font='bold 62px sans-serif';let y=190,line='',lines=[];for(const word of current.outputs.headline.split(/\s+/)){if(ctx.measureText(`${line} ${word}`).width>940&&line){lines.push(line);line=word}else line=(line+' '+word).trim()}if(line)lines.push(line);if(lines.length>4){toast('Tiêu đề quá dài cho mẫu này. Anh rút gọn rồi xuất lại nhé.');return}for(const l of lines){ctx.fillText(l,70,y);y+=78}if(designImage()){const im=new Image();im.src=designImage();await im.decode();const imageTop=Math.max(270,y+12);const scale=Math.min(940/im.width,(885-imageTop)/im.height);ctx.drawImage(im,(1080-im.width*scale)/2,imageTop,im.width*scale,im.height*scale)}else{ctx.font='180px sans-serif';ctx.fillText('✳',780,730)}ctx.font='23px sans-serif';const meta=[current.when,current.where].filter(Boolean).join(' · ');if(ctx.measureText(meta).width>940||ctx.measureText(current.outputs.cta).width>940){toast('Thông tin cuối ảnh quá dài. Anh rút gọn trước khi xuất nhé.');return}ctx.fillText(meta,70,940);ctx.fillRect(70,970,940,2);ctx.fillText(current.outputs.cta,70,1025);canvas.toBlob(blob=>{if(blob)download(blob,'mivy-design.png')})}
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||aiBusy)return;if(b.dataset.nav){b.dataset.nav==='home'?home():b.dataset.nav==='image'?imageStudio():b.dataset.nav==='marketing'?marketingStudio():listing();return}
 if(b.dataset.bg){if(img.job){toast('Anh chờ ảnh hiện tại xong nhé.');return}img.bg=b.dataset.bg;document.querySelectorAll('.bg-opt').forEach(x=>x.classList.toggle('sel',x.dataset.bg===img.bg));return}
 if(b.dataset.aspect){if(img.job){toast('Anh chờ ảnh hiện tại xong nhé.');return}img.aspect=b.dataset.aspect;document.querySelectorAll('.plat-opt').forEach(x=>x.classList.toggle('sel',x.dataset.aspect===img.aspect));return}if(b.dataset.demo!==undefined){start(demos[Number(b.dataset.demo)]);return}if(b.dataset.quick){start(null,b.dataset.quick);return}if(b.dataset.open){current=structuredClone(drafts.find(d=>d.id===b.dataset.open));current.outputs?results():brief();return}if(b.dataset.concept!==undefined){current.concept=Number(b.dataset.concept);ideas();return}if(b.dataset.tab){tab=b.dataset.tab;results();return}if(b.dataset.copy){try{await navigator.clipboard.writeText(current.outputs[b.dataset.copy]);toast('Đã sao chép nội dung.')}catch{toast('Không truy cập được clipboard. Anh chọn nội dung để copy nhé.')}return}switch(b.dataset.action){case'new':start();break;case'save-brief':readBrief();save();break;case'back-brief':brief();break;case'build':if(current.outputs&&!confirm('Viết lại bằng AI sẽ thay nội dung đã chỉnh khi thành công. Anh muốn tiếp tục?'))return;await build();break;case'generate-ai-image':await generateImage();break;case'save':save();break;case'remove-image':current.image='';$('#asset-preview').hidden=true;$('#asset').value='';b.hidden=true;break;case'img-remove':img.dataUrl='';img.result='';img.job=null;imageStudio();break;case'img-download':try{if(!img.result)return;const res=await fetch(img.result);if(!res.ok)throw new Error();const blob=await res.blob();download(blob,'mivy-image.'+(blob.type==='image/jpeg'?'jpg':blob.type==='image/webp'?'webp':'png'));toast('Đã tải ảnh.')}catch{toast('Chưa tải được ảnh. Anh thử lại nhé.')}break;case'export-json':download(new Blob([JSON.stringify(current,null,2)],{type:'application/json'}),'mivy-draft.json');break;case'export-text':download(new Blob([`${current.name}\nBÀI GIỚI THIỆU\n${current.outputs.body}\n\nBÀI NHẮC\n${current.outputs.reminder}\n\nKỊCH BẢN\n${current.outputs.script}`],{type:'text/plain;charset=utf-8'}),'mivy-content.txt');break;case'download-picture':try{if(!designImage())return;const response=await fetch(designImage());if(!response.ok)throw new Error();const blob=await response.blob();download(blob,'mivy-image.'+(blob.type==='image/jpeg'?'jpg':blob.type==='image/webp'?'webp':'png'));toast('Đã tải hình.')}catch{toast('Chưa tải được hình. Anh thử lại nhé.')}break;case'export-image':try{await exportImage()}catch{toast('Không xuất được ảnh. Anh thử thay ảnh đầu vào rồi xuất lại nhé.')}break}});
home();
