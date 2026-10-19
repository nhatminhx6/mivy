'use client';
// Công cụ tự-soi chất lượng NỘI DUNG/thiết kế (render cỡ lớn). Nội bộ, giống /studio/qc nhưng to để nhìn.
import { useEffect, useRef } from 'react';
import { drawIndustryPoster } from '@/lib/design-engine';
import { drawProductBanner } from '@/lib/product-banner-engine';
import { drawPriceList } from '@/lib/pricelist-engine';
import { drawBrandAsset } from '@/lib/brandasset-engine';
import { drawMerch } from '@/lib/merch-engine';
import { CATEGORY_SAMPLES } from '@/lib/category-samples';
import { MarketingState, PosterKind, IndustryId } from '@/types';

const EMPTY = { headline: '', subline: '', cta: '', caption: '', points: [] };
function st(cat: string, ind: IndustryId, opt: { tpl?: string; layout?: 'full_photo' | 'matrix'; aspect?: string }): MarketingState {
  const s = CATEGORY_SAMPLES[cat];
  return { industry: ind, categoryId: cat, goal: cat, name: s?.name || '', brand: s?.brand || 'Mivy', offer: s?.offer || '', details: s?.details || '', industryFields: s?.fields || {}, bgUrl: `/backgrounds/${cat}/a.jpg`, aspect: (opt.aspect || '4:5') as MarketingState['aspect'], templateId: opt.tpl, theme: 'tech_dark', layoutMode: opt.layout || 'full_photo', selected: 'launch', outputLanguage: 'preserve', storyPage: 0, storyPerPage: 3, facts: [], copies: s?.copies || { launch: { ...EMPTY }, story: { ...EMPTY }, action: { ...EMPTY } } } as MarketingState;
}

type Job = { id: string; label: string; aspect?: string; draw: (c: HTMLCanvasElement, imgs: Record<string, HTMLImageElement | null>) => void; needBg?: string };

const JOBS: Job[] = [
  { id: 'travel-full', label: 'Travel · full-photo', needBg: 'travel', draw: (c, i) => drawIndustryPoster(c, st('travel', 'service' as IndustryId, {}), 'launch', st('travel', 'service' as IndustryId, {}).copies.launch, null, i.travel, null) },
  { id: 'travel-matrix', label: 'Travel · matrix', needBg: 'travel', draw: (c, i) => drawIndustryPoster(c, st('travel', 'service' as IndustryId, { layout: 'matrix' }), 'story', st('travel', 'service' as IndustryId, {}).copies.story, null, i.travel, null) },
  { id: 'recruit-full', label: 'Recruitment · full-photo (HIRING)', needBg: 'recruitment', draw: (c, i) => drawIndustryPoster(c, st('recruitment', 'recruitment' as IndustryId, {}), 'launch', st('recruitment', 'recruitment' as IndustryId, {}).copies.launch, null, i.recruitment, null) },
  { id: 'recruit-matrix', label: 'Recruitment · matrix', needBg: 'recruitment', draw: (c, i) => drawIndustryPoster(c, st('recruitment', 'recruitment' as IndustryId, { layout: 'matrix' }), 'story', st('recruitment', 'recruitment' as IndustryId, {}).copies.story, null, i.recruitment, null) },
  { id: 'food-matrix', label: 'Food · matrix', needBg: 'food', draw: (c, i) => drawIndustryPoster(c, st('food', 'general' as IndustryId, { layout: 'matrix' }), 'story', st('food', 'general' as IndustryId, {}).copies.story, null, i.food, null) },
  { id: 'retail-full', label: 'Retail · full-photo', needBg: 'retail', draw: (c, i) => drawIndustryPoster(c, st('retail', 'general' as IndustryId, {}), 'launch', st('retail', 'general' as IndustryId, {}).copies.launch, null, i.retail, null) },
  { id: 'tpl-magazine', label: 'Template · magazine', needBg: 'travel', draw: (c, i) => drawIndustryPoster(c, st('travel', 'service' as IndustryId, { tpl: 'magazine' }), 'launch', st('travel', 'service' as IndustryId, {}).copies.launch, null, i.travel, null) },
  { id: 'tpl-editorial', label: 'Template · editorial', needBg: 'beauty', draw: (c, i) => drawIndustryPoster(c, st('beauty', 'service' as IndustryId, { tpl: 'editorial' }), 'launch', st('beauty', 'service' as IndustryId, {}).copies.launch, null, i.beauty, null) },
  { id: 'banner-studio', label: 'Banner · studio', draw: (c) => drawProductBanner(c, { size: 'square', bgStyle: 'studio', headline: 'GIÁ SỐC HÔM NAY', price: '199.000đ', oldPrice: '299.000đ', saleTag: 'MUA 1 TẶNG 1', cta: 'CHỐT ĐƠN NGAY', brandName: 'MIVY', colorPrimary: '#0f172a', colorAccent: '#6366f1', fontHeadingId: 'be-vietnam', fontBodyId: 'be-vietnam' }) },
  { id: 'banner-grad', label: 'Banner · gradient', draw: (c) => drawProductBanner(c, { size: 'post', bgStyle: 'gradient', headline: 'SĂN DEAL CHỐT ĐƠN', price: '249.000đ', oldPrice: '399.000đ', saleTag: 'GIẢM 40%', cta: 'INBOX GIÁ TỐT', brandName: 'MIVY', colorPrimary: '#0f172a', colorAccent: '#e11d48', fontHeadingId: 'be-vietnam', fontBodyId: 'be-vietnam' }) },
  { id: 'menu', label: 'Menu · elegant', draw: (c) => drawPriceList(c, { title: 'MENU', brandName: 'NAMI COFFEE', contact: '0909 123 456 · 12 Lê Lợi', style: 'elegant', aspect: '4:5', colorPrimary: '#2b2219', colorAccent: '#b4703a', fontHeadingId: 'be-vietnam', fontBodyId: 'be-vietnam', items: [{ name: 'Cà phê sữa đá', price: '25.000đ', desc: 'Đậm vị, pha phin' }, { name: 'Bạc xỉu', price: '30.000đ' }, { name: 'Trà đào cam sả', price: '35.000đ', desc: 'Giải nhiệt' }, { name: 'Bánh mì chảo', price: '45.000đ' }, { name: 'Matcha latte', price: '40.000đ' }] }) },
  { id: 'cover', label: 'Bìa FB · elegant', draw: (c) => drawBrandAsset(c, { kind: 'fb', coverTemplate: 'elegant', style: 'gradient', colorPrimary: '#14281f', colorSecondary: '#14281f', colorAccent: '#b4703a', brandName: 'NAMI COFFEE', slogan: 'Cà phê rang xay mỗi sáng', contact: '0909 · 12 Lê Lợi, Q1', badge: 'KHAI TRƯƠNG', usps: ['Rang mộc', 'Nguyên chất', 'Giao nhanh'], fontHeadingId: 'be-vietnam', fontBodyId: 'be-vietnam' }) },
  { id: 'merch', label: 'Áo thun', draw: (c, i) => drawMerch(c, { item: 'tshirt', productColor: '#1f2937', bgColor: '#f4f4f5', brandName: 'MIVY', slogan: 'Since 2024', accent: '#6366f1', fontHeadingId: 'be-vietnam', contact: '', mode: 'photo', mockupImg: i.tshirt }) },
  // ===== Khổ 9:16 (story/reels) =====
  { id: 'travel-full-916', label: 'Travel · full-photo · 9:16', needBg: 'travel', draw: (c, i) => drawIndustryPoster(c, st('travel', 'service' as IndustryId, { aspect: '9:16' }), 'launch', st('travel', 'service' as IndustryId, {}).copies.launch, null, i.travel, null) },
  { id: 'travel-matrix-916', label: 'Travel · matrix · 9:16', needBg: 'travel', draw: (c, i) => drawIndustryPoster(c, st('travel', 'service' as IndustryId, { layout: 'matrix', aspect: '9:16' }), 'story', st('travel', 'service' as IndustryId, {}).copies.story, null, i.travel, null) },
  { id: 'retail-full-916', label: 'Retail · full-photo · 9:16', needBg: 'retail', draw: (c, i) => drawIndustryPoster(c, st('retail', 'general' as IndustryId, { aspect: '9:16' }), 'launch', st('retail', 'general' as IndustryId, {}).copies.launch, null, i.retail, null) },
  // ===== Khổ 1:1 (vuông) =====
  { id: 'travel-full-11', label: 'Travel · full-photo · 1:1', needBg: 'travel', draw: (c, i) => drawIndustryPoster(c, st('travel', 'service' as IndustryId, { aspect: '1:1' }), 'launch', st('travel', 'service' as IndustryId, {}).copies.launch, null, i.travel, null) },
  { id: 'food-matrix-11', label: 'Food · matrix · 1:1', needBg: 'food', draw: (c, i) => drawIndustryPoster(c, st('food', 'general' as IndustryId, { layout: 'matrix', aspect: '1:1' }), 'story', st('food', 'general' as IndustryId, {}).copies.story, null, i.food, null) },
  { id: 'retail-full-11', label: 'Retail · full-photo · 1:1', needBg: 'retail', draw: (c, i) => drawIndustryPoster(c, st('retail', 'general' as IndustryId, { aspect: '1:1' }), 'launch', st('retail', 'general' as IndustryId, {}).copies.launch, null, i.retail, null) },
  // ===== Ngành ít dùng (full-photo launch + matrix story) =====
  ...(['fitness', 'property', 'technology', 'education', 'event', 'personal'] as const).flatMap((cat) => ([
    { id: `${cat}-full`, label: `${cat} · full-photo`, needBg: cat, draw: (c: HTMLCanvasElement, i: Record<string, HTMLImageElement | null>) => drawIndustryPoster(c, st(cat, 'general' as IndustryId, {}), 'launch', st(cat, 'general' as IndustryId, {}).copies.launch, null, i[cat], null) },
    { id: `${cat}-matrix`, label: `${cat} · matrix`, needBg: cat, draw: (c: HTMLCanvasElement, i: Record<string, HTMLImageElement | null>) => drawIndustryPoster(c, st(cat, 'general' as IndustryId, { layout: 'matrix' }), 'story', st(cat, 'general' as IndustryId, {}).copies.story, null, i[cat], null) },
  ])),
  // ===== Template còn lại (data beauty + ảnh beauty) =====
  ...(['spotlight', 'billboard', 'agenda', 'portrait', 'banner-amber', 'sale-hot', 'sale-gold', 'minimal-dark', 'frame-emerald', 'frame-rose'] as const).map((tpl) => (
    { id: `tpl-${tpl}`, label: `Template · ${tpl}`, needBg: 'beauty', draw: (c: HTMLCanvasElement, i: Record<string, HTMLImageElement | null>) => drawIndustryPoster(c, st('beauty', 'service' as IndustryId, { tpl }), 'launch', st('beauty', 'service' as IndustryId, {}).copies.launch, null, i.beauty, null) }
  )),
  // ===== Brand-assets: 5 mẫu bìa FB =====
  ...(['burst', 'split', 'ribbon', 'minimal', 'brand'] as const).map((tpl) => (
    { id: `cover-${tpl}`, label: `Bìa FB · ${tpl}`, draw: (c: HTMLCanvasElement) => drawBrandAsset(c, { kind: 'fb', coverTemplate: tpl, style: 'gradient', colorPrimary: '#14281f', colorSecondary: '#14281f', colorAccent: '#b4703a', brandName: 'NAMI COFFEE', slogan: 'Cà phê rang xay mỗi sáng', contact: '0909 · 12 Lê Lợi, Q1', badge: 'GIẢM 30%', usps: ['Rang mộc', 'Nguyên chất', 'Giao nhanh'], fontHeadingId: 'be-vietnam', fontBodyId: 'be-vietnam' }) }
  )),
  // ===== Brand-assets: kind khác =====
  ...(['zalo', 'shopee', 'youtube', 'avatar'] as const).map((kind) => (
    { id: `kind-${kind}`, label: `Brand · ${kind}`, draw: (c: HTMLCanvasElement) => drawBrandAsset(c, { kind, coverTemplate: 'elegant', style: 'gradient', colorPrimary: '#14281f', colorSecondary: '#14281f', colorAccent: '#b4703a', brandName: 'NAMI COFFEE', slogan: 'Cà phê rang xay mỗi sáng', contact: '0909 · HCM', badge: 'GIẢM 30%', usps: ['Rang mộc', 'Nguyên chất', 'Giao nhanh'], fontHeadingId: 'be-vietnam', fontBodyId: 'be-vietnam' }) }
  )),
  // ===== Vật phẩm =====
  ...(['cap', 'mug', 'tote', 'box', 'tumbler'] as const).map((item) => (
    { id: `merch-${item}`, label: `Vật phẩm · ${item} (ảnh)`, draw: (c: HTMLCanvasElement, i: Record<string, HTMLImageElement | null>) => drawMerch(c, { item, productColor: '#1f2937', bgColor: '#f4f4f5', brandName: 'MIVY', slogan: 'Since 2024', accent: '#6366f1', fontHeadingId: 'be-vietnam', contact: '', mode: 'photo', mockupImg: i[item] }) }
  )),
  ...(['namecard', 'standee', 'phonecase'] as const).map((item) => (
    { id: `merchv-${item}`, label: `Vật phẩm · ${item} (vector)`, draw: (c: HTMLCanvasElement) => drawMerch(c, { item, productColor: '#1f2937', bgColor: '#f4f4f5', brandName: 'MIVY', slogan: 'Thương hiệu của bạn', accent: '#6366f1', fontHeadingId: 'be-vietnam', contact: '0909 123 456', mode: 'vector', mockupImg: null }) }
  )),
];

export default function ReviewPage() {
  const refs = useRef<Record<string, HTMLCanvasElement | null>>({});
  useEffect(() => {
    (async () => {
      const f = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts; if (f?.ready) await f.ready;
      const load = (u: string) => new Promise<HTMLImageElement | null>((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = u; });
      const imgs: Record<string, HTMLImageElement | null> = {};
      for (const cat of ['travel', 'recruitment', 'food', 'retail', 'beauty', 'fitness', 'property', 'technology', 'education', 'event', 'personal', 'service']) imgs[cat] = await load(`/backgrounds/${cat}/a.jpg`);
      for (const mk of ['tshirt', 'cap', 'mug', 'tote', 'box', 'tumbler']) imgs[mk] = await load(`/mockups/${mk}.jpg`);
      for (const j of JOBS) { const c = refs.current[j.id]; if (c) try { j.draw(c, imgs); } catch (e) { console.error(j.id, e); } }
      (window as unknown as { __ready?: boolean }).__ready = true;
    })();
  }, []);
  return (
    <div style={{ padding: 20, display: 'flex', flexWrap: 'wrap', gap: 20, background: '#0b0b10' }}>
      {JOBS.map((j) => (
        <div key={j.id} style={{ width: 380 }}>
          <div style={{ color: '#8a93a6', font: '12px sans-serif', marginBottom: 6 }}>{j.label}</div>
          <canvas id={j.id} ref={(el) => { refs.current[j.id] = el; }} style={{ width: 380, height: 'auto', border: '1px solid #222', borderRadius: 8, display: 'block' }} />
        </div>
      ))}
    </div>
  );
}
