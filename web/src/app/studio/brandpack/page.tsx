'use client';
// Bộ nhận diện shop 1 lần: điền brand → sinh trọn bộ logo/avatar/bìa/name card/áo/ly/túi → tải 1 ZIP.
import { useEffect, useRef, useState } from 'react';
import { Download, Upload, X, Loader2 } from 'lucide-react';
import { drawBrandAsset, drawWordmark } from '@/lib/brandasset-engine';
import { drawMerch } from '@/lib/merch-engine';
import { loadBrand, FONT_PRESETS, contactLine } from '@/lib/brand-presets';
import { marketingZip } from '@/lib/marketing-zip';
import { PageHeader } from '@/components/PageHeader';

type Comp = { id: string; label: string; aspect: string; render: (c: HTMLCanvasElement, scale?: number) => void };

export default function BrandPackPage() {
  const [brandName, setBrandName] = useState('MIVY');
  const [slogan, setSlogan] = useState('Chất lượng tạo niềm tin');
  const [contact, setContact] = useState('');
  const [primary, setPrimary] = useState('#0f172a');
  const [accent, setAccent] = useState('#1f2937');
  const [fontId, setFontId] = useState('be-vietnam');
  const [logoUrl, setLogoUrl] = useState('');
  const logoRef = useRef<HTMLImageElement | null>(null);
  const mkRef = useRef<Record<string, HTMLImageElement>>({});
  const [ready, setReady] = useState(0);
  const [zipping, setZipping] = useState(false);
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  useEffect(() => {
    const b = loadBrand();
    if (b) { setBrandName(b.name || 'MIVY'); setSlogan(b.slogan || 'Chất lượng tạo niềm tin'); setContact(contactLine(b.contact) || ''); setPrimary(b.colorPrimary || '#0f172a'); setAccent(b.colorAccent || '#1f2937'); setFontId(b.fontHeadingId || 'be-vietnam'); if (b.logo) setLogoUrl(b.logo); }
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
    { id: 'logo', label: 'Logo', aspect: '1200/420', render: (c, s) => drawWordmark(c, { ...base(), kind: 'logo', scale: s }) },
    { id: 'avatar', label: 'Avatar', aspect: '1/1', render: (c, s) => drawBrandAsset(c, { ...base(), kind: 'avatar', scale: s }) },
    { id: 'cover', label: 'Bìa Facebook', aspect: '1640/624', render: (c, s) => drawBrandAsset(c, { ...base(), kind: 'fb', coverTemplate: 'brand', usps: ['Uy tín', 'Chất lượng', 'Tận tâm'], contact, scale: s }) },
    { id: 'namecard', label: 'Name card', aspect: '1/1', render: (c, s) => drawMerch(c, { ...merchBase(), item: 'namecard', mode: 'vector', mockupImg: null, scale: s }) },
    { id: 'tshirt', label: 'Áo thun', aspect: '1/1', render: (c, s) => drawMerch(c, { ...merchBase(), item: 'tshirt', mockupImg: mkRef.current.tshirt || null, scale: s }) },
    { id: 'mug', label: 'Ly', aspect: '1/1', render: (c, s) => drawMerch(c, { ...merchBase(), item: 'mug', mockupImg: mkRef.current.mug || null, scale: s }) },
    { id: 'tote', label: 'Túi tote', aspect: '1/1', render: (c, s) => drawMerch(c, { ...merchBase(), item: 'tote', mockupImg: mkRef.current.tote || null, scale: s }) },
  ];

  useEffect(() => { comps.forEach((cp) => { const c = canvasRefs.current[cp.id]; if (c) cp.render(c); }); }, [brandName, slogan, contact, primary, accent, fontId, ready]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setLogoUrl(String(r.result)); r.readAsDataURL(f); };

  const downloadAll = async () => {
    setZipping(true);
    try {
      const files: { name: string; data: Uint8Array }[] = [];
      for (const cp of comps) {
        const c = document.createElement('canvas'); cp.render(c, 2);
        const blob = await new Promise<Blob | null>((res) => c.toBlob(res));
        if (blob) files.push({ name: `mivy-${cp.id}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
      }
      const zip = marketingZip(files); const u = URL.createObjectURL(zip); const a = document.createElement('a'); a.href = u; a.download = `mivy-bo-nhan-dien-${(brandName || 'brand').replace(/\s+/g, '-').toLowerCase()}.zip`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500);
    } finally { setZipping(false); }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Bộ nhận diện shop (1 lần)"
        sub="Điền tên & màu → ra trọn bộ: logo, avatar, bìa, name card, áo, ly, túi. Tải 1 ZIP đi in & đăng."
        actions={
          <button onClick={downloadAll} disabled={zipping} className="mv-btn mv-btn-primary disabled:opacity-60">
            {zipping ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang đóng gói…</> : <><Download className="w-4 h-4" /> Tải trọn bộ</>}
          </button>
        }
      />

      <div className="grid lg:grid-cols-[1fr_330px] gap-7 items-start">
        {/* Lưới xem trước */}
        <div className="grid grid-cols-2 gap-3">
          {comps.map((cp) => (
            <div key={cp.id} className="glass-card p-3">
              <p className="text-xs font-medium text-slate-400 mb-2">{cp.label}</p>
              <div className="rounded-lg border border-white/10 bg-black/30 overflow-hidden">
                <canvas ref={(el) => { canvasRefs.current[cp.id] = el; }} className="w-full block" style={{ aspectRatio: cp.aspect }} />
              </div>
            </div>
          ))}
        </div>

        {/* Điều khiển (ghim khi cuộn) */}
        <div className="glass-card p-5 space-y-6 lg:sticky lg:top-4 self-start">
          <div>
            <div className="mv-label mb-2.5">Logo (tuỳ chọn)</div>
            <div className="flex items-center gap-2">
              {logoUrl ? <div className="relative"><img src={logoUrl} className="w-12 h-12 object-contain rounded-lg bg-white/10 border border-white/10" alt="logo" /><button onClick={() => setLogoUrl('')} className="absolute -top-1.5 -right-1.5 bg-rose-500 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button></div> : <span className="text-xs text-slate-500">Chưa có — dùng chữ cái đầu</span>}
              <label className="mv-btn mv-btn-ghost cursor-pointer"><Upload className="w-3.5 h-3.5" /> Tải logo<input type="file" accept="image/*" className="sr-only" onChange={onFile} /></label>
            </div>
          </div>

          <div>
            <div className="mv-label mb-2.5">Nội dung</div>
            <div className="space-y-2.5">
              <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Tên thương hiệu" className="mv-input" />
              <input value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Slogan" className="mv-input" />
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Liên hệ (name card / bìa)" className="mv-input" />
            </div>
          </div>

          <div>
            <div className="mv-label mb-2.5">Màu &amp; font</div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"><input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/15 p-0" /> Chính</label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/15 p-0" /> Nhấn</label>
              <select value={fontId} onChange={(e) => setFontId(e.target.value)} className="mv-chip-select flex-1">
                {FONT_PRESETS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">Mẹo: tạo Brand Kit ở mục Thương hiệu trước, ở đây sẽ tự lấy sẵn.</p>
        </div>
      </div>
    </div>
  );
}
