import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Wand2, FileCheck2, Package, Tag, MessageCircle, Printer } from 'lucide-react';
import { NICHES } from '@/lib/landingNiches';
import { CatalogBrowser } from '@/components/CatalogBrowser';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mivy.vn';

export const metadata: Metadata = {
  title: 'In theo nhu cầu — tem nhãn, thiệp, lịch Tết | Mivy',
  description:
    'Chọn đúng thứ bạn cần in: tem nước hoa, tem nhãn F&B, thiệp tất niên, lịch Tết. Tự thiết kế từ mẫu đẹp, xuất file in chuẩn, nhận đơn lẻ, báo giá ngay.',
  keywords: ['in tem nhãn', 'in theo yêu cầu', 'thiết kế file in', 'in số lượng ít', 'in nhanh', ...NICHES.flatMap((n) => n.keywords)],
  alternates: { canonical: `${siteUrl}/in` },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: `${siteUrl}/in`,
    siteName: 'Mivy',
    title: 'In theo nhu cầu — tem nhãn, thiệp, lịch Tết | Mivy',
    description: 'Tự thiết kế từ mẫu đẹp → file in chuẩn → nhận đơn lẻ, giao nhanh. Chọn đúng nhu cầu của bạn.',
  },
};

export default function InHubPage() {
  const mivyZalo = process.env.NEXT_PUBLIC_MIVY_ZALO || '';
  const zaloHref = mivyZalo ? `https://zalo.me/${mivyZalo}` : '';

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 glass-panel border-b border-mv-hair px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-mv-accent text-white font-extrabold text-lg">M</span>
            <span className="text-lg font-black tracking-tight text-mv-fg">mivy</span>
          </Link>
          <Link href="/studio" className="mv-btn mv-btn-primary">Vào Studio <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-20 pb-12 px-6 overflow-hidden">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[680px] h-[460px] bg-indigo-500/18 rounded-full blur-[150px] pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ink/[0.03] border border-mv-hair text-slate-200 text-[13px] font-semibold mb-6">
              <Tag className="w-4 h-4 text-indigo-300" />
              <span>In theo nhu cầu · thiết kế miễn phí, chỉ tính tiền in</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1] mb-5 text-mv-fg">
              Bạn cần in gì?
            </h1>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Chọn đúng thứ bạn cần. Mỗi loại có mẫu đẹp để tự chỉnh, xuất file in chuẩn, nhận đơn lẻ và báo giá ngay — không cần biết thiết kế.
            </p>
          </div>
        </section>

        {/* Catalog đầy đủ — tìm kiếm + lọc ngành */}
        <section className="pb-8">
          <CatalogBrowser />
        </section>

        {/* Trang ngách nổi bật (SEO) */}
        <section className="pb-4 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="mv-label mb-3">Ngách nổi bật</div>
            <div className="flex flex-wrap gap-2.5">
              {NICHES.map((n) => (
                <Link key={n.slug} href={`/in/${n.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-mv-hair bg-ink/[0.03] px-4 py-2 text-sm font-semibold text-slate-300 hover:text-mv-fg hover:border-indigo-400/60 transition-colors">
                  {n.product}
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-300" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Vì sao */}
        <section className="py-14 px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: FileCheck2, title: 'File in chuẩn', desc: 'Bleed, vạch cắt, CMYK, outline chữ, DPI ≥300 — xưởng nhận in liền.' },
              { icon: Package, title: 'Nhận đơn lẻ', desc: 'Không ép số lượng lớn. In vài chục chiếc vẫn làm.' },
              { icon: Wand2, title: 'Tự thiết kế free', desc: 'Chọn mẫu, điền nội dung — không cần biết thiết kế, không tốn phí.' },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className="glass-card p-7">
                  <span className="grid place-items-center w-12 h-12 rounded-xl mb-5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300"><Icon className="w-6 h-6" /></span>
                  <h3 className="text-lg font-bold text-mv-fg mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="pb-16 px-6">
          <div className="max-w-4xl mx-auto glass-card hover:!transform-none p-10 sm:p-12 text-center relative overflow-hidden">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
            <h2 className="text-2xl sm:text-4xl font-black mb-4 relative z-10 text-mv-fg">Không thấy thứ cần in?</h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto mb-7 relative z-10">
              Gửi yêu cầu riêng — có file sẵn, hộp giấy, standee, tem dán kiểu khác — Mivy vẫn nhận.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
              <Link href="/studio/print-custom" className="mv-btn mv-btn-primary !px-7 !py-3.5"><Printer className="w-5 h-5" /> Đặt in theo yêu cầu</Link>
              {zaloHref && (
                <a href={zaloHref} target="_blank" rel="noopener noreferrer" className="mv-btn mv-btn-ghost !px-7 !py-3.5"><MessageCircle className="w-5 h-5 text-indigo-300" /> Nhắn Zalo</a>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-mv-hair py-8 px-6 text-sm text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-6 h-6 rounded-md bg-mv-accent text-white font-extrabold text-xs">M</span>
            <span className="font-bold text-mv-fg">mivy</span>
            <span>· web thiết kế miễn phí + dịch vụ in</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/studio/print-custom" className="hover:text-mv-fg transition-colors">Đặt in theo yêu cầu</Link>
            {zaloHref && <a href={zaloHref} target="_blank" rel="noopener noreferrer" className="hover:text-mv-fg transition-colors inline-flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> Zalo</a>}
            <p>© {new Date().getFullYear()} Mivy</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
