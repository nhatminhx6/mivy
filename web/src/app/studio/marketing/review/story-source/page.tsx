'use client';

import React, { useEffect, useRef, useState } from 'react';
import { notFound } from 'next/navigation';
import { createExportSnapshot, resolveStorySource } from '@/lib/balanced-pages';
import { drawIndustryPoster, ensurePosterFontsReady } from '@/lib/design-engine';
import { makeIndustryCopy } from '@/lib/industry-concepts';
import { marketingZip } from '@/lib/marketing-zip';
import { AspectRatio, CopyItem, MarketingState } from '@/types';

const EMPTY_COPY: CopyItem = {
  headline: 'AI Summit 2026',
  subline: 'Chi tiết chương trình & diễn giả',
  cta: 'Đăng ký ngay',
  caption: 'AI Summit 2026 - Chương trình hội thảo chuyên sâu.',
  points: [],
};

function buildLegacy5LineState(aspect: AspectRatio): MarketingState {
  const launch: CopyItem = { ...EMPTY_COPY, points: [] };
  const story: CopyItem = { ...EMPTY_COPY, points: [], pointsEdited: false };
  const action: CopyItem = { ...EMPTY_COPY, points: [] };
  return {
    industry: 'general',
    categoryId: 'event',
    templateId: 'agenda',
    conceptId: '',
    brand: 'MIVY · QC STORY SOURCE',
    name: 'AI Summit 2026',
    details: [
      '01. Đón khách & check-in sáng',
      '02. Keynote: AI Agents trong vận hành thực tế',
      '03. Panel: Kiến trúc dữ liệu thời gian thực',
      '04. Workshop: Đánh giá chất lượng hệ thống',
      '05. Networking & tổng kết chương trình',
    ].join('\n'),
    goal: 'Thu hút đăng ký tham dự',
    offer: 'Vé Early Bird giảm 30%',
    aspect,
    theme: 'tech_dark',
    selected: 'story',
    outputLanguage: 'vi',
    storyPage: 0,
    storyPerPage: 3,
    copies: { launch, story, action },
  };
}

function buildIntentionalEmptyState(aspect: AspectRatio): MarketingState {
  const base = buildLegacy5LineState(aspect);
  return {
    ...base,
    facts: [
      { id: 'f1', source_excerpt: 'Chi tiết', text: 'Fact không được phép hồi sinh khi đã xóa chủ đích', selected: true },
    ],
    copies: {
      ...base.copies,
      story: {
        ...base.copies.story,
        points: [],
        pointsEdited: true,
      },
    },
  };
}

function buildBalanced10ConceptState(aspect: AspectRatio): MarketingState {
  const fields = {
    role: 'Senior Product Engineer',
    salary: '45 - 65 triệu',
    location: 'Quận 1, TP.HCM',
    requirements: [
      '1. Thiết kế kiến trúc frontend hiện đại',
      '2. Tối ưu hiệu năng render canvas 60fps',
      '3. Xây dựng hệ thống kiểm thử tự động',
      '4. Phối hợp chặt chẽ cùng đội ngũ Product',
      '5. Review code và hướng dẫn thành viên mới',
    ].join('\n'),
    benefits: [
      '6. Thưởng hiệu suất 2 lần mỗi năm',
      '7. Bảo hiểm sức khỏe toàn diện cho gia đình',
      '8. Ngân sách học tập & hội thảo 20 triệu/năm',
      '9. Chế độ làm việc hybrid linh hoạt',
      '10. Trang bị MacBook Pro M3 Max',
    ].join('\n'),
    contact: 'careers@mivy.vn · 0909 123 456',
  };
  const copy = makeIndustryCopy('recruitment', fields);
  return {
    industry: 'recruitment',
    categoryId: 'recruitment',
    conceptId: 'recruitment-announcement',
    industryFields: fields,
    brand: 'MIVY · QC BALANCED 10',
    name: copy.headline,
    details: copy.caption,
    goal: '',
    offer: '',
    aspect,
    theme: 'tech_dark',
    selected: 'story',
    outputLanguage: 'vi',
    storyPage: 0,
    storyPerPage: 3,
    copies: {
      launch: { ...copy },
      story: { ...copy },
      action: { ...copy },
    },
  };
}

function ScenarioViewer({
  id,
  title,
  subtitle,
  initialState,
}: {
  id: string;
  title: string;
  subtitle: string;
  initialState: MarketingState;
}) {
  const [state, setState] = useState<MarketingState>(initialState);
  const resolved = resolveStorySource(state, state.copies.story);
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const [zipInfo, setZipInfo] = useState<string>('');
  const [previewReady, setPreviewReady] = useState<boolean>(false);

  useEffect(() => {
    setState(initialState);
    setPreviewReady(false);
  }, [initialState]);

  useEffect(() => {
    let active = true;
    setPreviewReady(false);
    (async () => {
      await ensurePosterFontsReady(state);
      if (!active) return;
      resolved.pages.forEach((_, idx) => {
        const canvas = canvasRefs.current[idx];
        if (!canvas) return;
        const pageState: MarketingState = { ...state, storyPage: idx };
        drawIndustryPoster(canvas, pageState, 'story', pageState.copies.story, null);
      });
      if (active) setPreviewReady(true);
    })();
    return () => {
      active = false;
    };
  }, [state, resolved.pages.length, resolved.items.join('|')]);

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    let active = true;
    const rerender = () => {
      if (!active) return;
      resolved.pages.forEach((_, idx) => {
        const canvas = canvasRefs.current[idx];
        if (!canvas) return;
        const pageState: MarketingState = { ...state, storyPage: idx };
        drawIndustryPoster(canvas, pageState, 'story', pageState.copies.story, null);
      });
      if (active) setPreviewReady(true);
    };
    document.fonts.ready.then(rerender);
    if ('addEventListener' in document.fonts) {
      document.fonts.addEventListener('loadingdone', rerender);
      return () => {
        active = false;
        document.fonts.removeEventListener('loadingdone', rerender);
      };
    }
    return () => {
      active = false;
    };
  }, [state, resolved.pages.length, resolved.items.join('|')]);

  // DEV-ONLY: Capture the CURRENT attached canvas ref directly from the DOM without redraw,
  // font await, state mutation, or replacement canvas.
  const capturePreviewPng = (pageIdx: number) => {
    const canvas = canvasRefs.current[pageIdx];
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qc-${id}-story-p${pageIdx + 1}-attached-preview-${state.aspect.replace(':', 'x')}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };

  const downloadPagePng = async (pageIdx: number) => {
    // Snapshot state synchronously before ANY async work!
    const { snapshot } = createExportSnapshot(state);
    await ensurePosterFontsReady(snapshot);
    const c = document.createElement('canvas');
    const pageState: MarketingState = { ...snapshot, storyPage: pageIdx };
    drawIndustryPoster(c, pageState, 'story', pageState.copies.story, null);
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qc-${id}-story-p${pageIdx + 1}-${snapshot.aspect.replace(':', 'x')}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };

  const downloadScenarioZip = async () => {
    // 1. Snapshot state synchronously before ANY async work!
    const { snapshot, storySource: snapStory } = createExportSnapshot(state);
    const totalPages = snapStory.totalPages;

    // 2. Ensure fonts ready for export snapshot
    await ensurePosterFontsReady(snapshot);

    const renderBlob = async (kind: 'launch' | 'story' | 'action', storyPage = 0) => {
      const c = document.createElement('canvas');
      const s: MarketingState = { ...snapshot, storyPage };
      drawIndustryPoster(c, s, kind, s.copies[kind], null);
      return await new Promise<Blob>((res, rej) =>
        c.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được PNG'))), 'image/png'),
      );
    };

    const files: { name: string; data: Uint8Array }[] = [];
    const suffix = snapshot.aspect.replace(':', 'x');

    const launchBlob = await renderBlob('launch', 0);
    files.push({ name: `01-launch-${suffix}.png`, data: new Uint8Array(await launchBlob.arrayBuffer()) });

    for (let p = 0; p < totalPages; p++) {
      const storyBlob = await renderBlob('story', p);
      const pageSuffix = totalPages > 1 ? `-p${p + 1}of${totalPages}` : '';
      files.push({
        name: `02-story${pageSuffix}-${suffix}.png`,
        data: new Uint8Array(await storyBlob.arrayBuffer()),
      });
    }

    const actionBlob = await renderBlob('action', 0);
    files.push({ name: `03-action-${suffix}.png`, data: new Uint8Array(await actionBlob.arrayBuffer()) });

    const zipBlob = marketingZip(files);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qc-${id}-pack-${suffix}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setZipInfo(`Đã tạo ZIP (${files.map((f) => f.name).join(', ')})`);
  };

  return (
    <section className="rounded-2xl border border-white/15 bg-slate-900/60 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-white/15 border border-white/30 px-2.5 py-1 text-xs font-mono text-zinc-300">
            mode: {resolved.isConcept ? 'concept-balanced' : 'legacy-sliced'} · items: {resolved.items.length} · pages: {resolved.pages.map((p) => p.length).join('/')} (total {resolved.totalPages})
          </span>
          <button
            type="button"
            onClick={downloadScenarioZip}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-indigo-400"
          >
            Tải bộ ZIP kiểm tra
          </button>
        </div>
      </div>

      {zipInfo && <p className="text-xs font-mono text-zinc-300">{zipInfo}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resolved.pages.map((pageItems, idx) => (
          <div key={idx} className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-slate-300">
              <span className="font-semibold">
                Trang {idx + 1}/{resolved.totalPages} ({pageItems.length} mục)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!previewReady}
                  onClick={() => capturePreviewPng(idx)}
                  className="rounded bg-sky-500/20 border border-sky-500/40 px-2 py-0.5 text-[11px] font-medium text-sky-300 hover:bg-sky-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Chụp trực tiếp từ canvas DOM đang hiển thị mà không vẽ lại"
                >
                  {previewReady ? 'Chụp preview DOM' : 'Đang vẽ...'}
                </button>
                <button
                  type="button"
                  onClick={() => downloadPagePng(idx)}
                  className="text-zinc-400 hover:text-zinc-200 hover:underline text-[11px]"
                  title="Xuất qua offscreen canvas độc lập (khớp 1:1 với gói ZIP)"
                >
                  Tải PNG (Export)
                </button>
              </div>
            </div>
            <canvas
              ref={(el) => {
                canvasRefs.current[idx] = el;
              }}
              style={{
                letterSpacing: 'normal',
                wordSpacing: 'normal',
                WebkitFontSmoothing: 'subpixel-antialiased',
                textRendering: 'geometricPrecision',
              }}
              className="w-full rounded-lg border border-white/10"
            />
            <ul className="text-[11px] text-slate-400 space-y-0.5 list-disc pl-4">
              {pageItems.length > 0 ? (
                pageItems.map((it, i) => <li key={i} className="truncate">{it}</li>)
              ) : (
                <li className="italic text-slate-500">(Trang trống chủ đích — 0 mục)</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function StorySourceReviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const [aspect, setAspect] = useState<AspectRatio>('4:5');

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <a href="/studio/marketing/review" className="text-sm text-zinc-300 hover:underline">
            ← Quay lại trang Review
          </a>
          <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-xs text-amber-300 font-mono">
            DEV-ONLY · ISOLATED IN-MEMORY FIXTURE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-300">Khổ kiểm tra:</label>
          <select
            aria-label="Khổ kiểm tra"
            value={aspect}
            onChange={(e) => setAspect(e.target.value as AspectRatio)}
            className="rounded-lg bg-slate-800 border border-white/15 px-3 py-1.5 text-xs text-white"
          >
            <option value="1:1">1:1 (1080×1080)</option>
            <option value="4:5">4:5 (1080×1350)</option>
            <option value="9:16">9:16 (1080×1920)</option>
          </select>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">QC Story Source & Pagination (In-Memory)</h1>
        <p className="text-sm text-slate-400 mt-1">
          Fixture cô lập hoàn toàn trong bộ nhớ để kiểm tra đồng bộ nguồn dữ liệu Story giữa Renderer, Controls và ZIP Export. Không đọc/ghi localStorage hay IndexedDB của người dùng.
        </p>
      </div>

      <ScenarioViewer
        id="legacy-5-lines"
        title="1. Legacy 5 dòng chi tiết (agenda, copies.story.points = [], pointsEdited = false)"
        subtitle="Phải tự động phân trang 3 + 2 (2 trang Story) cho cả Canvas và gói ZIP mà không nhân bản hay sót dòng."
        initialState={buildLegacy5LineState(aspect)}
      />

      <ScenarioViewer
        id="intentional-empty"
        title="2. Xóa chủ đích (copies.story.points = [], pointsEdited = true)"
        subtitle="Phải giữ đúng 1 trang Story trống (0 mục), tuyệt đối không tự chèn lại từ details/facts hay câu mẫu."
        initialState={buildIntentionalEmptyState(aspect)}
      />

      <ScenarioViewer
        id="concept-10-balanced"
        title="3. Industry Concept 10 mục (recruitment-announcement, perPage = 3)"
        subtitle="Phải chia đều 4 trang theo tỷ lệ 3 / 3 / 2 / 2 thông qua balancedPages."
        initialState={buildBalanced10ConceptState(aspect)}
      />
    </main>
  );
}
