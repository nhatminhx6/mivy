'use client';
// Banner sản phẩm: 1 ảnh → tách nền (client) → bộ banner đa sàn. (Trang mẫu chuẩn UI)
import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Loader2, RefreshCw, Square, LayoutGrid, Sparkles } from 'lucide-react';
import { BANNER_SIZES, drawProductBanner } from '@/lib/product-banner-engine';
import { loadBrand, FONT_PRESETS } from '@/lib/brand-presets';
import { marketingZip } from '@/lib/marketing-zip';
import { PageHeader } from '@/components/PageHeader';
import { COPY_TONES, COPY_INDUSTRIES, suggestBannerCopy, CopyTone } from '@/lib/copy-library';

export interface SharedProduct { src: string; cut?: string }

// embedded: nằm trong trang Ảnh & video — dùng ảnh sản phẩm chung, ẩn tiêu đề + nút tải ảnh riêng
export function BannerPanel({ product }: { product?: SharedProduct } = {}) {
  const [size, setSize] = useState('square');
  const [bgStyle, setBgStyle] = useState<'studio' | 'gradient' | 'solid'>('studio');
  const [headline, setHeadline] = useState('GIÁ SỐC HÔM NAY');
  const [price, setPrice] = useState('199.000đ');
  const [oldPrice, setOldPrice] = useState('299.000đ');
  const [saleTag, setSaleTag] = useState('MUA 1 TẶNG 1');
  const [cta, setCta] = useState('CHỐT ĐƠN NGAY');
  const [tone, setTone] = useState<CopyTone>('sale');
  const [industry, setIndustry] = useState('chung');
  const [copyIdx, setCopyIdx] = useState(0);
  const [brandName, setBrandName] = useState('MIVY');
  const [primary, setPrimary] = useState('#0f172a');
  const [accent, setAccent] = useState('#1f2937');
  const [fontId, setFontId] = useState('be-vietnam');
  const [cutoutUrl, setCutoutUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [err, setErr] = useState('');
  const prodRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(0);
  const [viewAll, setViewAll] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const allRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  useEffect(() => {
    const b = loadBrand();
    if (b) { setBrandName(b.name || 'MIVY'); setPrimary(b.colorPrimary || '#0f172a'); setAccent(b.colorAccent || '#1f2937'); setFontId(b.fontHeadingId || 'be-vietnam'); }
  }, []);

  useEffect(() => { if (product) setCutoutUrl(product.cut || product.src); }, [product?.src, product?.cut]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cutoutUrl) { prodRef.current = null; setReady((n) => n + 1); return; }
    const im = new Image(); im.onload = () => { prodRef.current = im; setReady((n) => n + 1); }; im.onerror = () => { prodRef.current = null; setReady((n) => n + 1); }; im.src = cutoutUrl;
  }, [cutoutUrl]);

  const opts = () => ({ size, bgStyle, productImg: prodRef.current, headline, price, oldPrice, saleTag, cta, brandName, colorPrimary: primary, colorAccent: accent, fontHeadingId: fontId, fontBodyId: fontId });
  useEffect(() => { if (!viewAll && canvasRef.current) drawProductBanner(canvasRef.current, opts()); }, [viewAll, size, bgStyle, headline, price, oldPrice, saleTag, cta, brandName, primary, accent, fontId, ready]);
  // Render toàn bộ khổ khi xem "Cả bộ"
  useEffect(() => {
    if (!viewAll) return;
    for (const s of BANNER_SIZES) { const c = allRefs.current[s.id]; if (c) drawProductBanner(c, { ...opts(), size: s.id }); }
  }, [viewAll, bgStyle, headline, price, oldPrice, saleTag, cta, brandName, primary, accent, fontId, ready]);

  // Gợi ý nội dung (offline, 0 AI) — mỗi lần bấm ra 1 bộ câu khác theo tông
  const suggestCopy = () => {
    const next = copyIdx + 1; setCopyIdx(next);
    const s = suggestBannerCopy(industry, tone, next);
    setHeadline(s.headline); setSaleTag(s.saleTag); setCta(s.cta);
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setErr(''); setProcessing(true);
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const blob = await removeBackground(f);
      setCutoutUrl(URL.createObjectURL(blob));
    } catch {
      setErr('Tách nền thất bại — dùng tạm ảnh gốc. Thử ảnh nền đơn giản hơn.');
      setCutoutUrl(URL.createObjectURL(f));
    } finally { setProcessing(false); }
  };

  const downloadAll = async () => {
    const files: { name: string; data: Uint8Array }[] = [];
    for (const s of BANNER_SIZES) {
      const c = document.createElement('canvas'); drawProductBanner(c, { ...opts(), size: s.id, scale: 2 });
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res));
      if (blob) files.push({ name: `mivy-${s.id}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
    }
    const zip = marketingZip(files); const u = URL.createObjectURL(zip); const a = document.createElement('a'); a.href = u; a.download = 'mivy-banner-san-pham.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000);
  };
  const downloadSize = (id: string) => {
    const c = document.createElement('canvas'); drawProductBanner(c, { ...opts(), size: id, scale: 2 });
    c.toBlob((b) => { if (!b) return; const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `mivy-${id}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); });
  };
  const downloadOne = () => downloadSize(size);

  const cur = BANNER_SIZES.find((s) => s.id === size)!;
  const hasImg = !!cutoutUrl && !processing;

  return (
    <div className={product ? '' : 'max-w-6xl mx-auto'}>
      {product ? (
        <div className="flex justify-end mb-3"><button onClick={downloadAll} className="mv-btn mv-btn-primary !py-2 !text-xs"><Download className="w-4 h-4" /> Tải cả bộ banner</button></div>
      ) : <PageHeader
        title="Banner sản phẩm"
        sub="Tải 1 ảnh sản phẩm — tự tách nền, ghép giá & sale tag, xuất bộ banner đúng khổ mọi sàn."
        actions={hasImg ? (
          <>
            <label className="mv-btn mv-btn-ghost cursor-pointer"><RefreshCw className="w-4 h-4" /> Đổi ảnh<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onUpload} /></label>
            <button onClick={downloadAll} className="mv-btn mv-btn-primary"><Download className="w-4 h-4" /> Tải cả bộ</button>
          </>
        ) : undefined}
      />}

      <div className="grid lg:grid-cols-[1fr_380px] gap-7 items-start">
        {/* Preview stage */}
        <div className={`glass-card p-6 flex flex-col items-center lg:sticky lg:top-4 self-start hover:!transform-none ${viewAll ? 'lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto' : ''}`}>
          {hasImg && (
            <div className="w-full flex items-center justify-between mb-4">
              <div className="mv-seg">
                <button onClick={() => setViewAll(false)} data-active={!viewAll} className="mv-seg-btn"><Square className="w-3.5 h-3.5" /> Khổ này</button>
                <button onClick={() => setViewAll(true)} data-active={viewAll} className="mv-seg-btn"><LayoutGrid className="w-3.5 h-3.5" /> Cả bộ đa sàn</button>
              </div>
              {viewAll && <span className="text-[11px] text-slate-500">{BANNER_SIZES.length} khổ · mọi sàn</span>}
            </div>
          )}

          {!viewAll && (
            <>
              <div className="w-full rounded-xl bg-black/25 border border-white/[0.05] p-5 flex items-center justify-center min-h-[420px]">
                {!cutoutUrl && !processing && (
                  <label className="w-full max-w-sm aspect-square flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 hover:border-white/35 hover:bg-indigo-400/[0.02] cursor-pointer text-slate-400 transition-all text-center px-6">
                    <span className="grid place-items-center w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/10"><Upload className="w-6 h-6 text-white" /></span>
                    <span className="font-semibold text-white">Tải ảnh sản phẩm</span>
                    <span className="text-xs text-slate-500 leading-relaxed">Kéo thả hoặc bấm chọn · PNG/JPG<br />Tự động tách nền ngay trong trình duyệt</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onUpload} />
                  </label>
                )}
                {processing && (
                  <div className="flex flex-col items-center justify-center gap-3 text-slate-300 py-16">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                    <span className="font-semibold">Đang tách nền…</span>
                    <span className="text-xs text-slate-500">Lần đầu tải model ~vài giây</span>
                  </div>
                )}
                {hasImg && (
                  <canvas ref={canvasRef} className="rounded-lg shadow-2xl max-h-[460px] w-auto" style={{ maxWidth: '100%', aspectRatio: `${cur.w}/${cur.h}` }} />
                )}
              </div>
              {hasImg && (
                <div className="w-full flex items-center justify-between mt-4">
                  <span className="text-[11px] text-slate-500">{cur.label} · {cur.w}×{cur.h}px</span>
                  <button onClick={downloadOne} className="mv-btn mv-btn-ghost"><Download className="w-4 h-4" /> Tải khổ này</button>
                </div>
              )}
            </>
          )}

          {viewAll && hasImg && (
            <div className="w-full grid grid-cols-2 gap-4">
              {BANNER_SIZES.map((s) => (
                <div key={s.id} className="glass-card p-3 flex flex-col">
                  <div className="flex-1 flex items-center justify-center min-h-[150px] rounded-lg bg-black/25">
                    <canvas ref={(el) => { allRefs.current[s.id] = el; }} className="rounded-md shadow-lg max-h-[210px] w-auto" style={{ maxWidth: '100%', aspectRatio: `${s.w}/${s.h}` }} />
                  </div>
                  <div className="flex items-center justify-between mt-2.5 gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-300 truncate">{s.label.split(' · ')[0]}</div>
                      <div className="text-[10px] text-slate-500 truncate">{s.label.split(' · ')[1] || ''} · {s.w}×{s.h}</div>
                    </div>
                    <button onClick={() => downloadSize(s.id)} className="mv-btn mv-btn-ghost shrink-0 !p-0 w-8 h-8 justify-center !gap-0" title="Tải khổ này"><Download className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {err && <p className="text-[11px] text-amber-400 mt-2 self-start">{err}</p>}
        </div>

        {/* Controls */}
        <div className="glass-card p-5 space-y-6">
          <div>
            <div className="mv-label mb-2.5">Khổ xuất</div>
            <div className="mv-stagger grid grid-cols-2 gap-2">
              {BANNER_SIZES.map((s) => {
                const active = size === s.id;
                return (
                  <button key={s.id} onClick={() => setSize(s.id)}
                    className={`text-left px-3 py-2.5 rounded-xl border transition-all ${active ? 'border-indigo-500/60 bg-indigo-500/10' : 'border-white/[0.07] hover:border-white/20 hover:bg-white/[0.03] hover:-translate-y-px'}`}>
                    <div className={`text-[12px] font-semibold ${active ? 'text-white' : 'text-slate-300'}`}>{s.label.split(' · ')[0]}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{s.label.split(' · ')[1] || `${s.w}×${s.h}`}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mv-label mb-2.5">Nền</div>
            <div className="mv-seg w-full">
              {([['studio', 'Studio'], ['gradient', 'Màu nhấn'], ['solid', 'Trơn']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setBgStyle(v)} data-active={bgStyle === v} className="mv-seg-btn flex-1 text-center">{l}</button>
              ))}
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
              <button onClick={suggestCopy} className="mv-btn mv-btn-ghost shrink-0 !gap-1 !px-2.5 !py-1.5 !text-[11px]" title="Gợi ý câu chữ bắt mắt">
                <Sparkles className="w-3.5 h-3.5" /> Gợi ý
              </button>
            </div>
            <div className="space-y-2.5">
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Tiêu đề (vd GIÁ SỐC HÔM NAY)" className="mv-input" />
              <div className="flex gap-2.5">
                <div className="flex-1"><input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Giá" className="mv-input" /></div>
                <div className="w-28 shrink-0"><input value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="Giá gốc" className="mv-input" /></div>
              </div>
              <div className="flex gap-2.5">
                <div className="w-28 shrink-0"><input value={saleTag} onChange={(e) => setSaleTag(e.target.value)} placeholder="Sale tag" className="mv-input" /></div>
                <div className="flex-1"><input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Nút (MUA NGAY)" className="mv-input" /></div>
              </div>
              <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Tên thương hiệu" className="mv-input" />
            </div>
          </div>

          <div>
            <div className="mv-label mb-2.5">Màu &amp; Font</div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/15 p-0" /> Nhấn</label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"><input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/15 p-0" /> Nền trơn</label>
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
