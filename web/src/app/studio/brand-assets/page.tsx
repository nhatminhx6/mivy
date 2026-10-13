'use client';
// Ảnh bìa (FB/Zalo/Shopee/YouTube) + Avatar — render code từ Brand Kit.
import { useEffect, useRef, useState } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { ASSET_KINDS, COVER_TEMPLATES, drawBrandAsset } from '@/lib/brandasset-engine';
import { loadBrand, FONT_PRESETS, contactLine } from '@/lib/brand-presets';
import { marketingZip } from '@/lib/marketing-zip';

export default function BrandAssetsPage() {
  const [kind, setKind] = useState('fb');
  const [style, setStyle] = useState<'gradient' | 'solid' | 'photo'>('gradient');
  const [brandName, setBrandName] = useState('MIVY');
  const [slogan, setSlogan] = useState('');
  const [contact, setContact] = useState('');
  const [badge, setBadge] = useState('GIẢM 30%');
  const [cta, setCta] = useState('MUA NGAY');
  const [coverTemplate, setCoverTemplate] = useState('burst');
  const [uspText, setUspText] = useState('Freeship toàn quốc\nHàng chính hãng\nĐổi trả 7 ngày');
  const [primary, setPrimary] = useState('#0f172a');
  const [accent, setAccent] = useState('#10b981');
  const [fontId, setFontId] = useState('be-vietnam');
  const [logoUrl, setLogoUrl] = useState('');
  const [bgUrl, setBgUrl] = useState('');
  const logoRef = useRef<HTMLImageElement | null>(null);
  const bgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const b = loadBrand();
    if (b) {
      setBrandName(b.name || 'MIVY'); setSlogan(b.slogan || ''); setContact(contactLine(b.contact) || '');
      setPrimary(b.colorPrimary || '#0f172a'); setAccent(b.colorAccent || '#10b981');
      setFontId(b.fontHeadingId || 'be-vietnam'); if (b.logo) setLogoUrl(b.logo);
    }
  }, []);

  useEffect(() => {
    if (!logoUrl) { logoRef.current = null; setReady((n) => n + 1); return; }
    const im = new Image(); im.onload = () => { logoRef.current = im; setReady((n) => n + 1); }; im.onerror = () => { logoRef.current = null; setReady((n) => n + 1); }; im.src = logoUrl;
  }, [logoUrl]);
  useEffect(() => {
    if (!bgUrl) { bgRef.current = null; setReady((n) => n + 1); return; }
    const im = new Image(); im.onload = () => { bgRef.current = im; setReady((n) => n + 1); }; im.onerror = () => { bgRef.current = null; setReady((n) => n + 1); }; im.src = bgUrl;
  }, [bgUrl]);

  const opts = () => ({ kind, style, coverTemplate, colorPrimary: primary, colorSecondary: primary, colorAccent: accent, logoImg: logoRef.current, bgImg: bgRef.current, brandName, slogan, contact, badge, cta, usps: uspText.split('\n').map((s) => s.trim()).filter(Boolean), fontHeadingId: fontId, fontBodyId: fontId });

  useEffect(() => { if (canvasRef.current) drawBrandAsset(canvasRef.current, opts()); }, [kind, style, coverTemplate, brandName, slogan, contact, badge, cta, uspText, primary, accent, fontId, ready]);

  const onFile = (set: (s: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => set(String(r.result)); r.readAsDataURL(f);
  };
  const downloadOne = () => {
    const c = document.createElement('canvas'); drawBrandAsset(c, opts());
    c.toBlob((b) => { if (!b) return; const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `mivy-${kind}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); });
  };
  const downloadAll = async () => {
    const files: { name: string; data: Uint8Array }[] = [];
    for (const k of ASSET_KINDS) {
      const c = document.createElement('canvas'); drawBrandAsset(c, { ...opts(), kind: k.id });
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res));
      if (blob) files.push({ name: `mivy-${k.id}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
    }
    const zip = marketingZip(files); const u = URL.createObjectURL(zip); const a = document.createElement('a'); a.href = u; a.download = 'mivy-bia-avatar.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000);
  };

  const cur = ASSET_KINDS.find((a) => a.id === kind)!;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Ảnh bìa &amp; Avatar</h1>
        <p className="text-slate-400 text-sm mt-1">Bìa Facebook / Zalo / Shopee / YouTube + Avatar — lấy sẵn từ Brand Kit, tải về đăng ngay.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center">
          <canvas ref={canvasRef} className="w-full rounded-xl border border-white/10" style={{ maxWidth: kind === 'avatar' ? 360 : '100%', aspectRatio: `${cur.w}/${cur.h}` }} />
          <p className="text-[11px] text-slate-500 mt-2">{cur.label} · {cur.w}×{cur.h}px</p>
          <div className="flex gap-3 mt-3">
            <button onClick={downloadOne} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400"><Download className="w-4 h-4" /> Tải PNG</button>
            <button onClick={downloadAll} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-white font-semibold text-xs hover:bg-white/10"><Download className="w-4 h-4 text-emerald-400" /> Tải cả bộ (ZIP)</button>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Loại</p>
            <div className="grid grid-cols-2 gap-2">
              {ASSET_KINDS.map((a) => (
                <button key={a.id} onClick={() => setKind(a.id)} className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${kind === a.id ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-black/40 text-slate-300 border-white/10 hover:border-white/30'}`}>{a.label}</button>
              ))}
            </div>
          </div>

          {kind !== 'avatar' && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Mẫu bìa</p>
              <div className="grid grid-cols-2 gap-1.5">
                {COVER_TEMPLATES.map((t) => (
                  <button key={t.id} onClick={() => setCoverTemplate(t.id)} className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${coverTemplate === t.id ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-black/40 text-slate-300 border-white/10 hover:border-white/30'}`}>{t.label}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Kiểu nền</p>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
              {([['gradient', 'Chuyển sắc'], ['solid', 'Màu trơn'], ['photo', 'Ảnh nền']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setStyle(v)} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold ${style === v ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>{l}</button>
              ))}
            </div>
            {style === 'photo' && (
              <div className="flex items-center gap-2 mt-2">
                {bgUrl ? <div className="relative"><img src={bgUrl} className="w-12 h-12 object-cover rounded-lg border border-white/10" alt="bg" /><button onClick={() => setBgUrl('')} className="absolute -top-1.5 -right-1.5 bg-rose-500 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button></div> : <span className="text-xs text-slate-500">Chưa có ảnh nền</span>}
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-emerald-400 cursor-pointer"><Upload className="w-3.5 h-3.5" /> Tải ảnh nền<input type="file" accept="image/*" className="sr-only" onChange={onFile(setBgUrl)} /></label>
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Logo</p>
            <div className="flex items-center gap-2">
              {logoUrl ? <div className="relative"><img src={logoUrl} className="w-12 h-12 object-contain rounded-lg bg-white/10 border border-white/10" alt="logo" /><button onClick={() => setLogoUrl('')} className="absolute -top-1.5 -right-1.5 bg-rose-500 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button></div> : <span className="text-xs text-slate-500">Chưa có — dùng chữ cái đầu</span>}
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-emerald-400 cursor-pointer"><Upload className="w-3.5 h-3.5" /> Tải logo<input type="file" accept="image/*" className="sr-only" onChange={onFile(setLogoUrl)} /></label>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Nội dung</p>
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Tên thương hiệu" className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            <input value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Slogan" className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Liên hệ (SĐT / web)" className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Ưu đãi lớn (vd GIẢM 50%)" className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Nút kêu gọi (vd MUA NGAY)" className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            <textarea value={uspText} onChange={(e) => setUspText(e.target.value)} rows={3} placeholder="Điểm nổi bật (mỗi dòng 1 ý, tối đa 3)" className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none" />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Màu &amp; font</p>
            <div className="flex items-center gap-3 mb-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-300"><input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border border-white/20 p-0" /> Nền</label>
              <label className="flex items-center gap-1.5 text-xs text-slate-300"><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border border-white/20 p-0" /> Nhấn</label>
            </div>
            <select value={fontId} onChange={(e) => setFontId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500">
              {FONT_PRESETS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
