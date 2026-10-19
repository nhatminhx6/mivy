'use client';
// QC v2 — test 100% tính năng gen hình: poster (mọi ngành × full/matrix × template × MÙA × STICKER × VIỀN),
// banner sản phẩm, bảng giá, brand-assets (bìa + wordmark), vật phẩm.
// Audit: canvas trống · chữ tràn mép · số lệch text · TRANG TRÍ ĐÈ CTA/nội dung · box tràn khung.
import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, TEMPLATES } from '@/lib/template-catalog';
import { CATEGORY_SAMPLES } from '@/lib/category-samples';
import { drawIndustryPoster } from '@/lib/design-engine';
import { BANNER_SIZES, drawProductBanner } from '@/lib/product-banner-engine';
import { drawPriceList } from '@/lib/pricelist-engine';
import { ASSET_KINDS, COVER_TEMPLATES, drawBrandAsset, drawWordmark } from '@/lib/brandasset-engine';
import { MERCH_ITEMS, drawMerch } from '@/lib/merch-engine';
import { SEASON_PRESETS } from '@/lib/season-engine';
import { STICKER_PRESETS } from '@/lib/sticker-engine';
import { MarketingState, PosterKind, IndustryId, AspectRatio } from '@/types';
import type { QCBox } from '@/lib/qc-capture';

const EMPTY = { headline: '', subline: '', cta: '', caption: '', points: [] };
const KINDS: PosterKind[] = ['launch', 'story', 'action'];

type Variant = { templateId?: string; layoutMode?: 'full_photo' | 'matrix'; season?: string; sticker?: string; border?: boolean };

function buildState(catId: string, industry: IndustryId, aspect: AspectRatio, v: Variant): MarketingState {
  const s = CATEGORY_SAMPLES[catId];
  return {
    industry, categoryId: catId, goal: catId,
    name: s?.name || '', brand: s?.brand || 'Mivy', offer: s?.offer || '', details: s?.details || '',
    industryFields: s?.fields || {}, bgUrl: `/backgrounds/${catId}/a.jpg`, aspect,
    theme: (((globalThis as unknown as { __qcTheme?: string }).__qcTheme) as MarketingState['theme']) || 'bold_vibrant', layoutMode: v.layoutMode || 'full_photo', templateId: v.templateId,
    selected: 'launch', outputLanguage: 'preserve', storyPage: 0, storyPerPage: 3, facts: [],
    season: v.season, sticker: v.sticker ? { preset: v.sticker, text: '', corner: 'tr' } : undefined,
    borderWidth: v.border ? 10 : undefined, borderColor: v.border ? '#ef4444' : undefined, borderRadius: v.border ? 18 : undefined,
    copies: s?.copies || { launch: { ...EMPTY }, story: { ...EMPTY }, action: { ...EMPTY } },
  } as MarketingState;
}

function qcPrep(c: HTMLCanvasElement, id: string) {
  c.dataset.qcid = id;
  const g = globalThis as unknown as { __QC_ON?: boolean; __QC_ID?: string; __qcBoxes?: QCBox[] };
  g.__QC_ON = true; g.__QC_ID = id;
  g.__qcBoxes = (g.__qcBoxes || []).filter((b) => b.id !== id);
}

function Poster({ st, kind, id }: { st: MarketingState; kind: PosterKind; id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const render = (bg: HTMLImageElement | null) => { qcPrep(c, id); drawIndustryPoster(c, { ...st, selected: kind }, kind, st.copies[kind], null, bg, null); };
    const bg = new Image(); bg.onload = () => render(bg); bg.onerror = () => render(null); bg.src = st.bgUrl || '';
  }, [st, kind, id]);
  return <canvas ref={ref} style={{ width: '100%', display: 'block', borderRadius: 6, background: '#000' }} />;
}

// Component chung cho các engine vẽ đồng bộ (có thể cần tải ảnh mockup)
function Sync({ id, draw, imgSrc }: { id: string; draw: (c: HTMLCanvasElement, img: HTMLImageElement | null) => void; imgSrc?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const go = (img: HTMLImageElement | null) => { qcPrep(c, id); draw(c, img); };
    if (imgSrc) { const im = new Image(); im.onload = () => go(im); im.onerror = () => go(null); im.src = imgSrc; }
    else go(null);
  }, [id, draw, imgSrc]);
  return <canvas ref={ref} style={{ width: '100%', display: 'block', borderRadius: 6, background: '#111' }} />;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h3 style={{ color: '#34d399', fontFamily: 'sans-serif', fontSize: 13, marginBottom: 8 }}>{label}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>{children}</div>
    </section>
  );
}

export default function QCPage() {
  const [aspect, setAspect] = useState<AspectRatio>('4:5');
  const [report, setReport] = useState<string>('');

  useEffect(() => { (window as unknown as { __audit: () => unknown }).__audit = () => auditAll(); });
  // Tắt cờ capture khi rời trang QC để engine không ghi box ở app thật
  useEffect(() => () => { const g = globalThis as unknown as { __QC_ON?: boolean; __qcBoxes?: unknown[] }; g.__QC_ON = false; g.__qcBoxes = []; }, []);
  if (typeof window !== 'undefined' && !(window as unknown as { __qcAlign?: unknown[] }).__qcAlign) (window as unknown as { __qcAlign: unknown[] }).__qcAlign = [];

  function overlapArea(a: QCBox, b: QCBox): number {
    const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    return x * y;
  }

  function auditAll() {
    const canvases = [...document.querySelectorAll('canvas')] as HTMLCanvasElement[];
    const problems: unknown[] = [];
    const dims: Record<string, { W: number; H: number }> = {};
    for (const c of canvases) {
      const id = c.dataset.qcid || '?';
      const ctx = c.getContext('2d'); if (!ctx) continue;
      const W = c.width, H = c.height;
      dims[id] = { W: 1080, H: Math.round(H / (W / 1080)) };
      const d = ctx.getImageData(0, 0, W, H).data;
      // 1) blank
      let min = 255, max = 0;
      for (let i = 0; i < d.length; i += 4 * 97) { const v = d[i]; if (v < min) min = v; if (v > max) max = v; }
      if (max - min < 12) { problems.push({ id, type: 'blank' }); continue; }
      // 2) chữ sáng tràn mép — CHỈ cho poster (nền tối); engine nền sáng (bảng giá/bìa/banner) bỏ qua
      const isPoster = !/^(banner|price|cover|asset|merch|wordmark)/.test(id);
      if (isPoster) {
        const bright = (x0: number, y0: number, x1: number, y1: number) => { let n = 0; for (let y = y0; y < y1; y += 3) for (let x = x0; x < x1; x += 3) { const i = (y * W + x) * 4; if (d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225) n++; } return n; };
        if (bright(0, 60, 9, H - 60) > 2) problems.push({ id, type: 'edge-left' });
        if (bright(W - 9, 60, W, H - 60) > 2) problems.push({ id, type: 'edge-right' });
        if (bright(40, H - 7, W - 40, H) > 2) problems.push({ id, type: 'edge-bottom' });
        if (bright(40, 0, W - 40, 7) > 2) problems.push({ id, type: 'edge-top' });
      }
    }

    // 3) số lệch text
    const align = ((window as unknown as { __qcAlign?: { n: number; t: number }[] }).__qcAlign) || [];
    const misaligned = align.filter((p) => Math.abs(p.n - p.t) > 4);
    if (misaligned.length) problems.push({ id: 'number-text-align', type: 'misaligned', count: misaligned.length });

    // 4) TRANG TRÍ (mùa/sticker) ĐÈ CTA/nội dung + box tràn khung
    const boxes = ((globalThis as unknown as { __qcBoxes?: QCBox[] }).__qcBoxes) || [];
    const byId: Record<string, QCBox[]> = {};
    for (const b of boxes) (byId[b.id] = byId[b.id] || []).push(b);
    for (const id of Object.keys(byId)) {
      const list = byId[id];
      const decors = list.filter((b) => b.t === 'decor' || b.t === 'sticker');
      const contents = list.filter((b) => b.t === 'cta' || b.t === 'content');
      for (const dco of decors) {
        // decor (mùa) không được đè bất cứ nội dung/CTA; sticker (cố ý) chỉ cấm đè CTA
        const targets = dco.t === 'sticker' ? contents.filter((c) => c.t === 'cta') : contents;
        for (const cc of targets) {
          const ov = overlapArea(dco, cc);
          const minArea = Math.min(dco.w * dco.h, cc.w * cc.h);
          if (minArea > 0 && ov > minArea * 0.15) {
            problems.push({ id, type: 'decor-overlap', decor: `${dco.t}:${dco.tag}`, over: `${cc.t}:${cc.tag}`, pct: Math.round((ov / minArea) * 100) });
          }
        }
      }
      // box tràn khung (chỉ xét trang trí — nội dung có thể full-bleed)
      const dm = dims[id]; if (!dm) continue;
      for (const b of decors) {
        if (b.x < -6 || b.y < -6 || b.x + b.w > dm.W + 6 || b.y + b.h > dm.H + 6) {
          problems.push({ id, type: 'decor-out-of-frame', decor: `${b.t}:${b.tag}` });
        }
      }
    }

    const out = { total: canvases.length, alignChecks: align.length, boxes: boxes.length, problems };
    setReport(JSON.stringify(out, null, 1));
    return out;
  }

  // ===== Dựng mọi tổ hợp =====
  const posterRows: { label: string; items: { st: MarketingState; kind: PosterKind; id: string }[] }[] = [];
  CATEGORIES.forEach((c) => {
    const ind = c.industry as IndustryId;
    posterRows.push({ label: `${c.name} · full-photo`, items: KINDS.map((k) => ({ st: buildState(c.id, ind, aspect, {}), kind: k, id: `${c.id}|full|${k}` })) });
    posterRows.push({ label: `${c.name} · matrix`, items: KINDS.map((k) => ({ st: buildState(c.id, ind, aspect, { layoutMode: 'matrix' }), kind: k, id: `${c.id}|matrix|${k}` })) });
  });
  TEMPLATES.forEach((t) => {
    posterRows.push({ label: `Template: ${t.name}`, items: KINDS.map((k) => ({ st: buildState('beauty', 'service' as IndustryId, aspect, { templateId: t.id }), kind: k, id: `tpl-${t.id}|${k}` })) });
  });
  // MÙA — test trên full-photo + template (catalog) để bắt trang trí đè CTA
  const seasonRow = { label: 'MÙA (full-photo)', items: SEASON_PRESETS.filter((s) => s.id !== 'none').map((s) => ({ st: buildState('travel', 'service' as IndustryId, aspect, { season: s.id }), kind: 'launch' as PosterKind, id: `season-full|${s.id}` })) };
  const seasonTplRow = { label: 'MÙA (template)', items: SEASON_PRESETS.filter((s) => s.id !== 'none').map((s) => ({ st: buildState('travel', 'service' as IndustryId, aspect, { templateId: 'magazine', season: s.id }), kind: 'launch' as PosterKind, id: `season-tpl|${s.id}` })) };
  // STICKER — mọi preset, cả 4 góc test ở góc dưới (dễ đè CTA)
  const stickerRow = { label: 'STICKER (góc mặc định)', items: STICKER_PRESETS.map((p) => ({ st: buildState('retail', 'general' as IndustryId, aspect, { sticker: p.id }), kind: 'launch' as PosterKind, id: `sticker|${p.id}` })) };
  // VIỀN
  const borderRow = { label: 'VIỀN khung', items: [{ st: buildState('travel', 'service' as IndustryId, aspect, { border: true }), kind: 'launch' as PosterKind, id: 'border|on' }, { st: buildState('beauty', 'service' as IndustryId, aspect, { templateId: 'editorial', border: true }), kind: 'launch' as PosterKind, id: 'border|tpl' }] };

  return (
    <div style={{ padding: 20, background: '#0a0a0f', minHeight: '100vh' }}>
      <div style={{ position: 'sticky', top: 0, background: '#0a0a0f', padding: '8px 0', zIndex: 10, borderBottom: '1px solid #1e293b', marginBottom: 16 }}>
        <h1 style={{ color: '#fff', fontFamily: 'sans-serif', fontSize: 18, margin: 0 }}>QC v2 — Mọi tính năng gen hình</h1>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
          {(['4:5', '9:16', '1:1'] as AspectRatio[]).map((a) => (
            <button key={a} onClick={() => setAspect(a)} style={{ padding: '4px 10px', borderRadius: 8, background: aspect === a ? '#10b981' : '#1e293b', color: '#fff', border: 'none', fontFamily: 'sans-serif', fontSize: 12, cursor: 'pointer' }}>{a}</button>
          ))}
          <button onClick={auditAll} style={{ padding: '4px 14px', borderRadius: 8, background: '#f59e0b', color: '#111', border: 'none', fontFamily: 'sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Chấm lỗi (Audit)</button>
          {report && <span style={{ color: report.includes('"problems": []') ? '#34d399' : '#f87171', fontFamily: 'monospace', fontSize: 12 }}>{report.includes('"problems": []') ? '✓ Không lỗi' : '✗ Có lỗi'}</span>}
        </div>
        {report && <pre style={{ color: '#fca5a5', fontFamily: 'monospace', fontSize: 11, maxHeight: 160, overflow: 'auto', margin: '6px 0 0' }}>{report}</pre>}
      </div>

      {[...posterRows, seasonRow, seasonTplRow, stickerRow, borderRow].map((row) => (
        <Row key={row.label} label={row.label}>
          {row.items.map((it) => <Poster key={it.id} st={it.st} kind={it.kind} id={it.id} />)}
        </Row>
      ))}

      {/* BANNER sản phẩm */}
      <Row label="Banner sản phẩm (khổ × nền)">
        {BANNER_SIZES.flatMap((sz) => (['studio', 'gradient', 'solid'] as const).map((bgStyle) => (
          <Sync key={`banner|${sz.id}|${bgStyle}`} id={`banner|${sz.id}|${bgStyle}`} draw={(c) => drawProductBanner(c, { size: sz.id, bgStyle, headline: 'SẢN PHẨM MỚI', price: '199.000đ', oldPrice: '299.000đ', saleTag: '-30%', cta: 'MUA NGAY', brandName: 'MIVY', colorPrimary: '#0f172a', colorAccent: '#6366f1', fontHeadingId: 'be-vietnam', fontBodyId: 'be-vietnam' })} />
        )))}
      </Row>

      {/* BẢNG GIÁ */}
      <Row label="Bảng giá (style × khổ)">
        {(['elegant', 'light', 'dark'] as const).flatMap((style) => (['4:5', '9:16', '1:1'] as const).map((asp) => (
          <Sync key={`price|${style}|${asp}`} id={`price|${style}|${asp}`} draw={(c) => drawPriceList(c, { title: 'BẢNG GIÁ', brandName: 'NAMI', contact: '0909 123 456 · HCM', style, aspect: asp, colorPrimary: '#2b2219', colorAccent: '#b4703a', fontHeadingId: 'be-vietnam', fontBodyId: 'be-vietnam', items: [{ name: 'Cà phê sữa đá', price: '25.000đ', desc: 'Đậm vị' }, { name: 'Bạc xỉu', price: '30.000đ' }, { name: 'Trà đào', price: '35.000đ', desc: 'Giải nhiệt' }, { name: 'Bánh mì', price: '45.000đ' }] })} />
        )))}
      </Row>

      {/* BRAND ASSETS: bìa × mẫu + các kind khác + wordmark */}
      <Row label="Bìa Facebook × mẫu">
        {COVER_TEMPLATES.map((t) => (
          <Sync key={`cover|fb|${t.id}`} id={`cover|fb|${t.id}`} draw={(c) => drawBrandAsset(c, { kind: 'fb', coverTemplate: t.id, style: 'gradient', colorPrimary: '#0f172a', colorSecondary: '#0f172a', colorAccent: '#6366f1', brandName: 'MIVY', slogan: 'Chất lượng tạo niềm tin', contact: '0909 · 12 Lê Lợi', badge: 'GIẢM 30%', usps: ['Chính hãng', 'Giao nhanh', 'Đổi trả'], fontHeadingId: 'be-vietnam', fontBodyId: 'be-vietnam' })} />
        ))}
      </Row>
      <Row label="Brand assets (kind khác) + wordmark">
        {ASSET_KINDS.map((k) => (
          <Sync key={`asset|${k.id}`} id={`asset|${k.id}`} draw={(c) => drawBrandAsset(c, { kind: k.id, coverTemplate: 'elegant', style: 'gradient', colorPrimary: '#0f172a', colorSecondary: '#0f172a', colorAccent: '#6366f1', brandName: 'MIVY', slogan: 'Slogan ngắn', contact: '0909 · HCM', badge: 'GIẢM 30%', usps: ['Chính hãng', 'Giao nhanh', 'Đổi trả'], fontHeadingId: 'be-vietnam', fontBodyId: 'be-vietnam' })} />
        ))}
        <Sync id="wordmark" draw={(c) => drawWordmark(c, { kind: 'logo', brandName: 'MIVY', slogan: 'Creative Studio', colorAccent: '#6366f1', colorPrimary: '#17202e', colorSecondary: '#17202e', fontHeadingId: 'be-vietnam', fontBodyId: 'be-vietnam' })} />
      </Row>

      {/* VẬT PHẨM */}
      <Row label="Vật phẩm (vector)">
        {MERCH_ITEMS.map((m) => (
          <Sync key={`merch-v|${m.id}`} id={`merch-v|${m.id}`} draw={(c) => drawMerch(c, { item: m.id, productColor: '#1f2937', bgColor: '#f4f4f5', brandName: 'MIVY', slogan: 'Slogan', accent: '#6366f1', fontHeadingId: 'be-vietnam', contact: '0909', mode: 'vector', mockupImg: null })} />
        ))}
      </Row>
    </div>
  );
}
