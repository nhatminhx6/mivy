'use client';
// Xem logo trên đồ thật: 6 ảnh mockup thật (dùng lại merch-engine, logo in chìm) + 3 mockup vẽ bằng code
// (ảnh đại diện shop, bảng hiệu, name card). Tải từng ảnh 1080×1080 hoặc cả bộ .zip. Render 100% client.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Download, Loader2, Maximize2, Package } from 'lucide-react';
import { useLightbox } from '@/components/ImageLightbox';
import { drawMerch } from '@/lib/merch-engine';
import type { CSSProperties } from 'react';
import type { Palette } from '@/lib/brand-presets';
import type { LogoTone } from '@/lib/logo-engine';
import { downloadBlob, embedFontCss } from '@/lib/html-export';

const PHOTO_ITEMS = [
  { id: 'tshirt', label: 'Áo thun' }, { id: 'cap', label: 'Nón' }, { id: 'mug', label: 'Ly sứ' },
  { id: 'tumbler', label: 'Ly giữ nhiệt' }, { id: 'tote', label: 'Túi tote' }, { id: 'box', label: 'Túi giấy' },
];
const CODE_ITEMS = [{ id: 'profile', label: 'Ảnh đại diện shop' }, { id: 'sign', label: 'Bảng hiệu' }, { id: 'namecard', label: 'Name card' }];
export const MOCKUP_COUNT = PHOTO_ITEMS.length + CODE_ITEMS.length;

// Logo vẽ từ ngoài truyền vào (trang Logo: SVG theo spec; Brand pack: ảnh PNG từ bộ nhận diện).
export type RenderLogo = (o: { tone: LogoTone; frame?: 'avatar'; style: CSSProperties }) => JSX.Element;

function PhotoMockup({ item, logo, mockup, name, slogan, accent }: { item: string; logo: HTMLImageElement | null; mockup?: HTMLImageElement; name: string; slogan: string; accent: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (ref.current && mockup) drawMerch(ref.current, { item, mode: 'photo', mockupImg: mockup, logoImg: logo, productColor: '#ffffff', brandName: name, slogan, accent });
  }, [item, logo, mockup, name, slogan, accent]);
  return <canvas ref={ref} data-ready={mockup && logo ? '1' : undefined} className="w-full h-full block" />;
}

function CodeMockup({ item, p, logo, name, slogan, contact }: { item: string; p: Palette; logo: RenderLogo; name: string; slogan: string; contact: string }) {
  const font = "'Be Vietnam Pro', sans-serif";
  if (item === 'profile') {
    return (
      <div className="w-full h-full relative overflow-hidden" style={{ background: '#e9edf2', containerType: 'inline-size' }}>
        <div className="absolute overflow-hidden" style={{ left: '8%', right: '8%', top: '15%', bottom: '15%', background: '#ffffff', borderRadius: '5cqw', boxShadow: '0 2cqw 6cqw rgba(15,23,42,.14)' }}>
          <div style={{ height: '36%', background: `linear-gradient(135deg, ${p.colorPrimary}, ${p.colorAccent})` }} />
          <div className="absolute" style={{ left: '7%', top: '19%', width: '30cqw', height: '30cqw', borderRadius: '50%', boxShadow: '0 0 0 1.4cqw #ffffff' }}>
            {logo({ tone: 'color', frame: 'avatar', style: { width: '100%', height: '100%', display: 'block' } })}
          </div>
          <div className="absolute" style={{ left: '7%', right: '7%', top: '64%', fontFamily: font }}>
            <div style={{ fontWeight: 600, fontSize: '5.4cqw', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ fontWeight: 500, fontSize: '3.1cqw', color: '#64748b', marginTop: '1cqw' }}>★ 4.9 · 12,3k người theo dõi · Phản hồi 98%</div>
            <div className="flex" style={{ gap: '2cqw', marginTop: '3.4cqw' }}>
              <span style={{ fontWeight: 600, fontSize: '3.2cqw', color: '#ffffff', background: p.colorAccent, borderRadius: '99cqw', padding: '1.5cqw 4cqw' }}>+ Theo dõi</span>
              <span style={{ fontWeight: 600, fontSize: '3.2cqw', color: '#0f172a', border: '0.4cqw solid #cbd5e1', borderRadius: '99cqw', padding: '1.5cqw 4cqw' }}>Chat ngay</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (item === 'sign') {
    return (
      <div className="w-full h-full relative overflow-hidden" style={{ containerType: 'inline-size', background: 'repeating-linear-gradient(0deg, #e2d6c9 0 7cqw, #d4c6b6 7cqw 7.5cqw), #e2d6c9' }}>
        <div className="absolute" style={{ left: 0, right: 0, top: 0, height: '8%', background: '#3f3a36' }} />
        {[28, 72].map((x) => <div key={x} className="absolute" style={{ left: `${x}%`, top: '8%', height: '18%', width: '0.8cqw', background: '#6b5e52' }} />)}
        <div className="absolute flex items-center justify-center" style={{ left: '12%', right: '12%', top: '26%', height: '48%', background: p.colorPrimary, border: '2cqw solid #6b4f3a', borderRadius: '3cqw', boxShadow: '0 4cqw 7cqw rgba(0,0,0,.35)', padding: '5cqw' }}>
          {logo({ tone: 'white', style: { width: '100%', height: '100%', display: 'block' } })}
        </div>
        <div className="absolute" style={{ left: '30%', right: '30%', bottom: '10%', height: '4%', background: 'radial-gradient(closest-side, rgba(0,0,0,.25), transparent)' }} />
      </div>
    );
  }
  // name card: mặt sau (màu đậm, logo trắng) + mặt trước (trắng, logo màu + liên hệ)
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ containerType: 'inline-size', background: `linear-gradient(160deg, ${p.colorSurface}, #dfe4ea)` }}>
      <div className="absolute flex items-center justify-center" style={{ left: '12%', top: '16%', width: '62%', aspectRatio: '1.75', background: p.colorPrimary, borderRadius: '1.6cqw', transform: 'rotate(-8deg)', boxShadow: '0 3cqw 6cqw rgba(15,23,42,.28)', padding: '6cqw' }}>
        {logo({ tone: 'white', style: { width: '100%', height: '100%', display: 'block' } })}
      </div>
      <div className="absolute flex items-center" style={{ left: '26%', top: '46%', width: '62%', aspectRatio: '1.75', background: '#ffffff', borderRadius: '1.6cqw', transform: 'rotate(4deg)', boxShadow: '0 3cqw 7cqw rgba(15,23,42,.25)', padding: '4.5cqw', gap: '4cqw', fontFamily: font }}>
        <div style={{ width: '42%', height: '80%', flex: 'none' }}>
          {logo({ tone: 'color', style: { width: '100%', height: '100%', display: 'block' } })}
        </div>
        <div style={{ minWidth: 0, borderLeft: `0.4cqw solid ${p.colorAccent}`, paddingLeft: '3cqw' }}>
          <div style={{ fontWeight: 600, fontSize: '3.4cqw', color: '#0f172a', lineHeight: 1.2 }}>{name}</div>
          {slogan && <div style={{ fontWeight: 500, fontSize: '2.3cqw', color: p.colorAccent, marginTop: '0.8cqw' }}>{slogan}</div>}
          <div style={{ fontWeight: 500, fontSize: '2.2cqw', color: '#475569', marginTop: '1.6cqw', lineHeight: 1.5 }}>{contact || '0909 123 456'}</div>
        </div>
      </div>
    </div>
  );
}

// Ảnh PNG logo (nền trong) để in lên ảnh mockup thật — lấy từ hàm xuất của trang.
export interface LogoMockupsHandle { renderAll: () => Promise<Record<string, Uint8Array>> }

export const LogoMockups = forwardRef<LogoMockupsHandle, {
  palette: Palette; renderLogo: RenderLogo; logoKey: string; fontCss: string;
  name: string; slogan: string; contact: string; fileSlug: string;
  makeLogoPng: () => Promise<Blob>;
}>(function LogoMockups({ palette, renderLogo, logoKey, fontCss, name, slogan, contact, makeLogoPng, fileSlug }, ref) {
  const [mockups, setMockups] = useState<Record<string, HTMLImageElement>>({});
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState('');
  const tiles = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    PHOTO_ITEMS.forEach(({ id }) => {
      const im = new Image();
      im.onload = () => setMockups((m) => ({ ...m, [id]: im }));
      im.src = `/mockups/${id}.jpg`;
    });
  }, []);

  // Logo đổi → vẽ lại PNG (debounce nhẹ khi user đang tinh chỉnh)
  const key = JSON.stringify([logoKey, name, slogan]);
  useEffect(() => {
    let on = true;
    let url = '';
    const t = setTimeout(async () => {
      try {
        url = URL.createObjectURL(await makeLogoPng());
        const im = new Image();
        im.onload = () => { if (on) setLogo(im); };
        im.src = url;
      } catch { /* bỏ qua: giữ logo cũ */ }
    }, 250);
    return () => { on = false; clearTimeout(t); if (url) setTimeout(() => URL.revokeObjectURL(url), 5000); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const render = async (id: string): Promise<Blob> => {
    const el = tiles.current[id];
    if (!el) throw new Error('thiếu mockup');
    const canvas = el.querySelector('canvas');
    if (canvas) return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('rỗng'))), 'image/png'));
    const { toBlob } = await import('html-to-image');
    const css = await embedFontCss(fontCss);
    const b = await toBlob(el, { pixelRatio: 1080 / el.offsetWidth, fontEmbedCSS: css, cacheBust: false });
    if (!b) throw new Error('rỗng');
    return b;
  };
  const all = [...PHOTO_ITEMS, ...CODE_ITEMS];
  const downloadOne = async (id: string) => {
    if (busy) return;
    setBusy(id);
    try { downloadBlob(await render(id), `${fileSlug}-mockup-${id}.png`); } finally { setBusy(''); }
  };
  const lb = useLightbox(all, (i) => render(all[i].id), (i) => downloadOne(all[i].id));

  const renderAll = async () => {
    const files: Record<string, Uint8Array> = {};
    for (const { id } of all) files[`${fileSlug}-mockup-${id}.png`] = new Uint8Array(await (await render(id)).arrayBuffer());
    return files;
  };
  useImperativeHandle(ref, () => ({ renderAll }));
  const downloadAll = async () => {
    if (busy) return;
    setBusy('all');
    try {
      const files = await renderAll();
      const { zipSync } = await import('fflate');
      downloadBlob(new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: 'application/zip' }), `${fileSlug}-mockup.zip`);
    } finally { setBusy(''); }
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" data-testid="mockup-grid">
        {all.map(({ id, label }, i) => (
          <div key={id}>
            <button type="button" onClick={() => lb.open(i)} aria-label={`Xem lớn ${label}`} className="group relative block w-full cursor-zoom-in">
              <div ref={(el) => { tiles.current[id] = el; }} data-testid="mockup-tile" data-mockup={id} className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-white transition-colors group-hover:border-indigo-400">
                {PHOTO_ITEMS.some((p) => p.id === id)
                  ? <PhotoMockup item={id} logo={logo} mockup={mockups[id]} name={name} slogan={slogan} accent={palette.colorAccent} />
                  : <CodeMockup item={id} p={palette} logo={renderLogo} name={name} slogan={slogan} contact={contact} />}
              </div>
              <span className="pointer-events-none absolute inset-0 rounded-xl flex items-center justify-center bg-slate-950/0 opacity-0 transition-all group-hover:bg-slate-950/35 group-hover:opacity-100">
                <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-900">
                  {lb.loading === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Maximize2 className="w-3.5 h-3.5" />} Xem lớn
                </span>
              </span>
            </button>
            <div className="flex items-center justify-between mt-1 px-0.5">
              <span className="text-[11px] text-slate-400">{label}</span>
              <button type="button" onClick={() => downloadOne(id)} title={`Tải ${label}`} aria-label={`Tải ${label}`} className="text-slate-400 hover:text-white">
                {busy === id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={downloadAll} disabled={!!busy} className="mt-3 mv-btn mv-btn-ghost !flex justify-center w-full !py-2.5 !text-sm disabled:opacity-60">
        {busy === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />} Tải tất cả mockup (.zip)
      </button>

      {lb.node}
    </div>
  );
});
