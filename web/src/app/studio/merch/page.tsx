'use client';
// Vật phẩm thương hiệu: đặt logo/brand lên áo, nón, ly, túi, name card, standee... (render code, 0 AI).
import { useEffect, useRef, useState } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { MERCH_ITEMS, drawMerch, hasPhoto } from '@/lib/merch-engine';
import { loadBrand, FONT_PRESETS, contactLine } from '@/lib/brand-presets';
import { marketingZip } from '@/lib/marketing-zip';
import { PageHeader } from '@/components/PageHeader';

const PRODUCT_COLORS = ['#111827', '#ffffff', '#ef4444', '#10b981', '#2563eb', '#f59e0b', '#8b5cf6', '#f472b6', '#64748b', '#0f766e'];
const BG_COLORS = ['#f1f5f9', '#ffffff', '#fef3c7', '#e0f2fe', '#111827', '#1e293b'];

export default function MerchPage() {
  const [item, setItem] = useState('tshirt');
  const [productColor, setProductColor] = useState('#111827');
  const [bgColor, setBgColor] = useState('#f1f5f9');
  const [brandName, setBrandName] = useState('MIVY');
  const [slogan, setSlogan] = useState('');
  const [accent, setAccent] = useState('#1f2937');
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
      setAccent(b.colorAccent || '#1f2937');
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
    drawMerch(c, { ...opts(), scale: 2 });
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
      drawMerch(c, { ...opts(), item: it.id, mockupImg: mk, scale: 2 });
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res));
      if (blob) files.push({ name: `mivy-${it.id}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
    }
    const zip = marketingZip(files);
    const url = URL.createObjectURL(zip);
    const a = document.createElement('a'); a.href = url; a.download = 'mivy-vat-pham.zip'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Vật phẩm thương hiệu"
        sub="Đặt logo/brand lên áo, nón, ly, túi, name card... — xem trước & tải để đi in. Lấy sẵn từ Brand Kit."
        actions={<button onClick={downloadAll} className="mv-btn mv-btn-primary"><Download className="w-4 h-4" /> Tải cả bộ</button>}
      />

      <div className="grid lg:grid-cols-[1fr_340px] gap-7 items-start">
        {/* Preview stage */}
        <div className="glass-card p-6 flex flex-col items-center lg:sticky lg:top-4 self-start">
          <div className="w-full rounded-xl bg-black/25 border border-white/[0.05] p-5 flex items-center justify-center min-h-[420px]">
            <canvas ref={canvasRef} className="w-full max-w-md rounded-lg shadow-2xl" />
          </div>
          <div className="w-full flex items-center justify-end mt-4">
            <button onClick={downloadOne} className="mv-btn mv-btn-ghost"><Download className="w-4 h-4" /> Tải khổ này</button>
          </div>
        </div>

        {/* Controls */}
        <div className="glass-card p-5 space-y-6">
          <div>
            <div className="mv-label mb-2.5">Kiểu hiển thị</div>
            <div className="mv-seg w-full">
              <button onClick={() => setMode('photo')} data-active={mode === 'photo'} className="mv-seg-btn flex-1 text-center">Ảnh thật</button>
              <button onClick={() => setMode('vector')} data-active={mode === 'vector'} className="mv-seg-btn flex-1 text-center">Vector</button>
            </div>
            {mode === 'photo' && !hasPhoto(item) && (
              <p className="text-xs text-amber-400 mt-2">Món này chưa có ảnh thật — đang hiện vector. (Ảnh thật: áo thun, nón, ly, ly giữ nhiệt, túi tote, túi giấy)</p>
            )}
          </div>

          <div>
            <div className="mv-label mb-2.5">Vật phẩm</div>
            <div className="mv-seg w-full flex-wrap">
              {MERCH_ITEMS.map((m) => {
                const active = item === m.id;
                return (
                  <button key={m.id} onClick={() => setItem(m.id)} data-active={active}
                    className="mv-seg-btn flex-[1_1_45%] text-center">
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mv-label mb-2.5">Logo</div>
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <div className="relative">
                  <img src={logoUrl} alt="logo" className="w-12 h-12 object-contain rounded-lg bg-white/10 border border-white/10" />
                  <button onClick={() => setLogoUrl('')} className="absolute -top-1.5 -right-1.5 bg-rose-500 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button>
                </div>
              ) : <span className="text-xs text-slate-500">Chưa có — sẽ dùng tên brand</span>}
              <label className="mv-btn mv-btn-ghost cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Tải logo
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only" onChange={onUpload} />
              </label>
            </div>
          </div>

          <div>
            <div className="mv-label mb-2.5">Tên &amp; slogan</div>
            <div className="space-y-2.5">
              <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Tên thương hiệu" className="mv-input" />
              <input value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Slogan (tuỳ chọn)" className="mv-input" />
              {item === 'namecard' && (
                <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Liên hệ (SĐT / email)" className="mv-input" />
              )}
            </div>
          </div>

          <div>
            <div className="mv-label mb-2.5">Màu sản phẩm</div>
            <div className="flex flex-wrap gap-2 items-center">
              {PRODUCT_COLORS.map((c) => (
                <button key={c} onClick={() => setProductColor(c)} style={{ background: c }}
                  className={`w-7 h-7 rounded-full border-2 ${productColor === c ? 'border-indigo-500 scale-110' : 'border-white/20'} transition-all`} />
              ))}
              <input type="color" value={productColor} onChange={(e) => setProductColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/15 p-0" />
            </div>
          </div>

          <div>
            <div className="mv-label mb-2.5">Nền &amp; nhấn &amp; font</div>
            <div className="flex flex-wrap gap-2 items-center mb-2.5">
              {BG_COLORS.map((c) => (
                <button key={c} onClick={() => setBgColor(c)} style={{ background: c }}
                  className={`w-6 h-6 rounded-full border-2 ${bgColor === c ? 'border-indigo-500' : 'border-white/20'}`} />
              ))}
              <span className="text-xs text-slate-400 ml-1">nền</span>
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} title="Màu nhấn" className="w-6 h-6 rounded cursor-pointer bg-transparent border border-white/20 p-0 ml-2" />
              <span className="text-xs text-slate-400">nhấn</span>
            </div>
            <select value={fontId} onChange={(e) => setFontId(e.target.value)} className="mv-chip-select w-full">
              {FONT_PRESETS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
