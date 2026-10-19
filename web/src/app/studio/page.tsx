'use client';

import Link from 'next/link';
import { Sparkles, Image as ImageIcon, BookmarkCheck, ArrowRight, Clock, Wand2, ListOrdered, Package, PanelTop, ShoppingBag, Palette } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MarketingState } from '@/types';

const TOOLS = [
  { href: '/studio/product', icon: Wand2, name: 'Banner sản phẩm', desc: '1 ảnh → tách nền → bộ banner đúng khổ mọi sàn.', c: '#818cf8' },
  { href: '/studio/marketing', icon: Sparkles, name: 'Tạo quảng cáo', desc: 'Bộ 3 poster Hero · Tiêu chí · Liên hệ + caption.', c: '#c084fc' },
  { href: '/studio/pricelist', icon: ListOrdered, name: 'Bảng giá / Menu', desc: 'Điền món & giá → bảng giá đẹp để đăng, in.', c: '#38bdf8' },
  { href: '/studio/brandpack', icon: Package, name: 'Bộ nhận diện', desc: 'Logo, avatar, bìa, name card, áo, ly — 1 lần.', c: '#f472b6' },
  { href: '/studio/brand-assets', icon: PanelTop, name: 'Bìa & Avatar', desc: 'Bìa FB/Zalo/Shopee/YouTube + avatar.', c: '#34d399' },
  { href: '/studio/merch', icon: ShoppingBag, name: 'Vật phẩm', desc: 'In logo lên áo, nón, ly, túi… ảnh thật.', c: '#fbbf24' },
  { href: '/studio/brand', icon: Palette, name: 'Thương hiệu', desc: 'Brand Kit: màu, font, logo, slogan, liên hệ.', c: '#a78bfa' },
  { href: '/studio/image', icon: ImageIcon, name: 'Tạo ảnh', desc: 'Tạo ảnh sản phẩm/nghệ thuật theo mô tả.', c: '#22d3ee' },
  { href: '/studio/drafts', icon: BookmarkCheck, name: 'Chiến dịch', desc: 'Bản nháp & nội dung đã lưu trên máy.', c: '#94a3b8' },
];

const STATS = ['0đ chi phí API', '9 công cụ', 'Đúng khổ mọi sàn', 'Xuất PNG · ZIP'];

export default function StudioDashboardPage() {
  const [draft, setDraft] = useState<MarketingState | null>(null);
  useEffect(() => {
    try { const raw = localStorage.getItem('mivy-marketing-v1'); if (raw) setDraft(JSON.parse(raw)); } catch {}
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden glass-card hover:!transform-none p-8 lg:p-10">
        <div className="absolute -top-24 -right-20 w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -left-24 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="relative max-w-2xl">
          <span className="mv-label">Mivy Studio</span>
          <h1 className="text-3xl lg:text-[36px] font-extrabold tracking-tight mt-2.5 mb-3 bg-gradient-to-r from-white via-white to-indigo-200 bg-clip-text text-transparent">Mọi thứ người bán cần,<br />trong một studio.</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-lg">Tạo banner sản phẩm, bộ nhận diện, bảng giá, poster quảng cáo… đúng chuẩn từng sàn — nhanh, đẹp, 0đ chi phí.</p>
          <div className="flex items-center gap-3">
            <Link href="/studio/product" className="mv-btn mv-btn-primary"><Wand2 className="w-4 h-4" /> Tạo banner sản phẩm</Link>
            <Link href="/studio/brandpack" className="mv-btn mv-btn-ghost"><Package className="w-4 h-4" /> Bộ nhận diện</Link>
          </div>
          <div className="flex flex-wrap gap-2 mt-7">
            {STATS.map((s) => (
              <span key={s} className="text-[11px] font-semibold text-slate-300 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10">{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent draft */}
      {draft && (
        <Link href="/studio/marketing" className="glass-card p-4 flex items-center justify-between gap-4 group">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 shrink-0"><Clock className="w-5 h-5" /></span>
            <div className="min-w-0">
              <p className="text-[11px] mv-label">Mở lại gần đây</p>
              <p className="font-semibold text-white truncate">{draft.name || 'Chiến dịch chưa đặt tên'}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
        </Link>
      )}

      {/* Tools grid */}
      <div>
        <div className="mv-label mb-3">Công cụ</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mv-stagger">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.href} href={t.href} className="glass-card p-5 group flex flex-col">
                <span className="grid place-items-center w-11 h-11 rounded-xl mb-4 transition-transform group-hover:scale-110" style={{ background: `${t.c}22`, border: `1px solid ${t.c}55`, color: t.c }}>
                  <Icon className="w-[22px] h-[22px]" />
                </span>
                <h2 className="text-[15px] font-bold text-white mb-1">{t.name}</h2>
                <p className="text-slate-400 text-xs leading-relaxed flex-1">{t.desc}</p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold" style={{ color: t.c }}>
                  <span>Mở</span><ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
