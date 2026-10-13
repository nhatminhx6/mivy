'use client';
// Bảng giá / Menu — render code từ Brand Kit.
import { useEffect, useRef, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { drawPriceList, PriceItem } from '@/lib/pricelist-engine';
import { loadBrand, FONT_PRESETS, contactLine } from '@/lib/brand-presets';

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
  const [accent, setAccent] = useState('#10b981');
  const [fontId, setFontId] = useState('be-vietnam');
  const [style, setStyle] = useState<'dark' | 'light' | 'elegant'>('dark');
  const [aspect, setAspect] = useState<'4:5' | '9:16' | '1:1'>('4:5');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const b = loadBrand();
    if (b) { setBrandName(b.name || 'MIVY'); setContact(contactLine(b.contact) || ''); setPrimary(b.colorPrimary || '#0f172a'); setAccent(b.colorAccent || '#10b981'); setFontId(b.fontHeadingId || 'be-vietnam'); }
  }, []);

  const opts = () => ({ title, items, brandName, contact, colorPrimary: primary, colorAccent: accent, fontHeadingId: fontId, fontBodyId: fontId, style, aspect });
  useEffect(() => { if (canvasRef.current) drawPriceList(canvasRef.current, opts()); }, [title, items, brandName, contact, primary, accent, fontId, style, aspect]);

  const setItem = (i: number, k: keyof PriceItem, v: string) => setItems((a) => a.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem = () => setItems((a) => [...a, { name: '', price: '', desc: '' }]);
  const delItem = (i: number) => setItems((a) => a.filter((_, idx) => idx !== i));

  const download = () => {
    const c = document.createElement('canvas'); drawPriceList(c, opts());
    c.toBlob((b) => { if (!b) return; const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `mivy-bang-gia-${aspect.replace(':', 'x')}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Bảng giá / Menu</h1>
        <p className="text-slate-400 text-sm mt-1">Điền món &amp; giá — ra bảng giá đẹp để đăng/in. Lấy màu, font, liên hệ từ Brand Kit.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="glass-card p-4 rounded-2xl flex flex-col items-center">
          <canvas ref={canvasRef} className="w-full rounded-xl border border-white/10" style={{ maxWidth: 420 }} />
          <button onClick={download} className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400"><Download className="w-4 h-4" /> Tải PNG</button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            {([['dark', 'Tối'], ['light', 'Sáng'], ['elegant', 'Sang trọng']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setStyle(v)} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold border ${style === v ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-black/40 text-slate-300 border-white/10'}`}>{l}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['4:5', '9:16', '1:1'] as const).map((a) => (
              <button key={a} onClick={() => setAspect(a)} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold border ${aspect === a ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-black/40 text-slate-300 border-white/10'}`}>{a}</button>
            ))}
          </div>

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề (vd BẢNG GIÁ, MENU)" className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Món / Dịch vụ</p>
              <button onClick={addItem} className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"><Plus className="w-3.5 h-3.5" /> Thêm</button>
            </div>
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {items.map((it, i) => (
                <div key={i} className="flex gap-1.5 items-start">
                  <div className="flex-1 space-y-1">
                    <div className="flex gap-1.5">
                      <input value={it.name} onChange={(e) => setItem(i, 'name', e.target.value)} placeholder="Tên" className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
                      <input value={it.price} onChange={(e) => setItem(i, 'price', e.target.value)} placeholder="Giá" className="w-24 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
                    </div>
                    <input value={it.desc || ''} onChange={(e) => setItem(i, 'desc', e.target.value)} placeholder="Mô tả (tuỳ chọn)" className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-400 placeholder-slate-700 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <button onClick={() => delItem(i)} className="p-1.5 text-slate-500 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Tên thương hiệu" className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Liên hệ (hiện ở chân trang)" className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-300"><input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border border-white/20 p-0" /> Nền</label>
            <label className="flex items-center gap-1.5 text-xs text-slate-300"><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border border-white/20 p-0" /> Nhấn</label>
            <select value={fontId} onChange={(e) => setFontId(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500">
              {FONT_PRESETS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
