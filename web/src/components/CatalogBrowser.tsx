'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search, ArrowRight, Wand2, FileUp, X,
  Tag, Package, FileText, List, Megaphone, Heart, Sparkles, Gift, type LucideIcon,
} from 'lucide-react';
import { CATEGORIES, PRODUCTS, filterProducts, type CatalogProduct } from '@/lib/product-catalog';

const CAT_ICON: Record<string, LucideIcon> = {
  tag: Tag, package: Package, file: FileText, list: List, megaphone: Megaphone, heart: Heart, gift: Gift, sparkles: Sparkles,
};

function ProductCard({ p }: { p: CatalogProduct }) {
  const studio = p.mode === 'studio';
  return (
    <Link href={p.href} className="glass-card p-4 sm:p-5 flex flex-col group" data-testid="catalog-card" data-product={p.id}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="text-[15px] font-bold text-mv-fg leading-snug group-hover:text-indigo-300 transition-colors">{p.name}</h3>
        {p.tag && (
          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">{p.tag}</span>
        )}
      </div>
      <p className="text-[13px] text-slate-400 leading-relaxed flex-1">{p.blurb}</p>
      <span className={`mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold ${studio ? 'text-indigo-300' : 'text-slate-300'}`}>
        {studio ? <Wand2 className="w-3.5 h-3.5" /> : <FileUp className="w-3.5 h-3.5" />}
        {studio ? 'Tự thiết kế' : 'Gửi mẫu / yêu cầu'}
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </span>
    </Link>
  );
}

export function CatalogBrowser() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);

  const results = useMemo(() => filterProducts(q, cat), [q, cat]);
  const searching = q.trim().length > 0 || cat !== null;

  return (
    <div className="max-w-5xl mx-auto px-6">
      {/* Thanh tìm kiếm */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm nhanh: hộp, tem, menu, standee, thiệp…"
          className="mv-input !pl-12 !pr-10 !py-3.5 !text-base w-full"
          data-testid="catalog-search"
          aria-label="Tìm sản phẩm cần in"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label="Xoá tìm kiếm" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-mv-fg">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Chip lọc ngành */}
      <div className="flex flex-wrap gap-2 mb-8" data-testid="catalog-chips">
        <button
          type="button" onClick={() => setCat(null)}
          className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${cat === null ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:text-mv-fg'}`}
        >
          Tất cả
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id} type="button" onClick={() => setCat(cat === c.id ? null : c.id)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${cat === c.id ? 'border-indigo-400 bg-indigo-500/15 text-mv-fg' : 'border-mv-hair text-slate-300 hover:text-mv-fg'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {searching ? (
        // Chế độ tìm kiếm/lọc: lưới phẳng
        results.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="catalog-results">
            {results.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        ) : (
          <div className="glass-card p-10 text-center">
            <p className="text-slate-300 font-semibold mb-1">Chưa thấy “{q}” trong danh mục.</p>
            <p className="text-sm text-slate-400 mb-5">Thứ gì in được Mivy cũng nhận — gửi yêu cầu riêng kèm ảnh mẫu nhé.</p>
            <Link href={`/studio/print-custom?need=${encodeURIComponent(q)}`} className="mv-btn mv-btn-primary !inline-flex"><FileUp className="w-4 h-4" /> Gửi yêu cầu “{q || 'của bạn'}”</Link>
          </div>
        )
      ) : (
        // Chế độ duyệt: nhóm theo ngành
        <div className="space-y-12">
          {CATEGORIES.map((c) => {
            const items = PRODUCTS.filter((p) => p.cat === c.id);
            if (!items.length) return null;
            const Icon = CAT_ICON[c.icon] || Tag;
            return (
              <section key={c.id} data-testid="catalog-section" data-cat={c.id}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="grid place-items-center w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 shrink-0"><Icon className="w-5 h-5" /></span>
                  <div>
                    <h2 className="text-lg font-extrabold text-mv-fg leading-tight">{c.label}</h2>
                    <p className="text-[13px] text-slate-400">{c.blurb}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((p) => <ProductCard key={p.id} p={p} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
