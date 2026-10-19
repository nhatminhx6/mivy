'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { drawIndustryPoster } from '@/lib/design-engine';
import { CATEGORY_SAMPLES } from '@/lib/category-samples';
import type { MarketingState, IndustryId, ThemeId } from '@/types';

type Item = { catId: string; industry: IndustryId; theme: ThemeId; layout: 'full_photo' | 'matrix'; bg?: string; label: string };

const ITEMS: Item[] = [
  { catId: 'recruitment', industry: 'recruitment', theme: 'bold_vibrant', layout: 'full_photo', bg: '/backgrounds/recruitment/a.jpg', label: 'Tuyển dụng' },
  { catId: 'food', industry: 'general', theme: 'warm_editorial', layout: 'full_photo', bg: '/backgrounds/food/a.jpg', label: 'Ẩm thực' },
  { catId: 'education', industry: 'education', theme: 'tech_dark', layout: 'matrix', label: 'Khoá học' },
  { catId: 'event', industry: 'service', theme: 'clean_minimal', layout: 'full_photo', bg: '/backgrounds/event/a.jpg', label: 'Sự kiện' },
];

function buildState(it: Item): MarketingState {
  const s = CATEGORY_SAMPLES[it.catId];
  return {
    industry: it.industry, categoryId: it.catId, goal: it.catId,
    name: s?.name || '', brand: s?.brand || 'Mivy', offer: s?.offer || '', details: s?.details || '',
    industryFields: s?.fields || {}, bgUrl: it.bg || '', aspect: '4:5',
    theme: it.theme, layoutMode: it.layout, templateId: undefined,
    selected: 'launch', outputLanguage: 'preserve', storyPage: 0, storyPerPage: 3, facts: [],
    copies: s?.copies,
  } as MarketingState;
}

function Card({ it }: { it: Item }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const st = buildState(it);
    const render = (bg: HTMLImageElement | null) => {
      try { drawIndustryPoster(c, st, 'launch', st.copies.launch, null, bg, null, 1); } catch { /* bỏ qua */ }
    };
    if (it.bg) { const im = new Image(); im.onload = () => render(im); im.onerror = () => render(null); im.src = it.bg; }
    else render(null);
  }, [it]);
  return (
    <Link href="/studio/marketing" className="glass-card !p-2 group block">
      <div className="overflow-hidden rounded-lg">
        <canvas ref={ref} className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.04]" />
      </div>
      <div className="px-1.5 pt-2.5 pb-1 text-xs font-semibold text-slate-300">{it.label}</div>
    </Link>
  );
}

export default function PosterShowcase() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mv-stagger">
      {ITEMS.map((it) => <Card key={it.catId} it={it} />)}
    </div>
  );
}
