'use client';
// Trang Giá/gói Mivy — Free / Pro. Chốt tính năng chặn ở Free.
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Check, X, Sparkles, Store } from 'lucide-react';

type Cycle = 'month' | 'year';

const PRO_MONTH = 99000;
const PRO_YEAR = 890000; // ~74k/tháng, tiết kiệm ~25%

const vnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';

// Danh sách tính năng so sánh Free vs Pro
const ROWS: { label: string; free: string | boolean; pro: string | boolean }[] = [
  { label: 'Banner sản phẩm (tách nền, ghép giá, sale tag)', free: true, pro: true },
  { label: 'Bảng giá / Menu', free: true, pro: true },
  { label: 'Lưu Brand Kit', free: '1 bộ', pro: 'Không giới hạn' },
  { label: 'Xuất không logo chìm “mivy”', free: false, pro: true },
  { label: 'Tải cả bộ banner đa sàn (ZIP)', free: false, pro: true },
  { label: 'Bộ nhận diện trọn gói (logo, bìa, name card, áo, ly, túi)', free: false, pro: true },
  { label: 'Vật phẩm ảnh thật (áo, nón, ly, túi…)', free: false, pro: true },
  { label: 'Toàn bộ mẫu · màu · font', free: 'Cơ bản', pro: 'Đầy đủ' },
  { label: 'Tính năng mới ưu tiên (video ngắn sắp ra)', free: false, pro: true },
];

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>('year');
  const proPrice = cycle === 'month' ? PRO_MONTH : Math.round(PRO_YEAR / 12);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/[0.07] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 text-white font-black text-sm shadow-lg shadow-indigo-500/30">M</span>
            <span className="text-xl font-black tracking-tight text-white">mivy</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-medium">
            <Link href="/" className="hover:text-white transition-colors">Trang chủ</Link>
            <Link href="/pricing" className="text-white">Giá</Link>
            <Link href="/studio" className="hover:text-white transition-colors">Studio</Link>
          </nav>
          <Link href="/studio" className="mv-btn mv-btn-primary">Vào Studio <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-20 pb-10 px-6 overflow-hidden text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[420px] bg-indigo-500/15 rounded-full blur-[130px] pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-200 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Mọi thứ render bằng code · 0đ chi phí API
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-[1.1] mb-4">
              Giá đơn giản,<br />dùng được ngay
            </h1>
            <p className="text-slate-400 text-base max-w-lg mx-auto">
              Bắt đầu miễn phí. Lên Pro khi cần tải trọn bộ banner đa sàn và bộ nhận diện để bán hàng chuyên nghiệp.
            </p>

            {/* Toggle tháng/năm */}
            <div className="inline-flex items-center gap-2 mt-8">
              <div className="mv-seg">
                <button onClick={() => setCycle('month')} data-active={cycle === 'month'} className="mv-seg-btn">Theo tháng</button>
                <button onClick={() => setCycle('year')} data-active={cycle === 'year'} className="mv-seg-btn">Theo năm</button>
              </div>
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">Tiết kiệm 25%</span>
            </div>
          </div>
        </section>

        {/* Plan cards */}
        <section className="px-6 pb-16">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-5 items-stretch">
            {/* Free */}
            <div className="glass-card p-7 flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <Store className="w-4 h-4 text-slate-400" />
                <h2 className="text-lg font-bold text-white">Dùng thử</h2>
              </div>
              <p className="text-sm text-slate-400 mb-5">Làm quen, xuất thử thiết kế đầu tiên.</p>
              <div className="mb-6">
                <span className="text-4xl font-black text-white">0đ</span>
                <span className="text-slate-500 text-sm"> / mãi mãi</span>
              </div>
              <Link href="/studio" className="mv-btn mv-btn-ghost w-full justify-center mb-6">Bắt đầu miễn phí</Link>
              <ul className="space-y-3 text-sm">
                {ROWS.map((r) => (
                  <li key={r.label} className="flex items-start gap-2.5">
                    {r.free ? <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" /> : <X className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />}
                    <span className={r.free ? 'text-slate-300' : 'text-slate-600 line-through'}>
                      {r.label}{typeof r.free === 'string' && <span className="text-slate-500"> · {r.free}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div className="glass-card p-7 flex flex-col relative border-indigo-500/40 ring-1 ring-indigo-500/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/40">PHỔ BIẾN</div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-indigo-300" />
                <h2 className="text-lg font-bold text-white">Pro</h2>
              </div>
              <p className="text-sm text-slate-400 mb-5">Cho shop bán hàng nghiêm túc, cần bộ hình chuyên nghiệp.</p>
              <div className="mb-1 flex items-end gap-1.5">
                <span className="text-4xl font-black text-white">{vnd(proPrice)}</span>
                <span className="text-slate-500 text-sm mb-1">/ tháng</span>
              </div>
              <p className="text-[12px] text-slate-500 mb-6 h-4">
                {cycle === 'year' ? `Thanh toán ${vnd(PRO_YEAR)}/năm` : 'Huỷ bất cứ lúc nào'}
              </p>
              <Link href="/studio" className="mv-btn mv-btn-primary w-full justify-center mb-6">Nâng cấp Pro <ArrowRight className="w-4 h-4" /></Link>
              <ul className="space-y-3 text-sm">
                {ROWS.map((r) => (
                  <li key={r.label} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span className="text-slate-200">
                      {r.label}{typeof r.pro === 'string' && <span className="text-indigo-300"> · {r.pro}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-center text-[12px] text-slate-500 mt-6 max-w-md mx-auto">
            Giá áp dụng cho 1 shop. Thanh toán, hoá đơn và cổng nâng cấp sẽ bật khi mở bán — hiện anh dùng full tính năng để trải nghiệm.
          </p>
        </section>

        {/* FAQ ngắn */}
        <section className="px-6 pb-24">
          <div className="max-w-2xl mx-auto space-y-3">
            {[
              { q: 'Free có bị giới hạn thời gian không?', a: 'Không. Gói Dùng thử miễn phí mãi mãi — chỉ khác Pro ở vài tính năng xuất hàng loạt và không logo chìm.' },
              { q: 'Vì sao rẻ hơn nhiều so với công cụ khác?', a: 'Mivy render mọi thứ bằng code ngay trên trình duyệt, không gọi AI theo từng request nên chi phí vận hành gần 0đ.' },
              { q: 'Dữ liệu ảnh của tôi có bị gửi lên server không?', a: 'Tách nền & dựng banner chạy ngay trong trình duyệt của anh. Ảnh không rời máy anh.' },
            ].map((f) => (
              <details key={f.q} className="glass-card p-5 group">
                <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-semibold text-white">
                  {f.q}
                  <span className="text-slate-500 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                </summary>
                <p className="text-sm text-slate-400 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.07] py-8 px-6 text-center text-sm text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-bold text-white">mivy</span>
          <p>© {new Date().getFullYear()} Mivy · Công cụ thiết kế bán hàng cho shop Việt.</p>
        </div>
      </footer>
    </div>
  );
}
