'use client';
// Bộ nhận diện shop 1 lần: điền brand → sinh trọn bộ logo/avatar/bìa/name card/áo/ly/túi → tải 1 ZIP.
import { useEffect, useRef, useState } from 'react';
import { Download, Upload, X, Loader2 } from 'lucide-react';
import { drawBrandAsset, drawWordmark } from '@/lib/brandasset-engine';
import { drawMerch } from '@/lib/merch-engine';
import { loadBrand, FONT_PRESETS, contactLine } from '@/lib/brand-presets';
import { marketingZip } from '@/lib/marketing-zip';

type Comp = { id: string; label: string; aspect: string; render: (c: HTMLCanvasElement) => void };

export default function BrandPackPage() {
  const [brandName, setBrandName] = useState('MIVY');
  const [slogan, setSlogan] = useState('Chất lượng tạo niềm tin');
  const [contact, setContact] = useState('');
  const [primary, setPrimary] = useState('#0f172a');
  const [accent, setAccent] = useState('#10b981');
  const [fontId, setFontId] = useState('be-vietnam');
  const [logoUrl, setLogoUrl] = useState('');
  const logoRef = useRef<HTMLImageElement | null>(null);
  const mkRef = useRef<Record<string, HTMLImageElement>>({});
  const [ready, setReady] = useState(0);
  const [zipping, setZipping] = useState(false);
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  useEffect(() => {
    const b = loadBrand();
    if (b) { setBrandName(b.name || 'MIVY'); setSlogan(b.slogan || 'Chất lượng tạo niềm tin'); setContact(contactLine(b.contact) || ''); setPrimary(b.colorPrimary || '#0f172a'); setAccent(b.colorAccent || '#10b981'); setFontId(b.fontHeadingId || 'be-vietnam'); if (b.logo) setLogoUrl(b.logo); }
  }, []);

  useEffect(() => {
    if (!logoUrl) { logoRef.current = null; setReady((n) => n + 1); return; }
    const im = new Image(); im.onload = () => { logoRef.current = im; setReady((n) => n + 1); }; im.onerror = () => { logoRef.current = null; setReady((n) => n + 1); }; im.src = logoUrl;
  }, [logoUrl]);

  // nạp ảnh mockup merch 1 lần
  useEffect(() => {
    let left = 3;
    (['tshirt', 'mug', 'tote'] as const).forEach((id) => {
      const im = new Image(); im.onload = () => { mkRef.current[id] = im; if (--left === 0) setReady((n) => n + 1); }; im.onerror = () => { if (--left === 0) setReady((n) => n + 1); }; im.src = `/mockups/${id}.jpg`;
    });
  }, []);

  const base = () => ({ colorPrimary: primary, colorSecondary: primary, colorAccent: accent, fontHeadingId: fontId, fontBodyId: fontId, brandName, slogan, logoImg: logoRef.current });
  const merchBase = () => ({ productColor: primary, logoImg: logoRef.current, brandName, slogan, accent, fontHeadingId: fontId, contact, mode: 'photo' as const });

  const comps: Comp[] = [
    { id: 'logo', label: 'Logo', aspect: '1200/420', render: (c) => drawWordmark(c, { ...base(), kind: 'logo' }) },
    { id: 'avatar', label: 'Avatar', aspect: '1/1', render: (c) => drawBrandAsset(c, { ...base(), kind: 'avatar' }) },
    { id: 'cover', label: 'Bìa Facebook', aspect: '1640/624', render: (c) => drawBrandAsset(c, { ...base(), kind: 'fb', coverTemplate: 'brand', usps: ['Uy tín', 'Chất lượng', 'Tận tâm'], contact }) },
    { id: 'namecard', label: 'Name card', aspect: '1/1', render: (c) => drawMerch(c, { ...merchBase(), item: 'namecard', mode: 'vector', mockupImg: null }) },
    { id: 'tshirt', label: 'Áo thun', aspect: '1/1', render: (c) => drawMerch(c, { ...merchBase(), item: 'tshirt', mockupImg: mkRef.current.tshirt || null }) },
    { id: 'mug', label: 'Ly', aspect: '1/1', render: (c) => drawMerch(c, { ...merchBase(), item: 'mug', mockupImg: mkRef.current.mug || null }) },
    { id: 'tote', label: 'Túi tote', aspect: '1/1', render: (c) => drawMerch(c, { ...merchBase(), item: 'tote', mockupImg: mkRef.current.tote || null }) },
  ];

  useEffect(() => { comps.forEach((cp) => { const c = canvasRefs.current[cp.id]; if (c) cp.render(c); }); }, [brandName, slogan, contact, primary, accent, fontId, ready]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setLogoUrl(String(r.result)); r.readAsDataURL(f); };

  const downloadAll = async () => {
    setZipping(true);
    try {
      const files: { name: string; data: Uint8Array }[] = [];
      for (const cp of comps) {
        const c = document.createElement('canvas'); cp.render(c);
        const blob = await new Promise<Blob | null>((res) => c.toBlob(res));
        if (blob) files.push({ name: `mivy-${cp.id}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
      }
      const zip = marketingZip(files); const u = URL.createObjectURL(zip); const a = document.createElement('a'); a.href = u; a.download = `mivy-bo-nhan-dien-${(brandName || 'brand').replace(/\s+/g, '-').toLowerCase()}.zip`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500);
    } finally { setZipping(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Bộ nhận diện shop (1 lần)</h1>
        <p className="text-slate-400 text-sm mt-1">Điền tên &amp; màu → ra trọn bộ: logo, avatar, bìa, name card, áo, ly, túi. Tải 1 ZIP đi in &amp; đăng.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_330px] gap-6">
        {/* Lưới xem trước */}
        <div className="grid grid-cols-2 gap-3">
          {comps.map((cp) => (
            <div key={cp.id} className="glass-card p-3 rounded-2xl">
              <p className="text-[11px] font-bold text-slate-300 mb-1.5">{cp.label}</p>
              <canvas ref={(el) => { canvasRefs.current[cp.id] = el; }} className="w-full rounded-lg border border-white/10 bg-black/30" style={{ aspectRatio: cp.aspect }} />
            </div>
          ))}
        </div>

        {/* Điều khiển */}
        <div className="space-y-4">
          <button onClick={downloadAll} disabled={zipping} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 disabled:opacity-60">
            {zipping ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang đóng gói…</> : <><Download className="w-4 h-4" /> Tải trọn bộ (ZIP)</>}
          </button>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Logo (tuỳ chọn)</p>
            <div className="flex items-center gap-2">
              {logoUrl ? <div className="relative"><img src={logoUrl} className="w-12 h-12 object-contain rounded-lg bg-white/10 border border-white/10" alt="logo" /><button onClick={() => setLogoUrl('')} className="absolute -top-1.5 -right-1.5 bg-rose-500 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button></div> : <span className="text-xs text-slate-500">Chưa có — dùng chữ cái đầu</span>}
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-emerald-400 cursor-pointer"><Upload className="w-3.5 h-3.5" /> Tải logo<input type="file" accept="image/*" className="sr-only" onChange={onFile} /></label>
            </div>
          </div>

          <div className="space-y-2">
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Tên thương hiệu" className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            <input value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Slogan" className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Liên hệ (name card / bìa)" className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-300"><input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border border-white/20 p-0" /> Chính</label>
            <label className="flex items-center gap-1.5 text-xs text-slate-300"><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent border border-white/20 p-0" /> Nhấn</label>
            <select value={fontId} onChange={(e) => setFontId(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500">
              {FONT_PRESETS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <p className="text-[11px] text-slate-500">Mẹo: tạo Brand Kit ở mục Thương hiệu trước, ở đây sẽ tự lấy sẵn.</p>
        </div>
      </div>
    </div>
  );
}
