'use client';
// Ảnh bìa (FB/Zalo/Shopee/YouTube) + Avatar — render code từ Brand Kit.
import { useEffect, useRef, useState } from 'react';
import { Download, Upload, X, Sparkles } from 'lucide-react';
import { ASSET_KINDS, COVER_TEMPLATES, drawBrandAsset } from '@/lib/brandasset-engine';
import { loadBrand, FONT_PRESETS, contactLine } from '@/lib/brand-presets';
import { marketingZip } from '@/lib/marketing-zip';
import { PageHeader } from '@/components/PageHeader';
import { COPY_TONES, COPY_INDUSTRIES, suggestCoverCopy, CopyTone } from '@/lib/copy-library';

export default function BrandAssetsPage() {
  const [kind, setKind] = useState('fb');
  const [style, setStyle] = useState<'gradient' | 'solid' | 'photo'>('gradient');
  const [brandName, setBrandName] = useState('MIVY');
  const [slogan, setSlogan] = useState('');
  const [contact, setContact] = useState('');
  const [badge, setBadge] = useState('GIẢM 30%');
  const [cta, setCta] = useState('MUA NGAY');
  const [coverTemplate, setCoverTemplate] = useState('elegant');
  const [uspText, setUspText] = useState('Freeship toàn quốc\nHàng chính hãng\nĐổi trả 7 ngày');
  const [primary, setPrimary] = useState('#0f172a');
  const [accent, setAccent] = useState('#1f2937');
  const [fontId, setFontId] = useState('be-vietnam');
  const [logoUrl, setLogoUrl] = useState('');
  const [bgUrl, setBgUrl] = useState('');
  const [tone, setTone] = useState<CopyTone>('sale');
  const [industry, setIndustry] = useState('chung');
  const [copyIdx, setCopyIdx] = useState(0);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const bgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const b = loadBrand();
    if (b) {
      setBrandName(b.name || 'MIVY'); setSlogan(b.slogan || ''); setContact(contactLine(b.contact) || '');
      setPrimary(b.colorPrimary || '#0f172a'); setAccent(b.colorAccent || '#1f2937');
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

  useEffect(() => { (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready?.then(() => setReady((n) => n + 1)); }, []);
  useEffect(() => { if (canvasRef.current) drawBrandAsset(canvasRef.current, opts()); }, [kind, style, coverTemplate, brandName, slogan, contact, badge, cta, uspText, primary, accent, fontId, ready]);

  const onFile = (set: (s: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => set(String(r.result)); r.readAsDataURL(f);
  };
  const downloadOne = () => {
    const c = document.createElement('canvas'); drawBrandAsset(c, { ...opts(), scale: 2 });
    c.toBlob((b) => { if (!b) return; const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `mivy-${kind}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); });
  };
  const downloadAll = async () => {
    const files: { name: string; data: Uint8Array }[] = [];
    for (const k of ASSET_KINDS) {
      const c = document.createElement('canvas'); drawBrandAsset(c, { ...opts(), kind: k.id, scale: 2 });
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res));
      if (blob) files.push({ name: `mivy-${k.id}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
    }
    const zip = marketingZip(files); const u = URL.createObjectURL(zip); const a = document.createElement('a'); a.href = u; a.download = 'mivy-bia-avatar.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000);
  };

  const suggestCopy = () => {
    const next = copyIdx + 1; setCopyIdx(next);
    const s = suggestCoverCopy(industry, tone, next);
    setBadge(s.badge); setSlogan(s.slogan); setCta(s.cta); setUspText(s.usps.join('\n'));
  };

  const cur = ASSET_KINDS.find((a) => a.id === kind)!;

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Ảnh bìa & Avatar"
        sub="Bìa Facebook / Zalo / Shopee / YouTube + Avatar — lấy sẵn từ Brand Kit, tải về đăng ngay."
        actions={<button onClick={downloadAll} className="mv-btn mv-btn-primary"><Download className="w-4 h-4" /> Tải cả bộ</button>}
      />

      <div className="grid lg:grid-cols-[1fr_340px] gap-7 items-start">
        {/* Preview stage */}
        <div className="glass-card p-6 flex flex-col items-center lg:sticky lg:top-4 self-start">
          <div className="w-full rounded-xl bg-black/25 border border-white/[0.05] p-5 flex items-center justify-center min-h-[420px]">
            <canvas ref={canvasRef} className="rounded-lg shadow-2xl max-h-[460px] w-auto" style={{ maxWidth: kind === 'avatar' ? 360 : '100%', aspectRatio: `${cur.w}/${cur.h}` }} />
          </div>
          <div className="w-full flex items-center justify-between mt-4">
            <span className="text-xs text-slate-500">{cur.label} · {cur.w}×{cur.h}px</span>
            <button onClick={downloadOne} className="mv-btn mv-btn-ghost"><Download className="w-4 h-4" /> Tải khổ này</button>
          </div>
        </div>

        {/* Controls */}
        <div className="glass-card p-5 space-y-6">
          <div>
            <div className="mv-label mb-2.5">Loại</div>
            <div className="mv-seg !flex flex-wrap w-full">
              {ASSET_KINDS.map((a) => {
                const active = kind === a.id;
                return (
                  <button key={a.id} onClick={() => setKind(a.id)} data-active={active} className="mv-seg-btn flex-1 basis-[45%] text-center">{a.label}</button>
                );
              })}
            </div>
          </div>

          {kind !== 'avatar' && (
            <div>
              <div className="mv-label mb-2.5">Mẫu bìa</div>
              <div className="mv-seg !flex flex-wrap w-full">
                {COVER_TEMPLATES.map((t) => {
                  const active = coverTemplate === t.id;
                  return (
                    <button key={t.id} onClick={() => setCoverTemplate(t.id)} data-active={active} className="mv-seg-btn flex-1 basis-[45%] text-center">{t.label}</button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="mv-label mb-2.5">Kiểu nền</div>
            <div className="mv-seg w-full">
              {([['gradient', 'Chuyển sắc'], ['solid', 'Màu trơn'], ['photo', 'Ảnh nền']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setStyle(v)} data-active={style === v} className="mv-seg-btn flex-1 text-center">{l}</button>
              ))}
            </div>
            {style === 'photo' && (
              <div className="flex items-center gap-2 mt-2.5">
                {bgUrl ? <div className="relative"><img src={bgUrl} className="w-12 h-12 object-cover rounded-lg border border-white/10" alt="bg" /><button onClick={() => setBgUrl('')} className="absolute -top-1.5 -right-1.5 bg-rose-500 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button></div> : <span className="text-xs text-slate-500">Chưa có ảnh nền</span>}
                <label className="mv-btn mv-btn-ghost cursor-pointer"><Upload className="w-3.5 h-3.5" /> Tải ảnh nền<input type="file" accept="image/*" className="sr-only" onChange={onFile(setBgUrl)} /></label>
              </div>
            )}
          </div>

          <div>
            <div className="mv-label mb-2.5">Logo</div>
            <div className="flex items-center gap-2">
              {logoUrl ? <div className="relative"><img src={logoUrl} className="w-12 h-12 object-contain rounded-lg bg-white/10 border border-white/10" alt="logo" /><button onClick={() => setLogoUrl('')} className="absolute -top-1.5 -right-1.5 bg-rose-500 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button></div> : <span className="text-xs text-slate-500">Chưa có — dùng chữ cái đầu</span>}
              <label className="mv-btn mv-btn-ghost cursor-pointer"><Upload className="w-3.5 h-3.5" /> Tải logo<input type="file" accept="image/*" className="sr-only" onChange={onFile(setLogoUrl)} /></label>
            </div>
          </div>

          <div>
            <div className="mv-label mb-2">Nội dung</div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="mv-chip-select !py-1.5 text-[11px] flex-1 min-w-0" title="Ngành hàng">
                {COPY_INDUSTRIES.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
              <select value={tone} onChange={(e) => setTone(e.target.value as CopyTone)} className="mv-chip-select !py-1.5 text-[11px] flex-1 min-w-0" title="Tông giọng">
                {COPY_TONES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button onClick={suggestCopy} className="mv-btn mv-btn-ghost shrink-0 !px-3 !py-1.5 !text-[11px] !gap-1" title="Gợi ý câu chữ bắt mắt">
                <Sparkles className="w-3.5 h-3.5" /> Gợi ý
              </button>
            </div>
            <div className="space-y-2.5">
              <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Tên thương hiệu" className="mv-input" />
              <input value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Slogan" className="mv-input" />
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Liên hệ (SĐT / web)" className="mv-input" />
              <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Ưu đãi lớn (vd GIẢM 50%)" className="mv-input" />
              <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Nút kêu gọi (vd MUA NGAY)" className="mv-input" />
              <textarea value={uspText} onChange={(e) => setUspText(e.target.value)} rows={3} placeholder="Điểm nổi bật (mỗi dòng 1 ý, tối đa 3)" className="mv-input resize-none" />
            </div>
          </div>

          <div>
            <div className="mv-label mb-2.5">Màu &amp; font</div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"><input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/15 p-0" /> Nền</label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/15 p-0" /> Nhấn</label>
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
