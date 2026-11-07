import Link from 'next/link';
import { ArrowRight, Sparkles, Image as ImageIcon, Layers, ShieldCheck, CheckCircle2, Wand2, Printer, MessageCircle } from 'lucide-react';
import PosterShowcase from '@/components/PosterShowcase';

export default function HomePage() {
  const mivyZalo = process.env.NEXT_PUBLIC_MIVY_ZALO || '';
  const zaloHref = mivyZalo ? `https://zalo.me/${mivyZalo}` : '';
  const features = [
    { icon: Layers, c: '#818cf8', title: 'Bộ poster đồng bộ một ý', desc: 'Một chiến dịch ra trọn bộ: poster chính (Hero), tiêu chí chi tiết và kênh liên hệ — cùng tông, cùng nội dung, không lệch.' },
    { icon: ImageIcon, c: '#38bdf8', title: 'Đủ khổ, khỏi canh tay', desc: 'Xuất 1 lần ra đủ khổ vuông, dọc, Story — khỏi canh tay từng cái.' },
    { icon: ShieldCheck, c: '#34d399', title: 'Chữ Việt chuẩn, 0đ', desc: 'Render bằng code (Canvas) từ kho mẫu thiết kế sẵn: chữ tiếng Việt luôn sắc nét, không méo, không tốn phí API.' },
  ];

  const faqs = [
    { q: 'Mivy có tốn phí API không?', a: 'Không. Mivy render poster bằng CODE (Canvas) từ kho mẫu thiết kế gen sẵn, nên chi phí API bằng 0đ. AI chỉ dùng tối thiểu cho việc nhẹ như gợi ý câu chữ.' },
    { q: 'Chữ tiếng Việt có bị méo / sai dấu không?', a: 'Không. Chữ được vẽ trực tiếp bằng font tiếng Việt chuẩn (Be Vietnam Pro) ở độ phân giải 1080p, khắc phục hoàn toàn tình trạng chữ méo của các công cụ tạo ảnh AI thông thường.' },
    { q: 'Tôi có thể đưa ảnh của mình vào không?', a: 'Có. Tải ảnh sản phẩm, team hay văn phòng lên, Mivy tự căn tỷ lệ và đặt gọn vào khung trong poster.' },
    { q: 'Hỗ trợ những tỷ lệ nào?', a: 'Đủ 3 tỷ lệ phổ biến: Vuông 1:1 (1080×1080), Dọc 4:5 (1080×1350) cho Facebook/Instagram, và Story 9:16 (1080×1920) cho TikTok/Reels.' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 glass-panel border-b border-mv-hair px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-mv-accent text-white font-extrabold text-lg">M</span>
            <span className="text-lg font-black tracking-tight text-mv-fg">mivy</span>
            <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-bold">STUDIO</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-400 font-medium">
            <a href="#tinh-nang" className="hover:text-mv-fg transition-colors">Tính năng</a>
            <a href="#nganh" className="hover:text-mv-fg transition-colors">Theo ngành</a>
            <a href="#so-sanh" className="hover:text-mv-fg transition-colors">So sánh</a>
            <a href="#faq" className="hover:text-mv-fg transition-colors">Hỏi đáp</a>
          </nav>
          <Link href="/studio" className="mv-btn mv-btn-primary">Vào Studio <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-24 pb-20 px-6 overflow-hidden">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[680px] h-[520px] bg-indigo-500/18 rounded-full blur-[150px] pointer-events-none" />
          <div className="absolute top-[20%] right-[6%] w-[360px] h-[360px] bg-fuchsia-500/12 rounded-full blur-[130px] pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center relative z-10 mv-stagger">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ink/[0.03] border border-mv-hair text-slate-200 text-[13px] font-semibold mb-7">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              <span>Thiết kế cho người bán — 0đ chi phí API</span>
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-black tracking-tight leading-[1.07] mb-7 text-mv-fg">
              Mọi thứ người bán cần,<br />trong một studio.
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-9 leading-relaxed">
              Logo, bộ nhận diện, bảng giá, menu, poster — chọn mẫu, điền nội dung, xuất file sắc nét trong vài phút.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link href="/studio/templates" className="mv-btn mv-btn-primary !px-7 !py-3.5 !text-[15px]"><Wand2 className="w-5 h-5" /> Chọn mẫu thiết kế <ArrowRight className="w-4 h-4" /></Link>
              <Link href="/studio/marketing" className="mv-btn mv-btn-ghost !px-7 !py-3.5 !text-[15px]"><Sparkles className="w-5 h-5 text-indigo-300" /> Tạo poster quảng cáo</Link>
            </div>
            <div className="mt-14 pt-8 border-t border-mv-hair grid grid-cols-2 sm:grid-cols-4 gap-5 text-slate-400 text-[13px]">
              {['Tiếng Việt chuẩn', '0đ chi phí API', 'Kho mẫu đủ loại', 'Xuất PNG · ZIP'].map((t) => (
                <div key={t} className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-300" /><span>{t}</span></div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="tinh-nang" className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="mv-label mb-2">Vì sao Mivy</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-mv-fg">Nhẹ, nhanh, đúng chuẩn Việt</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mv-stagger">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <article key={f.title} className="glass-card p-7">
                    <span className="grid place-items-center w-12 h-12 rounded-xl mb-5" style={{ background: `${f.c}22`, border: `1px solid ${f.c}55`, color: f.c }}><Icon className="w-6 h-6" /></span>
                    <h3 className="text-lg font-bold text-mv-fg mb-2">{f.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Industries */}
        <section id="nganh" className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="mv-label mb-2">Theo ngành</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-mv-fg">Mẫu riêng cho từng lĩnh vực</h2>
            </div>
            <PosterShowcase />
            <p className="text-center text-xs text-slate-500 mt-6">Mẫu thật render ngay trên trình duyệt · bấm để mở trong Studio</p>
          </div>
        </section>

        {/* Comparison */}
        <section id="so-sanh" className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="mv-label mb-2">So sánh</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-mv-fg">Mivy vs cách làm khác</h2>
            </div>
            <div className="glass-card !p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-ink/[0.03] border-b border-mv-hair">
                    <tr>
                      <th className="p-4 font-semibold text-slate-300">Tiêu chí</th>
                      <th className="p-4 font-bold text-indigo-300">Mivy</th>
                      <th className="p-4 font-medium text-slate-500">Thuê designer</th>
                      <th className="p-4 font-medium text-slate-500">Tool AI gen ảnh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mv-hair text-slate-300">
                    {[
                      ['Chữ tiếng Việt', '✓ Chuẩn, không méo', 'Chuẩn (tốn công)', '✗ Hay méo, sai dấu'],
                      ['Chi phí', '✓ 0đ', 'Vài trăm k / ảnh', 'Tính phí theo lượt'],
                      ['Đủ khổ', '✓ Xuất 1 lần ra đủ khổ', 'Phải yêu cầu từng khổ', '✗ Phải crop tay'],
                      ['Thời gian', '✓ Vài phút', 'Vài giờ — vài ngày', 'Vài phút (hên xui)'],
                    ].map((row) => (
                      <tr key={row[0]}>
                        <td className="p-4 font-semibold text-mv-fg">{row[0]}</td>
                        <td className="p-4 text-mv-fg font-semibold">{row[1]}</td>
                        <td className="p-4 text-slate-400">{row[2]}</td>
                        <td className={`p-4 ${row[3].startsWith('✗') ? 'text-rose-400' : 'text-slate-400'}`}>{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="mv-label mb-2">Hỏi đáp</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-mv-fg">Câu hỏi thường gặp</h2>
            </div>
            <div className="space-y-4 mv-stagger">
              {faqs.map((faq) => (
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
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto glass-card hover:!transform-none p-10 sm:p-14 text-center relative overflow-hidden">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
            <h2 className="text-3xl sm:text-5xl font-black mb-5 relative z-10 text-mv-fg">Bắt đầu miễn phí ngay</h2>
            <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto mb-8 relative z-10">Không cài đặt, không thẻ thanh toán. Mở Studio và xuất bộ ảnh đầu tiên cho shop của anh.</p>
            <Link href="/studio" className="mv-btn mv-btn-primary !px-8 !py-4 !text-base relative z-10">Mở Mivy Studio <ArrowRight className="w-5 h-5" /></Link>
            <p className="text-slate-400 text-sm mt-6 relative z-10">
              Cần in thứ chưa có sẵn — có file riêng, hộp giấy, standee, tem dán?{' '}
              <Link href="/studio/print-custom" className="text-indigo-300 font-semibold hover:underline inline-flex items-center gap-1"><Printer className="w-4 h-4" /> Đặt in theo yêu cầu</Link>
              {zaloHref && <>{' · '}<a href={zaloHref} target="_blank" rel="noopener noreferrer" className="text-indigo-300 font-semibold hover:underline inline-flex items-center gap-1"><MessageCircle className="w-4 h-4" /> Nhắn Zalo</a></>}
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-mv-hair py-8 px-6 text-sm text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-6 h-6 rounded-md bg-mv-accent text-white font-extrabold text-xs">M</span>
            <span className="font-bold text-mv-fg">mivy</span>
            <span>· studio thiết kế cho người bán</span>
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
