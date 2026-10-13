'use client';
// Banner sản phẩm: 1 ảnh → tách nền (client) → bộ banner đa sàn.
import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Loader2, X } from 'lucide-react';
import { BANNER_SIZES, drawProductBanner } from '@/lib/product-banner-engine';
import { loadBrand, FONT_PRESETS } from '@/lib/brand-presets';
import { marketingZip } from '@/lib/marketing-zip';

export default function ProductBannerPage() {
  const [size, setSize] = useState('square');
  const [bgStyle, setBgStyle] = useState<'studio' | 'gradient' | 'solid'>('studio');
  const [headline, setHeadline] = useState('SẢN PHẨM MỚI');
  const [price, setPrice] = useState('199.000đ');
  const [oldPrice, setOldPrice] = useState('299.000đ');
  const [saleTag, setSaleTag] = useState('-30%');
  const [cta, setCta] = useState('MUA NGAY');
  const [brandName, setBrandName] = useState('MIVY');
  const [primary, setPrimary] = useState('#0f172a');
  const [accent, setAccent] = useState('#10b981');
  const [fontId, setFontId] = useState('be-vietnam');
  const [cutoutUrl, setCutoutUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState('');
  const prodRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const b = loadBrand();
    if (b) { setBrandName(b.name || 'MIVY'); setPrimary(b.colorPrimary || '#0f172a'); setAccent(b.colorAccent || '#10b981'); setFontId(b.fontHeadingId || 'be-vietnam'); }
  }, []);

  useEffect(() => {
    if (!cutoutUrl) { prodRef.current = null; setReady((n) => n + 1); return; }
    const im = new Image(); im.onload = () => { prodRef.current = im; setReady((n) => n + 1); }; im.onerror = () => { prodRef.current = null; setReady((n) => n + 1); }; im.src = cutoutUrl;
  }, [cutoutUrl]);

  const opts = () => ({ size, bgStyle, productImg: prodRef.current, headline, price, oldPrice, saleTag, cta, brandName, colorPrimary: primary, colorAccent: accent, fontHeadingId: fontId, fontBodyId: fontId });
  useEffect(() => { if (canvasRef.current) drawProductBanner(canvasRef.current, opts()); }, [size, bgStyle, headline, price, oldPrice, saleTag, cta, brandName, primary, accent, fontId, ready]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setErr(''); setProcessing(true);
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const blob = await removeBackground(f);
      setCutoutUrl(URL.createObjectURL(blob));
    } catch (e2) {
      // fallback: dùng ảnh gốc
      setErr('Tách nền thất bại — dùng tạm ảnh gốc. Thử ảnh nền đơn giản hơn.');
      setCutoutUrl(URL.createObjectURL(f));
    } finally { setProcessing(false); }
  };

  const downloadAll = async () => {
    const files: { name: string; data: Uint8Array }[] = [];
    for (const s of BANNER_SIZES) {
      const c = document.createElement('canvas'); drawProductBanner(c, { ...opts(), size: s.id });
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res));
      if (blob) files.push({ name: `mivy-${s.id}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
    }
    const zip = marketingZip(files); const u = URL.createObjectURL(zip); const a = document.createElement('a'); a.href = u; a.download = 'mivy-banner-san-pham.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000);
  };
  const downloadOne = () => {
    const c = document.createElement('canvas'); drawProductBanner(c, opts());
    c.toBlob((b) => { if (!b) return; const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `mivy-${size}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); });
  };

  const cur = BANNER_SIZES.find((s) => s.id === size)!;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Banner sản phẩm đa sàn</h1>
        <p className="text-slate-400 text-sm mt-1">1 ảnh sản phẩm → tự tách nền → ra bộ banner đúng khổ Shopee/Lazada/TikTok/FB. Tải cả bộ.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="glass-card p-4 rounded-2xl flex flex-col items-center">
          {!cutoutUrl && !processing && (
            <label className="w-full aspect-square max-w-md flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/15 hover:border-emerald-500/60 cursor-pointer text-slate-400 transition-colors">
              <Upload className="w-10 h-10 text-emerald-400" />
              <span className="font-semibold text-white">Tải ảnh sản phẩm lên</span>
              <span className="text-xs">PNG/JPG — tự động tách nền trong trình duyệt</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onUpload} />
            </label>
          )}
          {processing && (
            <div className="w-full aspect-square max-w-md flex flex-col items-center justify-center gap-3 text-slate-300">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <span className="font-semibold">Đang tách nền…</span>
              <span className="text-xs text-slate-500">Lần đầu tải model ~vài giây</span>
            </div>
          )}
          {cutoutUrl && !processing && (
            <>
              <canvas ref={canvasRef} className="w-full rounded-xl border border-white/10" style={{ maxWidth: cur.w >= cur.h ? 440 : 300, aspectRatio: `${cur.w}/${cur.h}` }} />
              <p className="text-[11px] text-slate-500 mt-2">{cur.label} · {cur.w}×{cur.h}px</p>
              {err && <p className="text-[11px] text-amber-400 mt-1">{err}</p>}
              <div className="flex gap-3 mt-3 flex-wrap justify-center">
                <button onClick={downloadOne} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400"><Download className="w-4 h-4" /> Tải khổ này</button>
                <button onClick={downloadAll} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-white font-semibold text-xs hover:bg-white/10"><Download className="w-4 h-4 text-emerald-400" /> Tải cả bộ (ZIP)</button>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-slate-300 font-semibold text-xs hover:bg-white/10 cursor-pointer"><Upload className="w-4 h-4" /> Đổi ảnh<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onUpload} /></label>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Khổ</p>
            <div className="grid grid-cols-2 gap-1.5">
              {BANNER_SIZES.map((s) => (
                <button key={s.id} onClick={() => setSize(s.id)} className={`px-2 py-2 rounded-xl text-[11px] font-semibold border transition-all text-left ${size === s.id ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-black/40 text-slate-300 border-white/10 hover:border-white/30'}`}>{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Nền</p>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
              {([['studio', 'Studio'], ['gradient', 'Màu nhấn'], ['solid', 'Trơn']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setBgStyle(v)} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold ${bgStyle === v ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Tiêu đề (vd SẢN PHẨM MỚI)" className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            <div className="flex gap-2">
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Giá" className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
              <input value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="Giá gốc" className="w-28 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-slate-400 placeholder-slate-700 focus:outline-none focus:border-emerald-500" />
            </div>
            <div className="flex gap-2">
              <input value={saleTag} onChange={(e) => setSaleTag(e.target.value)} placeholder="Sale tag (vd -30%)" className="w-28 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
              <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Nút (MUA NGAY)" className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            </div>
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Tên thương hiệu" className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-300"><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border border-white/20 p-0" /> Nhấn</label>
            <label className="flex items-center gap-1.5 text-xs text-slate-300"><input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border border-white/20 p-0" /> Nền trơn</label>
            <select value={fontId} onChange={(e) => setFontId(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500">
              {FONT_PRESETS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
