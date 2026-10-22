'use client';
// Bảng giá / Menu: nhiều nhóm món, 2 cột giá, nhãn HOT/MỚI, dán thẳng từ Excel/ghi chú, 4 bố cục, tự co chữ/chia cột
// cho vừa khổ (kể cả A4 in 300dpi). Lấy logo/tên/liên hệ/màu từ bộ nhận diện. Render 100% bằng code.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, ClipboardPaste, Download, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { BrandKit } from '@/types';
import { contactLine, loadBrand } from '@/lib/brand-presets';
import { POSTER_THEMES, type PosterThemeId } from '@/lib/infographic-engine';
import { posterColorsFromBrand } from '@/lib/poster-engine';
import { ILLUSTRATIONS, illustrationUrl } from '@/lib/illustrations';
import { suggestMenuTitle } from '@/lib/copy-library';
import { downloadBlob, embedFontCss } from '@/lib/html-export';
import { slugify } from '@/lib/image-utils';
import {
  FIT_STEPS, PL_ASPECTS, PL_FONT_CSS, PL_LAYOUTS, PriceBoard, fitStart, parsePriceText, serializePriceText,
  type PLAspect, type PLItem, type PLLayout, type PLSection, type PriceData,
} from '@/components/PriceBoard';
import { Scaled } from '@/components/BrandAssets';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { PageHeader } from '@/components/PageHeader';

const PRESETS: { name: string; layout: PLLayout; theme: PosterThemeId; illus: string[]; data: PriceData }[] = [
  {
    name: 'Quán cà phê', layout: 'chalk', theme: 'orange', illus: ['hot_beverage', 'bubble_tea'],
    data: {
      title: 'Menu', subtitle: 'Cà phê · Trà · Bánh', note: 'Mang đi giảm 5k',
      sections: [
        { title: 'Cà phê', items: [
          { name: 'Cà phê đen đá', price: '25.000đ', desc: 'Pha phin truyền thống' }, { name: 'Cà phê sữa đá', price: '29.000đ', badge: 'hot' },
          { name: 'Bạc xỉu', price: '32.000đ' }, { name: 'Cà phê muối', price: '35.000đ', desc: 'Kem muối béo mặn', badge: 'new' },
        ] },
        { title: 'Trà & trà sữa', cols: ['M', 'L'], items: [
          { name: 'Trà đào cam sả', price: '35.000đ', price2: '42.000đ' }, { name: 'Trà sữa trân châu', price: '30.000đ', price2: '37.000đ', badge: 'hot' },
          { name: 'Trà vải lài', price: '35.000đ', price2: '42.000đ' }, { name: 'Matcha latte', price: '39.000đ', price2: '45.000đ' },
        ] },
        { title: 'Bánh', items: [{ name: 'Bánh mì chảo', price: '45.000đ' }, { name: 'Croissant bơ', price: '28.000đ' }, { name: 'Bánh flan', price: '18.000đ' }] },
      ],
    },
  },
  {
    name: 'Spa / Nail', layout: 'elegant', theme: 'pink', illus: [],
    data: {
      title: 'Bảng giá dịch vụ', subtitle: 'Nail · Mi · Spa', note: 'Đặt lịch trước để được ưu tiên',
      sections: [
        { title: 'Nail', items: [
          { name: 'Sơn gel trơn', price: '120.000đ' }, { name: 'Sơn gel + vẽ', price: '180.000đ', desc: 'Vẽ tối đa 4 ngón' },
          { name: 'Đắp bột', price: '250.000đ' }, { name: 'Tháo gel', price: '30.000đ' },
        ] },
        { title: 'Mi', items: [{ name: 'Nối mi classic', price: '200.000đ' }, { name: 'Nối mi volume', price: '350.000đ', badge: 'new' }, { name: 'Uốn mi', price: '150.000đ' }] },
        { title: 'Spa', items: [{ name: 'Gội đầu dưỡng sinh', price: '80.000đ', badge: 'hot' }, { name: 'Chăm sóc da cơ bản', price: '250.000đ' }] },
      ],
    },
  },
  {
    name: 'Bảng giá sỉ shop', layout: 'cards', theme: 'blue', illus: ['shopping_bags'],
    data: {
      title: 'Bảng giá sỉ', subtitle: 'Áp dụng từ 01/11 — số lượng có hạn', note: 'Sỉ từ 10 sản phẩm, được mix mẫu',
      sections: [
        { title: 'Áo', cols: ['Lẻ', 'Sỉ 10+'], items: [
          { name: 'Áo thun cotton', price: '99.000đ', price2: '79.000đ', badge: 'hot' }, { name: 'Áo polo', price: '159.000đ', price2: '129.000đ' },
          { name: 'Áo oversize', price: '129.000đ', price2: '105.000đ' },
        ] },
        { title: 'Quần', cols: ['Lẻ', 'Sỉ 10+'], items: [{ name: 'Quần jean nam', price: '249.000đ', price2: '199.000đ' }, { name: 'Quần short kaki', price: '149.000đ', price2: '119.000đ' }] },
        { title: 'Phụ kiện', cols: ['Lẻ', 'Sỉ 10+'], items: [{ name: 'Nón lưỡi trai', price: '79.000đ', price2: '59.000đ' }, { name: 'Túi tote canvas', price: '89.000đ', price2: '69.000đ', badge: 'new' }] },
      ],
    },
  },
  {
    name: 'Tiệm bánh', layout: 'menu', theme: 'red', illus: ['birthday_cake', 'wrapped_gift'],
    data: {
      title: 'Menu bánh', subtitle: 'Nướng mới mỗi sáng', note: 'Đặt bánh kem trước 1 ngày',
      sections: [
        { title: 'Bánh kem', cols: ['Size 16', 'Size 20'], items: [
          { name: 'Bánh kem dâu', price: '280.000đ', price2: '380.000đ' }, { name: 'Bánh kem socola', price: '300.000đ', price2: '400.000đ', badge: 'hot' },
          { name: 'Mousse chanh dây', price: '320.000đ', price2: '420.000đ', badge: 'new' },
        ] },
        { title: 'Bánh lẻ', items: [{ name: 'Bông lan trứng muối', price: '45.000đ', badge: 'hot' }, { name: 'Tiramisu ly', price: '39.000đ' }, { name: 'Bánh su kem', price: '50.000đ', desc: 'Hộp 10 cái' }] },
        { title: 'Đồ uống', items: [{ name: 'Trà đào', price: '30.000đ' }, { name: 'Sữa tươi trân châu', price: '35.000đ' }] },
      ],
    },
  },
];

const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${on ? 'bg-white text-slate-950 border-white' : 'border-white/15 text-slate-300 hover:text-white hover:border-white/40'}`;

// Nạp font bảng giá (link Google Fonts) rồi chờ sẵn sàng — đo độ vừa khổ cần font thật.
function usePriceFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-pl-fonts') as HTMLLinkElement | null;
    new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) { link = document.createElement('link'); link.id = 'mivy-pl-fonts'; link.rel = 'stylesheet'; link.href = PL_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link); }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    })
      .then(() => Promise.all(['500 20px "Be Vietnam Pro"', '700 20px "Be Vietnam Pro"', '800 20px "Be Vietnam Pro"', '900 20px "Be Vietnam Pro"', '700 20px "Dancing Script"', '800 20px "Playfair Display"', '700 20px "Playfair Display"'].map((f) => document.fonts.load(f, 'Ắâ Aa'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

export default function PriceListPage() {
  const fontsReady = usePriceFonts();
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [data, setData] = useState<PriceData>(PRESETS[0].data);
  const [layout, setLayout] = useState<PLLayout>(PRESETS[0].layout);
  const [aspect, setAspect] = useState<PLAspect>('4:5');
  const [themeId, setThemeId] = useState<PosterThemeId | 'brand'>(PRESETS[0].theme);
  const [illus, setIllus] = useState<string[]>(PRESETS[0].illus);
  const [brandName, setBrandName] = useState('');
  const [contact, setContact] = useState('');
  const [mode, setMode] = useState<'form' | 'paste'>('form');
  const [pasteText, setPasteText] = useState('');
  const [titleIdx, setTitleIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const b = loadBrand();
    if (!b) return;
    setKit(b);
    setBrandName(b.name || '');
    setContact(contactLine(b.contact));
    if (b.name || b.logo) setThemeId('brand');
  }, []);

  const T = themeId === 'brand' && kit ? posterColorsFromBrand(kit) : (POSTER_THEMES.find((t) => t.id === themeId) || POSTER_THEMES[0]);
  const brand = { name: brandName.trim(), logo: kit?.logo, contact: contact.trim() };

  // ---------- tự vừa khổ: thử (cột, cỡ chữ) từ to → nhỏ, lấy mức đầu tiên không tràn ----------
  const fitKey = JSON.stringify([data, layout, aspect, illus, brand, fontsReady]);
  const [fitState, setFitState] = useState({ key: '', idx: 0, over: false });
  const idx = fitState.key === fitKey ? fitState.idx : fitStart(layout);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const over = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    if (over && idx < FIT_STEPS.length - 1) setFitState({ key: fitKey, idx: idx + 1, over: false });
    else if (fitState.key !== fitKey || fitState.idx !== idx || fitState.over !== over) setFitState({ key: fitKey, idx, over });
  });
  const overflow = fitState.key === fitKey && fitState.over;

  // ---------- sửa nội dung ----------
  const set = (patch: Partial<PriceData>) => setData((d) => ({ ...d, ...patch }));
  const setSec = (si: number, patch: Partial<PLSection>) => setData((d) => ({ ...d, sections: d.sections.map((s, i) => (i === si ? { ...s, ...patch } : s)) }));
  const setItem = (si: number, ii: number, patch: Partial<PLItem>) => setSec(si, { items: data.sections[si].items.map((it, i) => (i === ii ? { ...it, ...patch } : it)) });
  const loadPreset = (p: typeof PRESETS[number]) => { setData(p.data); setLayout(p.layout); setIllus(p.illus); if (!(kit && themeId === 'brand')) setThemeId(p.theme); };
  const openPaste = () => { setPasteText(serializePriceText(data.sections)); setMode('paste'); };
  const applyPaste = () => { const secs = parsePriceText(pasteText); if (secs.length) { set({ sections: secs }); setMode('form'); } };
  const toggleIllus = (id: string) => setIllus((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id].slice(-2)));

  const A = PL_ASPECTS.find((a) => a.id === aspect)!;
  const download = async () => {
    if (!nodeRef.current || busy) return;
    setBusy(true);
    try {
      const { toBlob } = await import('html-to-image');
      const b = await toBlob(nodeRef.current, { width: A.w, height: A.h, pixelRatio: 2, fontEmbedCSS: await embedFontCss(PL_FONT_CSS), cacheBust: false, style: { transform: 'none' } });
      if (b) downloadBlob(b, `${slugify(`${brand.name} ${data.title}`, 'bang-gia')}-${aspect === 'A4' ? 'a4-300dpi' : aspect.replace(':', 'x')}.png`);
    } finally { setBusy(false); }
  };

  const itemCount = data.sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Bảng giá / Menu" sub="Nhập hoặc dán danh sách món → chọn bố cục → tự co chữ cho vừa khổ. Tải ảnh đăng mạng hoặc A4 in 300dpi." />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          <CollapsibleSection title="1 · Mẫu">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => <button key={p.name} type="button" onClick={() => loadPreset(p)} className={chip(data === p.data)}>{p.name}</button>)}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="2 · Bố cục, khổ & màu">
            <div className="mv-label mb-1.5">Bố cục</div>
            <div className="flex flex-wrap gap-1.5 mb-4">{PL_LAYOUTS.map((l) => <button key={l.id} type="button" onClick={() => setLayout(l.id)} className={chip(layout === l.id)}>{l.name}</button>)}</div>
            <div className="mv-label mb-1.5">Khổ</div>
            <div className="flex flex-wrap gap-1.5 mb-4">{PL_ASPECTS.map((a) => <button key={a.id} type="button" onClick={() => setAspect(a.id)} className={chip(aspect === a.id)}>{a.name}</button>)}</div>
            <div className="mv-label mb-1.5">Màu</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {kit && (() => { const bc = posterColorsFromBrand(kit); return (
                <button type="button" onClick={() => setThemeId('brand')} className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-semibold ${themeId === 'brand' ? 'border-white bg-white/10 text-white' : 'border-white/15 text-slate-300 hover:border-white/40'}`}>
                  <span className="w-5 h-5 rounded-full" style={{ background: bc.main, boxShadow: `inset 0 0 0 3px ${bc.soft}` }} />Thương hiệu
                </button>); })()}
              {POSTER_THEMES.map((t) => (
                <button key={t.id} type="button" onClick={() => setThemeId(t.id)} className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-semibold ${themeId === t.id ? 'border-white bg-white/10 text-white' : 'border-white/15 text-slate-300 hover:border-white/40'}`}>
                  <span className="w-5 h-5 rounded-full" style={{ background: t.main, boxShadow: `inset 0 0 0 3px ${t.soft}` }} />{t.name}
                </button>
              ))}
            </div>
            {layout !== 'elegant' && (<>
              <div className="mv-label mb-1.5">Hình minh hoạ <span className="normal-case text-slate-500">(tối đa 2)</span></div>
              <div className="grid grid-cols-10 sm:grid-cols-12 gap-1 max-h-28 overflow-y-auto pr-1">
                {ILLUSTRATIONS.map((il) => (
                  <button key={il.id} type="button" title={il.name} onClick={() => toggleIllus(il.id)}
                    className={`aspect-square rounded-md border p-0.5 ${illus.includes(il.id) ? 'border-indigo-400 bg-indigo-500/20' : 'border-transparent hover:border-white/25'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={illustrationUrl(il.id)} alt={il.name} className="w-full h-full object-contain" loading="lazy" />
                  </button>
                ))}
              </div>
            </>)}
          </CollapsibleSection>

          <CollapsibleSection title="3 · Nội dung" right={<span className="text-[11px] text-slate-400">{data.sections.length} nhóm · {itemCount} món</span>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block"><span className="mv-label flex justify-between mb-1.5">Tiêu đề
                <button type="button" onClick={() => { const n = titleIdx + 1; setTitleIdx(n); set({ title: suggestMenuTitle(n) }); }} className="normal-case text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1"><Sparkles className="w-3 h-3" />Gợi ý</button></span>
                <input className="mv-input" value={data.title} onChange={(e) => set({ title: e.target.value })} data-testid="pl-title" /></label>
              <label className="block"><span className="mv-label block mb-1.5">Dòng phụ</span><input className="mv-input" value={data.subtitle || ''} onChange={(e) => set({ subtitle: e.target.value })} placeholder="VD: Cà phê · Trà · Bánh" /></label>
              <label className="block"><span className="mv-label block mb-1.5">Tên shop</span><input className="mv-input" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Lấy từ bộ nhận diện" /></label>
              <label className="block"><span className="mv-label block mb-1.5">Liên hệ</span><input className="mv-input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="SĐT · địa chỉ" /></label>
              <label className="block sm:col-span-2"><span className="mv-label block mb-1.5">Ghi chú cuối</span><input className="mv-input" value={data.note || ''} onChange={(e) => set({ note: e.target.value })} placeholder="VD: Giá đã gồm VAT" /></label>
            </div>

            <div className="mv-seg w-full mt-4 mb-3">
              <button type="button" onClick={() => setMode('form')} data-active={mode === 'form'} className="mv-seg-btn flex-1 !justify-center !text-xs">Từng món</button>
              <button type="button" onClick={openPaste} data-active={mode === 'paste'} className="mv-seg-btn flex-1 !justify-center !text-xs"><ClipboardPaste className="w-3.5 h-3.5" /> Dán nhanh từ Excel / ghi chú</button>
            </div>

            {mode === 'paste' ? (
              <div>
                <textarea rows={12} value={pasteText} onChange={(e) => setPasteText(e.target.value)} className="mv-input font-mono !text-xs leading-relaxed" data-testid="pl-paste"
                  placeholder={'# Cà phê\nCà phê sữa đá - 29k\nBạc xỉu | 32.000đ | Ít ngọt\n\n# Trà sữa | M | L\nTrà sữa trân châu | 30k | 37k'} />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Dòng bắt đầu bằng <b>#</b> là tên nhóm (thêm <b>| M | L</b> nếu có 2 cột giá). Mỗi món 1 dòng: <b>Tên | Giá | Mô tả</b>, hoặc <b>Tên - 25k</b>, hoặc copy thẳng các cột từ Excel. Thêm <b>(hot)</b> / <b>(mới)</b> sau tên để gắn nhãn.
                </p>
                <button type="button" onClick={applyPaste} className="mv-btn mv-btn-primary !px-4 !py-2 !text-xs mt-2">Áp dụng</button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.sections.map((sec, si) => (
                  <div key={si} className="rounded-xl border border-white/10 p-3 space-y-2 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <input className="mv-input flex-1 min-w-0 !font-bold" value={sec.title} onChange={(e) => setSec(si, { title: e.target.value })} placeholder="Tên nhóm" />
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-300 shrink-0">
                        <input type="checkbox" checked={!!sec.cols} onChange={(e) => setSec(si, { cols: e.target.checked ? ['M', 'L'] : undefined })} /> 2 cột giá
                      </label>
                      <button type="button" onClick={() => set({ sections: data.sections.filter((_, i) => i !== si) })} className="mv-btn mv-btn-ghost !p-2 !text-rose-300" title="Xoá nhóm"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {sec.cols && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">Tên cột:
                        {[0, 1].map((j) => <input key={j} className="mv-input !w-24 !py-1 !text-xs" value={sec.cols![j]} onChange={(e) => { const c = [...sec.cols!] as [string, string]; c[j] = e.target.value; setSec(si, { cols: c }); }} />)}
                      </div>
                    )}
                    {sec.items.map((it, ii) => (
                      <div key={ii} className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <input className="mv-input flex-1 min-w-0" value={it.name} onChange={(e) => setItem(si, ii, { name: e.target.value })} placeholder="Tên món" />
                          <input className="mv-input !w-24" value={it.price} onChange={(e) => setItem(si, ii, { price: e.target.value })} placeholder="Giá" />
                          {sec.cols && <input className="mv-input !w-24" value={it.price2 || ''} onChange={(e) => setItem(si, ii, { price2: e.target.value })} placeholder={sec.cols[1]} />}
                          <button type="button" onClick={() => setSec(si, { items: sec.items.filter((_, i) => i !== ii) })} className="mv-btn mv-btn-ghost !p-2 !text-rose-300" title="Xoá món"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="flex items-center gap-1.5 pl-0.5">
                          <input className="mv-input flex-1 min-w-0 !py-1 !text-xs" value={it.desc || ''} onChange={(e) => setItem(si, ii, { desc: e.target.value })} placeholder="Mô tả (tuỳ chọn)" />
                          <input className="mv-input !w-24 !py-1 !text-xs" value={it.old || ''} onChange={(e) => setItem(si, ii, { old: e.target.value })} placeholder="Giá cũ" title="Giá cũ (gạch ngang)" />
                          <select className="mv-input !w-20 !py-1 !text-xs" value={it.badge || ''} onChange={(e) => setItem(si, ii, { badge: e.target.value as PLItem['badge'] })}>
                            <option value="">—</option><option value="hot">HOT</option><option value="new">MỚI</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setSec(si, { items: [...sec.items, { name: '', price: '' }] })} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs"><Plus className="w-3.5 h-3.5" /> Thêm món</button>
                  </div>
                ))}
                <button type="button" onClick={() => set({ sections: [...data.sections, { title: 'Nhóm mới', items: [{ name: '', price: '' }] }] })} className="mv-btn mv-btn-ghost !px-3 !py-2 !text-xs"><Plus className="w-3.5 h-3.5" /> Thêm nhóm</button>
              </div>
            )}
          </CollapsibleSection>
        </div>

        {/* Xem trước ghim + tải */}
        <div className="lg:sticky lg:top-4 self-start space-y-3">
          <div className="glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Xem trước</span>
              <span className="text-[10px] font-semibold text-indigo-200 bg-indigo-500/15 border border-indigo-500/30 px-2 py-1 rounded-full">{aspect === 'A4' ? 'A4 · 2480×3508 · 300dpi' : `PNG · ${A.w * 2}×${A.h * 2}`}</span>
            </div>
            <button type="button" onClick={download} disabled={busy || !fontsReady} className="mv-btn mv-btn-primary w-full !flex justify-center !py-3 !text-sm disabled:opacity-60">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Tải ảnh PNG
            </button>
            {overflow && (
              <div className="flex items-start gap-2 text-[11px] text-amber-200 bg-amber-400/10 border border-amber-400/30 rounded-lg px-2.5 py-2" data-testid="pl-overflow">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Danh sách dài quá khổ này. Chọn khổ Story 9:16 hoặc A4, hoặc bớt món / mô tả.
              </div>
            )}
          </div>
          <div className="glass-panel rounded-2xl p-3 border border-white/10" style={{ maxWidth: aspect === '9:16' || aspect === 'A4' ? 360 : undefined, marginInline: 'auto' }}>
            <div className="rounded-xl overflow-hidden" data-testid="pl-preview">
              <Scaled w={A.w} h={A.h} nodeRef={(el) => { nodeRef.current = el; }}>
                <PriceBoard data={data} layout={layout} aspect={aspect} T={T} brand={brand} illus={layout === 'elegant' ? [] : illus} fit={FIT_STEPS[idx]} bodyRef={(el) => { bodyRef.current = el; }} />
              </Scaled>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
