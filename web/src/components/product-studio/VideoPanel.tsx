'use client';
// Video ngắn TikTok / Reels / Shorts từ 1 ảnh sản phẩm: chọn mẫu chuyển động → điền tên, giá, 3 điểm nổi bật → xem trước → xuất MP4.
// Dựng 100% bằng code trên trình duyệt (canvas + WebCodecs), không gọi AI theo từng video.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, ImagePlus, Loader2, Pause, Play, Scissors, Upload } from 'lucide-react';
import type { BrandKit } from '@/types';
import { loadBrand } from '@/lib/brand-presets';
import { POSTER_THEMES, type PosterThemeId } from '@/lib/infographic-engine';
import { posterColorsFromBrand } from '@/lib/poster-engine';
import { useLogoFonts } from '@/lib/logo-engine';
import { cutoutImage, scaleImage, slugify } from '@/lib/image-utils';
import { downloadBlob } from '@/lib/html-export';
import { VIDEO_TEMPLATES, VH, VW, exportVideoMp4, makeVideoCache, renderVideoFrame, tplDur, type VideoData, type VideoTheme, type VideoTpl } from '@/lib/video-engine';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { takeHandoff } from '@/lib/model-shot';
import { PageHeader } from '@/components/PageHeader';
import type { SharedProduct } from '@/components/product-studio/BannerPanel';

const THUMB_T: Record<VideoTpl, number> = { launch: 2.9, flash: 3.4, luxury: 7.9, reasons: 5.6, kinetic: 1.0, cards: 3.2, countdown: 4.8, unbox: 1.1, showcase: 3.6, neon: 3.6, editorial: 6.2, party: 4.4 };

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}

function Thumb({ tpl, d, th, ready }: { tpl: VideoTpl; d: VideoData; th: VideoTheme; ready: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current || !ready) return;
    const id = setTimeout(() => { if (ref.current) renderVideoFrame(ref.current, tpl, d, th, makeVideoCache(tpl, d, th), THUMB_T[tpl], false); }, 120);
    return () => clearTimeout(id);
  }, [tpl, d, th, ready]);
  return <canvas ref={ref} width={216} height={384} className="block w-full h-full" />;
}

export function VideoPanel({ shared }: { shared?: SharedProduct } = {}) {
  const fontsReady = useLogoFonts();
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [src, setSrc] = useState('/sample-products/10-perfume.png');
  const [cut, setCut] = useState<string | null>('/sample-products/10-perfume.png');
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [cutting, setCutting] = useState(false);
  const [name, setName] = useState('Nước hoa Classic 50ml');
  const [price, setPrice] = useState('299.000đ');
  const [oldPrice, setOldPrice] = useState('450.000đ');
  const [uspText, setUspText] = useState('Lưu hương 12 giờ\nChai thuỷ tinh cao cấp\nFreeship toàn quốc');
  const [cta, setCta] = useState('Mua ngay · Link ở bio');
  const [shop, setShop] = useState('Mivy Store');
  const [tpl, setTpl] = useState<VideoTpl>('launch');
  const [themeId, setThemeId] = useState<PosterThemeId | 'brand'>('pink');
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0);
  const [exporting, setExporting] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // ảnh chuyển sang từ trang Người mẫu AI
  useEffect(() => { const h = takeHandoff('video'); if (h) { setSrc(h); setCut(null); } }, []);
  useEffect(() => { if (shared) { setSrc(shared.src); setCut(shared.cut || null); } }, [shared?.src, shared?.cut]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const b = loadBrand(); if (b) { setKit(b); if (b.name) setShop(b.name); setThemeId('brand'); } }, []);
  useEffect(() => { let on = true; load(cut || src).then((im) => { if (on) setImg(im); }).catch(() => null); return () => { on = false; }; }, [src, cut]);

  const th: VideoTheme = themeId === 'brand' && kit ? posterColorsFromBrand(kit) : (POSTER_THEMES.find((x) => x.id === themeId) || POSTER_THEMES[0]);
  const d: VideoData = useMemo(() => ({ img, cut: !!cut, name, price, oldPrice, usps: uspText.split('\n').map((s) => s.trim()).filter(Boolean), cta, shop }),
    [img, cut, name, price, oldPrice, uspText, cta, shop]);
  const ready = fontsReady && !!img;
  const cache = useMemo(() => (ready ? makeVideoCache(tpl, d, th) : null), [ready, tpl, d, th.main, th.tint]); // eslint-disable-line react-hooks/exhaustive-deps
  const dur = tplDur(tpl);

  // vòng phát xem trước
  const tRef = useRef(0);
  useEffect(() => { tRef.current = 0; setT(0); }, [tpl]);
  useEffect(() => {
    if (!cache || !canvasRef.current) return;
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      if (playing) { tRef.current = (tRef.current + (now - last) / 1000) % dur; setT(tRef.current); }
      last = now;
      if (canvasRef.current) renderVideoFrame(canvasRef.current, tpl, d, th, cache, tRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cache, playing, tpl, d, th, dur]);

  const onFile = async (f?: File) => {
    if (!f) return;
    const s = await scaleImage(f, 1600);
    setSrc(s); setCut(null);
  };
  const doCut = async () => {
    setCutting(true);
    try { setCut(await cutoutImage(src)); } catch { setErr('Tách nền lỗi, thử ảnh khác nhé.'); } finally { setCutting(false); }
  };
  const doExport = async () => {
    if (exporting !== null) return;
    setErr(''); setExporting(0);
    try {
      const blob = await exportVideoMp4(tpl, d, th, (p) => setExporting(p));
      downloadBlob(blob, `${slugify(name, 'video')}-${tpl}.mp4`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Xuất video lỗi'); } finally { setExporting(null); }
  };
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect(); tRef.current = clamp01((e.clientX - r.left) / r.width) * dur; setT(tRef.current);
  };

  const chipCls = (on: boolean) => `flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-semibold ${on ? 'border-white bg-white/10 text-white' : 'border-white/15 text-slate-300 hover:border-white/40'}`;
  const brandC = kit ? posterColorsFromBrand(kit) : null;

  return (
    <div className={shared ? '' : 'p-6 lg:p-8'}>
      {!shared && <PageHeader title="Video ngắn" sub="1 ảnh sản phẩm → video 9:16 cho TikTok, Reels, Shorts. Chọn mẫu chuyển động, điền giá, xuất MP4 ngay trên máy. Nhạc anh thêm lúc đăng (dùng nhạc trend của TikTok)." />}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          <CollapsibleSection title="1 · Chọn mẫu video">
            <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2.5">
              {VIDEO_TEMPLATES.map((v) => (
                <button key={v.id} type="button" onClick={() => setTpl(v.id)} data-testid="video-tpl"
                  className={`text-left rounded-xl border p-1.5 transition-all ${tpl === v.id ? 'border-indigo-400 ring-2 ring-indigo-400/40' : 'border-white/10 hover:border-white/30'}`}>
                  <div className="aspect-[9/16] rounded-lg overflow-hidden bg-black/30">{ready && <Thumb tpl={v.id} d={d} th={th} ready={ready} />}</div>
                  <div className="text-xs font-bold text-white mt-1.5 px-0.5">{v.name} <span className="text-slate-500 font-normal">· {v.dur}s</span></div>
                  <div className="text-[10px] text-slate-400 px-0.5 leading-snug">{v.desc}</div>
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {!shared && <CollapsibleSection title="2 · Ảnh sản phẩm">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cut || src} alt="" className="w-20 h-20 rounded-xl object-contain bg-white/90 p-1" />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs"><Upload className="w-3.5 h-3.5" /> Tải ảnh</button>
                {!cut && (
                  <button type="button" onClick={doCut} disabled={cutting} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs disabled:opacity-60">
                    {cutting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />} {cutting ? 'Đang tách…' : 'Tách nền'}
                  </button>
                )}
                <button type="button" onClick={() => { setSrc('/sample-products/10-perfume.png'); setCut('/sample-products/10-perfume.png'); }} className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs"><ImagePlus className="w-3.5 h-3.5" /> Ảnh mẫu</button>
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" data-testid="video-upload" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">{cut ? 'Đã tách nền — sản phẩm đứng trên nền studio của mẫu.' : 'Ảnh chưa tách nền sẽ hiện dạng khung ảnh. Bấm “Tách nền” để đẹp hơn.'}</p>
          </CollapsibleSection>}

          <CollapsibleSection title={shared ? '2 · Nội dung' : '3 · Nội dung'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block sm:col-span-2"><span className="mv-label block mb-1.5">Tên sản phẩm</span><input className="mv-input" value={name} onChange={(e) => setName(e.target.value)} data-testid="video-name" /></label>
              <label className="block"><span className="mv-label block mb-1.5">Giá bán</span><input className="mv-input" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
              <label className="block"><span className="mv-label block mb-1.5">Giá gốc (gạch ngang)</span><input className="mv-input" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="Bỏ trống nếu không giảm" /></label>
              <label className="block sm:col-span-2"><span className="mv-label block mb-1.5">3 điểm nổi bật (mỗi dòng 1 ý)</span><textarea className="mv-input min-h-[88px]" value={uspText} onChange={(e) => setUspText(e.target.value)} /></label>
              <label className="block"><span className="mv-label block mb-1.5">Nút kêu gọi</span><input className="mv-input" value={cta} onChange={(e) => setCta(e.target.value)} /></label>
              <label className="block"><span className="mv-label block mb-1.5">Tên shop</span><input className="mv-input" value={shop} onChange={(e) => setShop(e.target.value)} /></label>
            </div>
            <div className="mt-3">
              <div className="mv-label mb-1.5">Màu chủ đạo</div>
              <div className="flex flex-wrap gap-2">
                {kit && brandC && <button type="button" onClick={() => setThemeId('brand')} className={chipCls(themeId === 'brand')}><span className="w-5 h-5 rounded-full" style={{ background: brandC.main, boxShadow: `inset 0 0 0 3px ${brandC.soft}` }} />Thương hiệu</button>}
                {POSTER_THEMES.map((x) => <button key={x.id} type="button" onClick={() => setThemeId(x.id)} className={chipCls(themeId === x.id)}><span className="w-5 h-5 rounded-full" style={{ background: x.main, boxShadow: `inset 0 0 0 3px ${x.soft}` }} />{x.name}</button>)}
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Xem trước kiểu điện thoại (ghim) */}
        <div className="lg:sticky lg:top-4 self-start glass-card p-4 rounded-2xl space-y-3 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06]">
          <div className="mx-auto w-full max-w-[300px] rounded-[28px] bg-black p-2 shadow-2xl">
            <div className="relative aspect-[9/16] rounded-[22px] overflow-hidden bg-slate-900" data-testid="video-preview">
              <canvas ref={canvasRef} width={VW / 2} height={VH / 2} className="block w-full h-full" />
              {!ready && <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang chuẩn bị…</div>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Tạm dừng' : 'Phát'} className="mv-btn mv-btn-ghost !p-2">{playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
            <div className="flex-1 h-2 rounded-full bg-white/10 cursor-pointer relative" onClick={seek}>
              <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-400" style={{ width: `${(t / dur) * 100}%` }} />
            </div>
            <span className="text-[11px] text-slate-400 tabular-nums w-14 text-right">{t.toFixed(1)}/{dur}s</span>
          </div>
          <button type="button" onClick={doExport} disabled={!ready || exporting !== null} className="w-full mv-btn mv-btn-primary !flex justify-center !py-2.5 !text-sm disabled:opacity-60" data-testid="video-export">
            {exporting !== null ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xuất {Math.round(exporting * 100)}%</> : <><Download className="w-4 h-4" /> Xuất MP4 (1080×1920)</>}
          </button>
          {err && <p className="text-[11px] text-rose-300">{err}</p>}
          <p className="text-[11px] leading-relaxed text-slate-500">Chữ, giá, nút mua đã đặt né vùng bị nút TikTok che (cột phải + đáy màn hình).</p>
        </div>
      </div>
    </div>
  );
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
