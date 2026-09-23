'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookmarkCheck, Trash2, ArrowRight, Clock, FileText } from 'lucide-react';
import { MarketingState } from '@/types';

export default function DraftsPage() {
  const [draft, setDraft] = useState<MarketingState | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mivy-marketing-v1');
      if (raw) setDraft(JSON.parse(raw));
    } catch (e) {}
  }, []);

  const handleDelete = () => {
    if (!confirm('Anh có chắc muốn xóa bản nháp này không?')) return;
    localStorage.removeItem('mivy-marketing-v1');
    setDraft(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
          CHIẾN DỊCH
        </span>
        <h1 className="text-2xl font-black text-white mt-2">Bản Nháp Chiến Dịch Đã Lưu</h1>
        <p className="text-slate-400 text-xs mt-1">
          Các nội dung quảng cáo và bản phác thảo được lưu an toàn trực tiếp trên trình duyệt của anh.
        </p>
      </div>

      {draft ? (
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-400 uppercase">
                {draft.industry}
              </span>
              <h2 className="text-xl font-bold text-white mt-2">{draft.name || 'Chiến dịch chưa đặt tên'}</h2>
              <p className="text-xs text-slate-400 mt-1">Thương hiệu: {draft.brand || 'Mivy'}</p>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Xóa bản nháp"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
            {draft.details}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Được lưu trên trình duyệt</span>
            </span>

            <Link
              href="/studio/marketing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
            >
              <span>Mở lại chiến dịch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-2xl border border-white/10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
            <BookmarkCheck className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white">Chưa có bản nháp nào được lưu</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Khi anh tạo và chỉnh sửa poster trong Studio, thông tin sẽ được tự động lưu lại tại đây.
          </p>
          <Link
            href="/studio/marketing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
          >
            <span>Tạo chiến dịch mới</span>
          </Link>
        </div>
      )}
    </div>
  );
}
