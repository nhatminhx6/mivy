'use client';
import {useEffect,useRef} from 'react';
import {AssetInfo,MarketingState} from '@/types';
import {CATEGORIES,TEMPLATES} from '@/lib/template-catalog';
import {CONCEPTS,EXAMPLES,makeIndustryCopy} from '@/lib/industry-concepts';
import {drawIndustryPoster} from '@/lib/design-engine';
function Preview({state,id}:{state:MarketingState;id:string}) {
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{let active=true; let asset:AssetInfo|null=null; let bg:HTMLImageElement|null=null; const render=()=>{if(active && ref.current)drawIndustryPoster(ref.current,{...state,templateId:id,conceptId:CONCEPTS.some(c=>c.id===id)?id:undefined},'launch',state.copies.launch,asset,bg);};render();document.fonts.ready.then(render); const bgSrc=state.backgroundImage || state.bgUrl; if(bgSrc){const im=new Image();im.crossOrigin="anonymous";im.onload=()=>{bg=im;render();};im.src=bgSrc;} const src=state.cutout || state.image; if(src){const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{asset={im,l:0,t:0,w:im.naturalWidth,h:im.naturalHeight};render();};im.src=src;}return()=>{active=false;};},[state,id]);
 return <canvas ref={ref} className="w-full rounded-lg" aria-label={`Xem trước ${id}`} />;
}
export function TemplateLibrary({state,onChange,onCategoryChange}:{state:MarketingState;onChange:(s:MarketingState)=>void;onCategoryChange:(id:string)=>void}){
 const category=state.categoryId || (state.industry==='general'?'retail':state.industry);
 const concepts=CONCEPTS.filter(c=>c.category===category);
 const templates=TEMPLATES.filter(t=>(t.categories as readonly string[]).includes(category));
 return <section className="glass-panel rounded-2xl p-5 space-y-4">
  <div><h2 className="text-xl font-bold text-white">Chọn mẫu thiết kế</h2><p className="text-sm text-slate-400 mt-1">Tuyển dụng, bất động sản, ẩm thực có mẫu riêng. Các ngành còn lại dùng mẫu chung. Bản nháp được lưu riêng theo ngành.</p></div>
  <div className="flex flex-wrap gap-2" aria-label="Nhóm ngành">{CATEGORIES.map(c=><button type="button" key={c.id} aria-pressed={category===c.id} onClick={()=>onCategoryChange(c.id)} className={`px-3 py-2 text-sm rounded-full border ${category===c.id?'bg-emerald-400 text-slate-950 border-emerald-400':'border-white/15 text-slate-300'}`}>{c.name}</button>)}</div>
  <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">{concepts.length ? concepts.map(c=>{ const copy=makeIndustryCopy(category,EXAMPLES[category]);const example={...state,brand:"MIVY · DEMO",industryFields:EXAMPLES[category],image:undefined,cutout:undefined,backgroundImage:undefined,bgUrl:undefined,copies:{launch:copy,story:copy,action:copy}}; return <button type="button" key={c.id} aria-pressed={state.conceptId===c.id} onClick={()=>onChange({...state,conceptId:c.id,templateId:undefined})} className={`text-left p-3 rounded-xl border-2 ${state.conceptId===c.id?"border-emerald-400":"border-white/10"}`}><Preview state={example} id={c.id}/><strong className="block mt-3 text-white">{c.name}</strong><p className="text-xs text-slate-400 mt-1">{c.description}</p><span className="text-xs text-amber-300">Nội dung minh họa</span></button>}) : templates.map(t=><button type="button" key={t.id} onClick={()=>onChange({...state,templateId:t.id,conceptId:undefined})} aria-pressed={state.templateId===t.id} className={`text-left p-3 rounded-xl border-2 ${state.templateId===t.id?'border-emerald-400 bg-emerald-400/5':'border-white/10 bg-black/10'}`}>
    <Preview state={state} id={t.id}/><div className="mt-3 text-white font-bold">{t.name}{state.templateId===t.id?' ✓':''}</div><p className="text-xs text-slate-400 mt-1">{t.description}</p><p className="text-xs text-emerald-300 mt-2">{t.photo?'Dùng ảnh của anh':'Không cần ảnh'}</p>
  </button>)}</div>
 </section>;
}
