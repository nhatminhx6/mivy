import type { ComponentType } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  FileCheck2,
  Package,
  Zap,
  Tag,
  Palette,
  Ruler,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Printer,
  MessageCircle,
  Wand2,
} from 'lucide-react';
import { NICHES, NICHE_SLUGS, getNiche, type IconKey } from '@/lib/landingNiches';

const ICONS: Record<IconKey, ComponentType<{ className?: string }>> = {
  file: FileCheck2,
  small: Package,
  fast: Zap,
  price: Tag,
  palette: Palette,
  ruler: Ruler,
  layers: Layers,
  shield: ShieldCheck,
};

export function generateStaticParams() {
  return NICHE_SLUGS.map((niche) => ({ niche }));
}

export function generateMetadata({ params }: { params: { niche: string } }): Metadata {
  const niche = getNiche(params.niche);
  if (!niche) return {};
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mivy.vn';
  const url = `${siteUrl}/in/${niche.slug}`;
  return {
    title: niche.metaTitle,
    description: niche.metaDescription,
    keywords: niche.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: 'vi_VN',
      url,
      siteName: 'Mivy',
      title: niche.metaTitle,
      description: niche.metaDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: niche.metaTitle,
      description: niche.metaDescription,
    },
  };
}

export default function NicheLandingPage({ params }: { params: { niche: string } }) {
  const niche = getNiche(params.niche);
  if (!niche) notFound();

  const mivyZalo = process.env.NEXT_PUBLIC_MIVY_ZALO || '';
  const zaloHref = mivyZalo ? `https://zalo.me/${mivyZalo}` : '';

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: niche.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Nav */}
      <header className="sticky top-0 z-50 glass-panel border-b border-mv-hair px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-mv-accent text-white font-extrabold text-lg">M</span>
            <span className="text-lg font-black tracking-tight text-mv-fg">mivy</span>
          </Link>
          <Link href={niche.studioHref} className="mv-btn mv-btn-primary">
            Tự thiết kế <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-20 pb-16 px-6 overflow-hidden">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[680px] h-[520px] bg-indigo-500/18 rounded-full blur-[150px] pointer-events-none" />
          <div className="absolute top-[20%] right-[6%] w-[360px] h-[360px] bg-fuchsia-500/12 rounded-full blur-[130px] pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center relative z-10 mv-stagger">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ink/[0.03] border border-mv-hair text-slate-200 text-[13px] font-semibold mb-7">
              <Wand2 className="w-4 h-4 text-indigo-300" />
              <span>{niche.eyebrow} · tự thiết kế miễn phí</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.1] mb-6 text-mv-fg">
              {niche.h1}
            </h1>
            <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-9 leading-relaxed">
              {niche.tagline}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link href={niche.studioHref} className="mv-btn mv-btn-primary !px-7 !py-3.5 !text-[15px]">
                <Wand2 className="w-5 h-5" /> {niche.ctaDesign} <ArrowRight className="w-4 h-4" />
              </Link>
              {niche.slug === 'tem-nhan-fnb' && (
                <Link href="/studio/label" className="mv-btn mv-btn-ghost !px-7 !py-3.5 !text-[15px]">
                  Thiết kế nhãn chai / hũ
                </Link>
              )}
              {zaloHref && (
                <a href={zaloHref} target="_blank" rel="noopener noreferrer" className="mv-btn mv-btn-ghost !px-7 !py-3.5 !text-[15px]">
                  <MessageCircle className="w-5 h-5 text-indigo-300" /> Gửi nhu cầu qua Zalo
                </a>
              )}
            </div>
            {niche.slug === 'tem-nhan-fnb' && (
              <Link href="/studio/print-custom" className="mt-5 inline-block text-sm font-semibold text-indigo-300 hover:underline">
                Có mẫu sẵn? Gửi yêu cầu in
              </Link>
            )}
            <div className="mt-12 pt-8 border-t border-mv-hair grid grid-cols-2 sm:grid-cols-4 gap-5 text-slate-400 text-[13px]">
              {['Chọn mẫu có sẵn', 'Thêm logo của bạn', 'Xem trước thiết kế', 'Gửi yêu cầu in'].map((t) => (
                <div key={t} className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-300" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pains → giải pháp */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="mv-label mb-2">Vì sao in {niche.product} ở Mivy</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-mv-fg">Gỡ đúng chỗ khổ nhất khi đi in</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mv-stagger">
              {niche.pains.map((p) => {
                const Icon = ICONS[p.icon];
                return (
                  <article key={p.title} className="glass-card p-7 flex gap-5">
                    <span className="grid place-items-center w-12 h-12 shrink-0 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                      <Icon className="w-6 h-6" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-mv-fg mb-2">{p.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{p.desc}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Thông số */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="mv-label mb-2">Thông số</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-mv-fg">Làm được những gì</h2>
            </div>
            <div className="glass-card !p-0 overflow-hidden">
              <dl className="divide-y divide-mv-hair">
                {niche.specs.map((s) => (
                  <div key={s.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 p-5">
                    <dt className="sm:w-56 shrink-0 font-semibold text-mv-fg flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-indigo-300" /> {s.label}
                    </dt>
                    <dd className="text-slate-400">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Các bước */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="mv-label mb-2">Chỉ 4 bước</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-mv-fg">Từ ý tưởng đến file in trong 5 phút</h2>
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-4 gap-5 mv-stagger">
              {niche.steps.map((step, i) => (
                <li key={i} className="glass-card p-6">
                  <span className="grid place-items-center w-9 h-9 rounded-full bg-mv-accent text-white font-extrabold text-sm mb-4">
                    {i + 1}
                  </span>
                  <p className="text-slate-300 text-sm leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="mv-label mb-2">Hỏi đáp</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-mv-fg">Câu hỏi thường gặp</h2>
            </div>
            <div className="space-y-4 mv-stagger">
              {niche.faqs.map((faq) => (
                <article key={faq.q} className="glass-card p-6">
                  <h3 className="text-[15px] font-bold text-mv-fg mb-2 flex items-start gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-indigo-500/20 text-indigo-300 grid place-items-center text-xs font-bold mt-0.5">Q</span>
                    <span>{faq.q}</span>
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed pl-9">{faq.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto glass-card hover:!transform-none p-10 sm:p-14 text-center relative overflow-hidden">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
            <h2 className="text-3xl sm:text-5xl font-black mb-5 relative z-10 text-mv-fg">
              Thiết kế miễn phí, bắt đầu ngay
            </h2>
            <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto mb-8 relative z-10">
              Không cài đặt, không thẻ thanh toán. Chọn mẫu, điền nội dung, có file in chuẩn — rồi quyết đặt in hay không.
            </p>
            <Link href={niche.studioHref} className="mv-btn mv-btn-primary !px-8 !py-4 !text-base relative z-10">
              <Wand2 className="w-5 h-5" /> {niche.ctaDesign} <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-slate-400 text-sm mt-6 relative z-10">
              Cần in kiểu khác —{' '}
              <Link href="/studio/print-custom" className="text-indigo-300 font-semibold hover:underline inline-flex items-center gap-1">
                <Printer className="w-4 h-4" /> Đặt in theo yêu cầu
              </Link>
              {zaloHref && (
                <>
                  {' · '}
                  <a href={zaloHref} target="_blank" rel="noopener noreferrer" className="text-indigo-300 font-semibold hover:underline inline-flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" /> Nhắn Zalo
                  </a>
                </>
              )}
            </p>
          </div>
        </section>

        {/* Các niche khác — liên kết nội bộ cho SEO */}
        <section className="pb-16 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-xs uppercase tracking-wider text-slate-500 mb-4">Mivy cũng nhận in</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {NICHES.filter((n) => n.slug !== niche.slug).map((n) => (
                <Link
                  key={n.slug}
                  href={`/in/${n.slug}`}
                  className="px-4 py-2 rounded-full border border-mv-hair text-slate-300 text-sm hover:text-mv-fg hover:border-indigo-500/40 transition-colors"
                >
                  {n.product}
                </Link>
              ))}
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
            {zaloHref && (
              <a href={zaloHref} target="_blank" rel="noopener noreferrer" className="hover:text-mv-fg transition-colors inline-flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" /> Zalo
              </a>
            )}
            <p>© {new Date().getFullYear()} Mivy</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
