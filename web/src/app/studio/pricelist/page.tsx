'use client';
// Bảng giá / Menu — render code từ Brand Kit.
import { useEffect, useRef, useState } from 'react';
import { Download, Plus, Trash2, Sparkles } from 'lucide-react';
import { drawPriceList, PriceItem } from '@/lib/pricelist-engine';
import { loadBrand, FONT_PRESETS, contactLine } from '@/lib/brand-presets';
import { PageHeader } from '@/components/PageHeader';
import { suggestMenuTitle } from '@/lib/copy-library';

const SAMPLE: PriceItem[] = [
  { name: 'Cà phê sữa đá', price: '25.000đ', desc: 'Đậm vị, pha phin truyền thống' },
  { name: 'Bạc xỉu', price: '30.000đ', desc: '' },
  { name: 'Trà đào cam sả', price: '35.000đ', desc: 'Giải nhiệt, nhiều topping' },
  { name: 'Bánh mì chảo', price: '45.000đ', desc: '' },
];

export default function PriceListPage() {
  const [title, setTitle] = useState('BẢNG GIÁ');
  const [items, setItems] = useState<PriceItem[]>(SAMPLE);
  const [brandName, setBrandName] = useState('MIVY');
  const [contact, setContact] = useState('');
  const [primary, setPrimary] = useState('#0f172a');
  const [accent, setAccent] = useState('#1f2937');
  const [fontId, setFontId] = useState('be-vietnam');
  const [style, setStyle] = useState<'dark' | 'light' | 'elegant'>('elegant');
  const [aspect, setAspect] = useState<'4:5' | '9:16' | '1:1'>('4:5');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const b = loadBrand();
    if (b) { setBrandName(b.name || 'MIVY'); setContact(contactLine(b.contact) || ''); setPrimary(b.colorPrimary || '#0f172a'); setAccent(b.colorAccent || '#1f2937'); setFontId(b.fontHeadingId || 'be-vietnam'); }
  }, []);

  const [fontTick, setFontTick] = useState(0);
  useEffect(() => { (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready?.then(() => setFontTick((t) => t + 1)); }, []);

  const opts = () => ({ title, items, brandName, contact, colorPrimary: primary, colorAccent: accent, fontHeadingId: fontId, fontBodyId: fontId, style, aspect });
  useEffect(() => { if (canvasRef.current) drawPriceList(canvasRef.current, opts()); }, [title, items, brandName, contact, primary, accent, fontId, style, aspect, fontTick]);

  const [titleIdx, setTitleIdx] = useState(0);
  const suggestTitle = () => { const n = titleIdx + 1; setTitleIdx(n); setTitle(suggestMenuTitle(n)); };

  const setItem = (i: number, k: keyof PriceItem, v: string) => setItems((a) => a.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem = () => setItems((a) => [...a, { name: '', price: '', desc: '' }]);
  const delItem = (i: number) => setItems((a) => a.filter((_, idx) => idx !== i));

  const download = () => {
    const c = document.createElement('canvas'); drawPriceList(c, { ...opts(), scale: 2 });
    c.toBlob((b) => { if (!b) return; const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `mivy-bang-gia-${aspect.replace(':', 'x')}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Bảng giá / Menu"
        sub="Điền món & giá — ra bảng giá đẹp để đăng/in. Lấy màu, font, liên hệ từ Brand Kit."
        actions={<button onClick={download} className="mv-btn mv-btn-primary"><Download className="w-4 h-4" /> Tải PNG</button>}
      />

      <div className="grid lg:grid-cols-[1fr_380px] gap-7 items-start">
        <div className="glass-card p-6 flex flex-col items-center lg:sticky lg:top-4 self-start hover:!transform-none">
          <div className="w-full rounded-xl bg-black/25 border border-white/[0.05] p-5 flex items-center justify-center min-h-[420px]">
            <canvas ref={canvasRef} className="rounded-lg shadow-2xl max-h-[520px] w-auto" style={{ maxWidth: 420 }} />
          </div>
        </div>

        <div className="glass-card p-5 space-y-6">
          <div>
            <div className="mv-label mb-2.5">Phong cách</div>
            <div className="mv-seg w-full">
              {([['elegant', 'Sang trọng'], ['light', 'Kem sáng'], ['dark', 'Tối']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setStyle(v)} data-active={style === v} className="mv-seg-btn flex-1 text-center">{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="mv-label mb-2.5">Khổ</div>
            <div className="mv-seg w-full">
              {(['4:5', '9:16', '1:1'] as const).map((a) => (
                <button key={a} onClick={() => setAspect(a)} data-active={aspect === a} className="mv-seg-btn flex-1 text-center">{a}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="mv-label">Tiêu đề</div>
              <button onClick={suggestTitle} className="mv-btn mv-btn-ghost !gap-1 !px-2.5 !py-1 !text-[11px]" title="Gợi ý tiêu đề"><Sparkles className="w-3.5 h-3.5" /> Gợi ý</button>
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề (vd BẢNG GIÁ, MENU)" className="mv-input" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="mv-label">Món / Dịch vụ <span className="text-slate-600 font-normal">· {items.length}</span></div>
              <button onClick={addItem} className="mv-btn mv-btn-ghost !gap-1 !px-2.5 !py-1 !text-[11px]"><Plus className="w-3.5 h-3.5" /> Thêm món</button>
            </div>
            <div className="mv-stagger space-y-2.5 max-h-[22rem] overflow-auto pr-1 -mr-1">
              {items.map((it, i) => (
                <div key={i} className="glass-card !rounded-xl p-2.5 space-y-2">
                  <div className="flex gap-2 items-center">
                    <span className="grid place-items-center w-5 h-5 rounded-md bg-indigo-500/15 text-indigo-300 text-[10px] font-bold shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0"><input value={it.name} onChange={(e) => setItem(i, 'name', e.target.value)} placeholder="Tên món / dịch vụ" className="mv-input !py-1.5 text-sm" /></div>
                    <div className="w-24 shrink-0"><input value={it.price} onChange={(e) => setItem(i, 'price', e.target.value)} placeholder="Giá" className="mv-input !py-1.5 !px-2.5 text-sm text-right" /></div>
                    <button onClick={() => delItem(i)} className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Xoá món"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <input value={it.desc || ''} onChange={(e) => setItem(i, 'desc', e.target.value)} placeholder="Mô tả ngắn (tuỳ chọn)" className="mv-input !py-1.5 text-xs" />
                </div>
              ))}
              {items.length === 0 && <p className="text-[12px] text-slate-500 text-center py-4">Chưa có món nào — bấm “Thêm món”.</p>}
            </div>
          </div>

          <div>
            <div className="mv-label mb-2.5">Thương hiệu &amp; liên hệ</div>
            <div className="space-y-2.5">
              <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Tên thương hiệu" className="mv-input" />
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Liên hệ (hiện ở chân trang)" className="mv-input" />
            </div>
          </div>

          <div>
            <div className="mv-label mb-2.5">Màu &amp; font</div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"><input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/15 p-0" /> Nền</label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/15 p-0" /> Nhấn</label>
              <select value={fontId} onChange={(e) => setFontId(e.target.value)} className="mv-chip-select flex-1">
                {FONT_PRESETS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
