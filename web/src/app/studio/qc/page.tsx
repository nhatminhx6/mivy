'use client';
// Trang QC nội bộ: render MỌI tổ hợp poster + tự chấm lỗi layout.
// Phủ: full-photo + matrix + 14 template, cho 12 ngành × 3 loại × 2 khổ.
// window.__audit() trả về danh sách lỗi (tràn mép, canvas trống, số lệch text).
import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, TEMPLATES } from '@/lib/template-catalog';
import { CATEGORY_SAMPLES } from '@/lib/category-samples';
import { drawIndustryPoster } from '@/lib/design-engine';
import { MarketingState, PosterKind, IndustryId, AspectRatio } from '@/types';

const EMPTY = { headline: '', subline: '', cta: '', caption: '', points: [] };
const KINDS: PosterKind[] = ['launch', 'story', 'action'];

type Variant = { templateId?: string; layoutMode?: 'full_photo' | 'matrix' };

function buildState(catId: string, industry: IndustryId, aspect: AspectRatio, v: Variant): MarketingState {
  const s = CATEGORY_SAMPLES[catId];
  return {
    industry,
    categoryId: catId,
    goal: catId,
    name: s?.name || '',
    brand: s?.brand || 'Mivy',
    offer: s?.offer || '',
    details: s?.details || '',
    industryFields: s?.fields || {},
    bgUrl: `/backgrounds/${catId}/a.jpg`,
    aspect,
    theme: 'emerald_pro',
    layoutMode: v.layoutMode || 'full_photo',
    templateId: v.templateId,
    selected: 'launch',
    outputLanguage: 'preserve',
    storyPage: 0,
    storyPerPage: 3,
    facts: [],
    copies: s?.copies || { launch: { ...EMPTY }, story: { ...EMPTY }, action: { ...EMPTY } },
  } as MarketingState;
}

function Poster({ state, kind, id }: { state: MarketingState; kind: PosterKind; id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.dataset.qcid = id;
    const render = (bg: HTMLImageElement | null) =>
      drawIndustryPoster(c, { ...state, selected: kind }, kind, state.copies[kind], null, bg, null);
    const bg = new Image();
    bg.onload = () => render(bg);
    bg.onerror = () => render(null);
    bg.src = state.bgUrl || '';
  }, [state, kind, id]);
  return <canvas ref={ref} style={{ width: '100%', display: 'block', borderRadius: 8, background: '#000' }} />;
}

function Row({ label, states }: { label: string; states: { st: MarketingState; id: string }[] }) {
  return (
    <section style={{ marginBottom: 30 }}>
      <h3 style={{ color: '#34d399', fontFamily: 'sans-serif', fontSize: 13, marginBottom: 8 }}>{label}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {states.map(({ st, id }, i) => (
          <div key={id}>
            <div style={{ color: '#64748b', fontFamily: 'sans-serif', fontSize: 10, marginBottom: 3, textTransform: 'uppercase' }}>{KINDS[i]}</div>
            <Poster state={st} kind={KINDS[i]} id={id} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function QCPage() {
  const [aspect, setAspect] = useState<AspectRatio>('4:5');
  const [report, setReport] = useState<string>('');

  // Hàm chấm lỗi — gắn vào window để test (Playwright) hoặc bấm nút gọi.
  useEffect(() => {
    (window as any).__audit = () => auditAll();
  });
  // Mảng ghi toạ độ số/text do renderer đẩy vào (để kiểm số thẳng text)
  if (typeof window !== 'undefined' && !(window as any).__qcAlign) (window as any).__qcAlign = [];

  function auditAll() {
    const canvases = [...document.querySelectorAll('canvas')] as HTMLCanvasElement[];
    const problems: any[] = [];
    for (const c of canvases) {
      const id = c.dataset.qcid || '?';
      const ctx = c.getContext('2d');
      if (!ctx) continue;
      const W = c.width, H = c.height;
      const d = ctx.getImageData(0, 0, W, H).data;
      // 1) blank: gần như 1 màu
      let min = 255, max = 0;
      for (let i = 0; i < d.length; i += 4 * 97) { const v = d[i]; if (v < min) min = v; if (v > max) max = v; }
      if (max - min < 12) { problems.push({ id, type: 'blank' }); continue; }
      // 2) tràn mép (chữ sáng chạm biên)
      const bright = (x0: number, y0: number, x1: number, y1: number) => {
        let n = 0; for (let y = y0; y < y1; y += 3) for (let x = x0; x < x1; x += 3) { const i = (y * W + x) * 4; if (d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225) n++; } return n;
      };
      if (bright(0, 60, 9, H - 60) > 2) problems.push({ id, type: 'edge-left' });
      if (bright(W - 9, 60, W, H - 60) > 2) problems.push({ id, type: 'edge-right' });
      if (bright(40, H - 7, W - 40, H) > 2) problems.push({ id, type: 'edge-bottom' });
      if (bright(40, 0, W - 40, 7) > 2) problems.push({ id, type: 'edge-top' });
    }
    // Kiểm số thẳng text (toạ độ do renderer ghi, so tâm Y)
    const align = ((window as any).__qcAlign || []) as { n: number; t: number }[];
    const misaligned = align.filter((p) => Math.abs(p.n - p.t) > 4);
    if (misaligned.length) problems.push({ id: 'number-text-align', type: 'misaligned', count: misaligned.length, sample: misaligned.slice(0, 3) });
    const out = { total: canvases.length, alignChecks: align.length, problems };
    setReport(JSON.stringify(out, null, 1));
    return out;
  }

  const combos: { label: string; states: { st: MarketingState; id: string }[] }[] = [];
  CATEGORIES.forEach((c) => {
    const ind = c.industry as IndustryId;
    // full-photo
    combos.push({ label: `${c.name} · full-photo`, states: KINDS.map((k, i) => ({ st: buildState(c.id, ind, aspect, {}), id: `${c.id}|full|${k}` })) });
    // matrix
    combos.push({ label: `${c.name} · matrix`, states: KINDS.map((k) => ({ st: buildState(c.id, ind, aspect, { layoutMode: 'matrix' }), id: `${c.id}|matrix|${k}` })) });
  });
  // 14 template (dùng data beauty) — phủ catalog-renderer
  TEMPLATES.forEach((t) => {
    combos.push({ label: `Template: ${t.name}`, states: KINDS.map((k) => ({ st: buildState('beauty', 'service' as IndustryId, aspect, { templateId: t.id }), id: `tpl-${t.id}|${k}` })) });
  });

  return (
    <div style={{ padding: 20, background: '#0a0a0f', minHeight: '100vh' }}>
      <div style={{ position: 'sticky', top: 0, background: '#0a0a0f', padding: '8px 0', zIndex: 10, borderBottom: '1px solid #1e293b', marginBottom: 16 }}>
        <h1 style={{ color: '#fff', fontFamily: 'sans-serif', fontSize: 18, margin: 0 }}>QC — Mọi tổ hợp poster</h1>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
          {(['4:5', '9:16', '1:1'] as AspectRatio[]).map((a) => (
            <button key={a} onClick={() => setAspect(a)} style={{ padding: '4px 10px', borderRadius: 8, background: aspect === a ? '#10b981' : '#1e293b', color: '#fff', border: 'none', fontFamily: 'sans-serif', fontSize: 12, cursor: 'pointer' }}>{a}</button>
          ))}
          <button onClick={auditAll} style={{ padding: '4px 14px', borderRadius: 8, background: '#f59e0b', color: '#111', border: 'none', fontFamily: 'sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Chấm lỗi (Audit)</button>
          {report && <span style={{ color: report.includes('"problems": []') ? '#34d399' : '#f87171', fontFamily: 'monospace', fontSize: 12 }}>{report.includes('"problems": []') ? '✓ Không lỗi' : '✗ Có lỗi — xem console/report'}</span>}
        </div>
        {report && <pre style={{ color: '#fca5a5', fontFamily: 'monospace', fontSize: 11, maxHeight: 120, overflow: 'auto', margin: '6px 0 0' }}>{report}</pre>}
      </div>
      {combos.map((combo) => (
        <Row key={combo.label} label={combo.label} states={combo.states} />
      ))}
    </div>
  );
}
