'use client';

import Link from 'next/link';
import { Sparkles, Image as ImageIcon, BookmarkCheck, ArrowRight, Layers, Clock, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MarketingState } from '@/types';

export default function StudioDashboardPage() {
  const [draft, setDraft] = useState<MarketingState | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mivy-marketing-v1');
      if (raw) setDraft(JSON.parse(raw));
    } catch (e) {}
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="p-8 rounded-2xl glass-panel border border-emerald-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            KHÔNG GIAN SÁNG TẠO
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-3 mb-2">
            Chào mừng anh đến với Mivy Studio
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Bắt đầu tạo poster quảng cáo tuyển dụng, khóa học hoặc hình ảnh thương mại chỉ trong vài bước đơn giản với 0đ API.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/studio/marketing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Tạo Quảng Cáo Mới</span>
            </Link>
            <Link
              href="/studio/image"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl glass-card text-white font-semibold text-sm hover:bg-white/10 transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span>Tạo Ảnh AI</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/studio/marketing"
          className="glass-card p-6 rounded-2xl group hover:border-emerald-500/50 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1.5">Tạo Quảng Cáo & Poster</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Tự động tạo trọn bộ 3 poster (Hero, Tiêu chí, Liên hệ) kèm bảng ma trận JD và caption chuẩn chỉnh.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-xs font-bold text-emerald-400 gap-1.5">
            <span>Bắt đầu tạo</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/studio/image"
          className="glass-card p-6 rounded-2xl group hover:border-blue-500/50 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mb-4 text-blue-400 group-hover:scale-110 transition-transform">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1.5">Tạo Ảnh AI Độc Lập</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Thử nghiệm tạo ảnh nghệ thuật, phối cảnh studio và phong cách thương mại theo prompt tùy chọn.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-xs font-bold text-blue-400 gap-1.5">
            <span>Mở công cụ</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/studio/drafts"
          className="glass-card p-6 rounded-2xl group hover:border-amber-500/50 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400 group-hover:scale-110 transition-transform">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1.5">Chiến Dịch Đã Lưu</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Quản lý các bản nháp poster, nội dung caption và bản sao lưu trên trình duyệt của anh.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center text-xs font-bold text-amber-400 gap-1.5">
            <span>Xem chiến dịch</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Current Draft Snippet */}
      {draft && (
        <div className="p-6 rounded-2xl glass-panel border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white">Bản nháp đang mở gần đây</span>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 uppercase">
              {draft.industry}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-white text-base">{draft.name || 'Chiến dịch chưa đặt tên'}</p>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                {draft.details || 'Chưa có thông tin mô tả.'}
              </p>
            </div>
            <Link
              href="/studio/marketing"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-emerald-500 hover:text-slate-950 text-white text-xs font-bold transition-all"
            >
              <span>Mở lại chiến dịch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
