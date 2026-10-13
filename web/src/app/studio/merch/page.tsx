'use client';
// Vật phẩm thương hiệu: đặt logo/brand lên áo, nón, ly, túi, name card, standee... (render code, 0 AI).
import { useEffect, useRef, useState } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { MERCH_ITEMS, drawMerch, hasPhoto } from '@/lib/merch-engine';
import { loadBrand, FONT_PRESETS, contactLine } from '@/lib/brand-presets';
import { marketingZip } from '@/lib/marketing-zip';

const PRODUCT_COLORS = ['#111827', '#ffffff', '#ef4444', '#10b981', '#2563eb', '#f59e0b', '#8b5cf6', '#f472b6', '#64748b', '#0f766e'];
const BG_COLORS = ['#f1f5f9', '#ffffff', '#fef3c7', '#e0f2fe', '#111827', '#1e293b'];

export default function MerchPage() {
  const [item, setItem] = useState('tshirt');
  const [productColor, setProductColor] = useState('#111827');
  const [bgColor, setBgColor] = useState('#f1f5f9');
  const [brandName, setBrandName] = useState('MIVY');
  const [slogan, setSlogan] = useState('');
  const [accent, setAccent] = useState('#10b981');
  const [fontId, setFontId] = useState('be-vietnam');
  const [contact, setContact] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const [logoReady, setLogoReady] = useState(0);
  const [mode, setMode] = useState<'vector' | 'photo'>('photo');
  const mockupImgRef = useRef<HTMLImageElement | null>(null);
  const [mockupReady, setMockupReady] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Prefill từ Brand Kit
  useEffect(() => {
    const b = loadBrand();
    if (b) {
      setBrandName(b.name || 'MIVY');
      setSlogan(b.slogan || '');
      setAccent(b.colorAccent || '#10b981');
      setProductColor(b.colorPrimary || '#111827');
      setFontId(b.fontHeadingId || 'be-vietnam');
      setContact(contactLine(b.contact) || '');
      if (b.logo) setLogoUrl(b.logo);
    }
  }, []);

  // Nạp logo thành Image
  useEffect(() => {
    if (!logoUrl) { logoImgRef.current = null; setLogoReady((n) => n + 1); return; }
    const im = new Image();
    im.onload = () => { logoImgRef.current = im; setLogoReady((n) => n + 1); };
    im.onerror = () => { logoImgRef.current = null; setLogoReady((n) => n + 1); };
    im.src = logoUrl;
  }, [logoUrl]);

  // Nạp ảnh mockup khi dùng mode ảnh thật
  useEffect(() => {
    if (mode !== 'photo' || !hasPhoto(item)) { mockupImgRef.current = null; setMockupReady((n) => n + 1); return; }
    const im = new Image();
    im.onload = () => { mockupImgRef.current = im; setMockupReady((n) => n + 1); };
    im.onerror = () => { mockupImgRef.current = null; setMockupReady((n) => n + 1); };
    im.src = `/mockups/${item}.jpg`;
  }, [item, mode]);

  // Render preview
  useEffect(() => {
    if (canvasRef.current) {
      drawMerch(canvasRef.current, { item, productColor, bgColor, logoImg: logoImgRef.current, brandName, slogan, accent, fontHeadingId: fontId, contact, mode, mockupImg: mockupImgRef.current });
    }
  }, [item, productColor, bgColor, brandName, slogan, accent, fontId, contact, logoReady, mode, mockupReady]);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setLogoUrl(String(r.result));
    r.readAsDataURL(f);
  };

  const opts = () => ({ item, productColor, bgColor, logoImg: logoImgRef.current, brandName, slogan, accent, fontHeadingId: fontId, contact, mode, mockupImg: mockupImgRef.current });
  const loadImg = (url: string) => new Promise<HTMLImageElement | null>((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });

  const downloadOne = () => {
    const c = document.createElement('canvas');
    drawMerch(c, opts());
    c.toBlob((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      const a = document.createElement('a'); a.href = url; a.download = `mivy-${item}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  };

  const downloadAll = async () => {
    const files: { name: string; data: Uint8Array }[] = [];
    for (const it of MERCH_ITEMS) {
      const c = document.createElement('canvas');
      const mk = mode === 'photo' && hasPhoto(it.id) ? await loadImg(`/mockups/${it.id}.jpg`) : null;
      drawMerch(c, { ...opts(), item: it.id, mockupImg: mk });
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res));
      if (blob) files.push({ name: `mivy-${it.id}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
    }
    const zip = marketingZip(files);
    const url = URL.createObjectURL(zip);
    const a = document.createElement('a'); a.href = url; a.download = 'mivy-vat-pham.zip'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Vật phẩm thương hiệu</h1>
        <p className="text-slate-400 text-sm mt-1">Đặt logo/brand lên áo, nón, ly, túi, name card... — xem trước &amp; tải để đi in. Lấy sẵn từ Brand Kit.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Preview */}
        <div className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center">
          <canvas ref={canvasRef} className="w-full max-w-md rounded-xl border border-white/10" />
          <div className="flex gap-3 mt-4">
            <button onClick={downloadOne} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400">
              <Download className="w-4 h-4" /> Tải PNG
            </button>
            <button onClick={downloadAll} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-white font-semibold text-xs hover:bg-white/10">
              <Download className="w-4 h-4 text-emerald-400" /> Tải cả bộ (ZIP)
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Kiểu hiển thị</p>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
              <button onClick={() => setMode('photo')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'photo' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>📷 Ảnh thật</button>
              <button onClick={() => setMode('vector')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'vector' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>▲ Vector</button>
            </div>
            {mode === 'photo' && !hasPhoto(item) && (
              <p className="text-[11px] text-amber-400 mt-1.5">Món này chưa có ảnh thật — đang hiện vector. (Ảnh thật: áo thun, nón, ly, ly giữ nhiệt, túi tote, túi giấy)</p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Vật phẩm</p>
            <div className="grid grid-cols-2 gap-2">
              {MERCH_ITEMS.map((m) => (
                <button key={m.id} onClick={() => setItem(m.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${item === m.id ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-black/40 text-slate-300 border-white/10 hover:border-white/30'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Logo</p>
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <div className="relative">
                  <img src={logoUrl} alt="logo" className="w-12 h-12 object-contain rounded-lg bg-white/10 border border-white/10" />
                  <button onClick={() => setLogoUrl('')} className="absolute -top-1.5 -right-1.5 bg-rose-500 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button>
                </div>
              ) : <span className="text-xs text-slate-500">Chưa có — sẽ dùng tên brand</span>}
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-emerald-400 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Tải logo
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only" onChange={onUpload} />
              </label>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Tên &amp; slogan</p>
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Tên thương hiệu"
              className="w-full mb-2 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            <input value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Slogan (tuỳ chọn)"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            {item === 'namecard' && (
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Liên hệ (SĐT / email)"
                className="w-full mt-2 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Màu sản phẩm</p>
            <div className="flex flex-wrap gap-2 items-center">
              {PRODUCT_COLORS.map((c) => (
                <button key={c} onClick={() => setProductColor(c)} style={{ background: c }}
                  className={`w-7 h-7 rounded-full border-2 ${productColor === c ? 'border-emerald-400 scale-110' : 'border-white/20'} transition-all`} />
              ))}
              <input type="color" value={productColor} onChange={(e) => setProductColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border border-white/20 p-0" />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Nền &amp; nhấn &amp; font</p>
            <div className="flex flex-wrap gap-2 items-center mb-2">
              {BG_COLORS.map((c) => (
                <button key={c} onClick={() => setBgColor(c)} style={{ background: c }}
                  className={`w-6 h-6 rounded-full border-2 ${bgColor === c ? 'border-emerald-400' : 'border-white/20'}`} />
              ))}
              <span className="text-[10px] text-slate-500 ml-1">nền</span>
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} title="Màu nhấn" className="w-6 h-6 rounded cursor-pointer bg-transparent border border-white/20 p-0 ml-2" />
              <span className="text-[10px] text-slate-500">nhấn</span>
            </div>
            <select value={fontId} onChange={(e) => setFontId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500">
              {FONT_PRESETS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
