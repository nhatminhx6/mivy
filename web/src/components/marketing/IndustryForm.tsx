'use client';
import { useState } from 'react';
import {MarketingState} from '../../types';
import {INDUSTRY_FIELDS,makeIndustryCopy,CONCEPTS} from '../../lib/industry-concepts';

export function IndustryForm({state,onChange}:{state:MarketingState;onChange:(s:MarketingState)=>void}) {
 const [confirmRebuild, setConfirmRebuild] = useState(false);
 const category=state.categoryId || state.industry;
 const fields=INDUSTRY_FIELDS[category];
 if(!fields) return null;
 const initial=state.industryFields || (category === "recruitment" ? {role:state.name,salary:state.offer,requirements:state.details} : {});
 
 const essentialMap:Record<string,{k:string;label:string}[]> = {
   'recruitment': [{k:'role', label:'Vị trí'}, {k:'contact', label:'Liên hệ'}],
   'property': [{k:'type', label:'Loại BĐS'}, {k:'address', label:'Địa chỉ'}, {k:'contact', label:'Liên hệ'}],
   'food': [{k:'item', label:'Món/Combo'}, {k:'booking', label:'Đặt món'}]
 };
 const essentials=essentialMap[category] || [];
 const missing = essentials.filter(e => !initial[e.k]?.trim());
 const isEn = state.outputLanguage === 'en';

 const getAutoCopy = (data: Record<string,string>) => {
   const copy = makeIndustryCopy(category, data);
   if(isEn) copy.cta=category==='recruitment'?'Apply now':category==='property'?'Book a viewing':'Order now';
   return copy;
 };
 const currentAuto = getAutoCopy(initial);

 let hasEdits = false;
 if (state.copies) {
   for (const t of ['launch', 'story', 'action'] as const) {
     if (!state.copies[t]) continue;
     for (const f of ['headline', 'subline', 'cta', 'caption'] as const) {
       if ((state.copies[t] as any)[f] !== undefined && (state.copies[t] as any)[f] !== (currentAuto as any)[f]) hasEdits = true;
     }
     if (JSON.stringify(state.copies[t].points || []) !== JSON.stringify(currentAuto.points || [])) hasEdits = true;
   }
 }

 const update=(key:string,value:string)=>{
   const data={...initial,[key]:value};
   const nextAuto = getAutoCopy(data);
   
   const newCopies = { 
     launch: {...(state.copies?.launch || currentAuto)}, 
     story: {...(state.copies?.story || currentAuto)}, 
     action: {...(state.copies?.action || currentAuto)} 
   };
   
   for (const type of ['launch', 'story', 'action'] as const) {
     for (const field of ['headline', 'subline', 'cta', 'caption'] as const) {
       if (!(newCopies[type] as any)[field] || ((newCopies[type] as any)[field] || '') === ((currentAuto as any)[field] || '')) {
         (newCopies[type] as any)[field] = (nextAuto as any)[field];
       }
     }
     if (JSON.stringify((newCopies[type] as any).points || []) === JSON.stringify(currentAuto.points || [])) {
       (newCopies[type] as any).points = nextAuto.points;
     }
   }
   
   const { __notes, ...visibleData } = data;
   onChange({...state,industryFields:data,conceptId:state.conceptId || CONCEPTS.find(c=>c.category===category)?.id,name:nextAuto.headline,details:Object.values(visibleData).filter(Boolean).join('\n'),offer:data.salary||data.price||'',copies:newCopies});
 };
 return <fieldset className="space-y-3 border border-emerald-400/20 rounded-xl p-3"><legend className="px-2 text-emerald-300">Thông tin riêng theo ngành</legend>
 <p className="text-slate-400">Điền thông tin để em cập nhật poster cho anh nhé. Các ô trống sẽ không xuất hiện.</p>
 
 {missing.length > 0 && (
   <div className="text-amber-400 text-sm bg-amber-950/50 p-2 rounded">
     Vẫn còn thiếu thông tin chính: {missing.map(m => m.label).join(', ')}. (Giá/Lương là tùy chọn).
   </div>
 )}

 {hasEdits && (
   <div className="text-emerald-400 text-sm bg-emerald-950/50 p-2 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2">
     <span>Anh đã sửa nội dung poster, em sẽ giữ nguyên các phần đó.</span>
     {!confirmRebuild ? (
       <button type="button" onClick={() => setConfirmRebuild(true)} className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 whitespace-nowrap">Cập nhật lại từ đầu</button>
     ) : (
       <div className="flex items-center gap-2">
         <span>Ghi đè bản sửa tay?</span>
         <button type="button" onClick={() => { onChange({...state, copies: {launch:currentAuto, story:currentAuto, action:currentAuto}}); setConfirmRebuild(false); }} className="px-2 py-1 bg-red-800 rounded hover:bg-red-700">Ghi đè</button>
         <button type="button" onClick={() => setConfirmRebuild(false)} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600">Hủy</button>
       </div>
     )}
   </div>
 )}

 {fields.map(f=><label key={f.key} className="block text-slate-300">
   <div className="flex justify-between items-end">
     <span>{f.label}</span>
     {f.multiline && initial[f.key] && <button type="button" onClick={() => update(f.key, (initial[f.key] as string).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n'))} className="text-xs text-slate-500 hover:text-emerald-400">Chuẩn hóa dòng</button>}
   </div>
   {f.multiline?<textarea aria-label={f.label} placeholder={isEn && f.placeholderEn ? f.placeholderEn : f.placeholder} rows={3} value={initial[f.key]||''} onChange={e=>update(f.key,e.target.value)} className="mt-1 w-full rounded-lg bg-slate-950 p-2"/>:<input aria-label={f.label} placeholder={isEn && f.placeholderEn ? f.placeholderEn : f.placeholder} value={initial[f.key]||''} onChange={e=>update(f.key,e.target.value)} className="mt-1 w-full rounded-lg bg-slate-950 p-2"/>}
 </label>)}

 <details className="mt-4 border-t border-slate-700 pt-2">
   <summary className="text-slate-400 cursor-pointer text-sm font-medium">Ghi chú nháp (Raw Notes)</summary>
   <div className="mt-1 text-xs text-slate-500 mb-2">Chỉ lưu nháp, em không xử lý AI hay xuất lên poster.</div>
   <textarea rows={4} value={initial.__notes || ''} onChange={e => update('__notes', e.target.value)} className="w-full rounded-lg bg-slate-950 p-2 text-slate-300 text-sm" placeholder={isEn ? "Paste raw text here..." : "Dán nội dung thô vào đây để tham khảo..."} />
 </details>
 </fieldset>;
}
