import Link from 'next/link';
import { ArrowRight, Sparkles, Image as ImageIcon, Layers, Download, CheckCircle2, Zap, ShieldCheck, Cpu } from 'lucide-react';

export default function HomePage() {
  const industries = [
    {
      title: 'Tuyển Dụng & Nhân Sự',
      desc: 'Bộ 3 poster gồm Launch Hero Photo 972px, Tiêu chí ứng viên và Kênh liên hệ phỏng vấn. Tự động trích xuất bảng kỹ năng từ JD.',
      tag: 'HOT',
      theme: 'Emerald Pro & Tech Dark',
    },
    {
      title: 'Đào Tạo & Khóa Học',
      desc: 'Bố cục lộ trình học từng chặng, nổi bật thông tin giảng viên, chứng chỉ và ưu đãi học phí có giới hạn.',
      tag: 'PHỔ BIẾN',
      theme: 'Warm Editorial',
    },
    {
      title: 'Dịch Vụ & Tư Vấn B2B',
      desc: 'Trình bày giải pháp doanh nghiệp, cam kết tiêu chuẩn SLA và hotline tư vấn trực tiếp chuẩn chỉn chu.',
      tag: 'CHUYÊN NGHIỆP',
      theme: 'Clean Minimal',
    },
    {
      title: 'Sản Phẩm & Thương Mại',
      desc: 'Tự động tách nền cutout, phủ bóng đổ chân thực và đặt vào khung trưng bày điện ảnh sang trọng.',
      tag: 'E-COMMERCE',
      theme: 'Bold Vibrant',
    },
  ];

  const faqs = [
    {
      q: 'Mivy Studio có mất phí API không?',
      a: 'Hoàn toàn không. Mivy Studio sử dụng kiến trúc AI kết hợp giữa mô hình ngôn ngữ chạy trực tiếp trên máy nội bộ (Local Ollama) và mô hình tạo nền nghệ thuật Flux.1 miễn phí 100%, chi phí API bằng 0đ.',
    },
    {
      q: 'Poster xuất ra có bị mờ hoặc sai lỗi chính tả tiếng Việt không?',
      a: 'Không bao giờ. Chữ và bảng ma trận được vẽ trực tiếp qua Canvas Design Engine độ phân giải 1080p bằng font tiếng Việt chuẩn (Be Vietnam Pro, Plus Jakarta Sans), khắc phục hoàn toàn tình trạng chữ méo mó của các công cụ diffusion thông thường.',
    },
    {
      q: 'Tôi có thể tải ảnh của mình lên poster không?',
      a: 'Có. Khi anh tải ảnh team, văn phòng hoặc sản phẩm thực tế, Mivy Studio sẽ tự động căn chỉnh tỷ lệ và đưa vào làm Hero Photo Showcase Banner 972px nổi bật ở trung tâm poster.',
    },
    {
      q: 'Hệ thống hỗ trợ những tỷ lệ ảnh nào?',
      a: 'Mivy hỗ trợ đầy đủ 3 tỷ lệ phổ biến nhất trên mạng xã hội: Vuông 1:1 (1080x1080), Dọc 4:5 (1080x1350) cho bài đăng Facebook/LinkedIn, và Story 9:16 (1080x1920) cho TikTok/Reels.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              mivy<span className="text-emerald-400">✳</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              STUDIO 2.0
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-medium">
            <a href="#tinh-nang" className="hover:text-white transition-colors">Tính Năng</a>
            <a href="#mau-poster" className="hover:text-white transition-colors">Mẫu Poster</a>
            <a href="#so-sanh" className="hover:text-white transition-colors">So Sánh</a>
            <a href="#faq" className="hover:text-white transition-colors">Câu Hỏi Thường Gặp</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/studio/marketing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
            >
              <span>Vào Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 px-6 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm font-semibold mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Nền tảng Thiết Kế AI 100% Miễn Phí · 0đ Chi Phí API</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1] mb-8">
              Tạo Poster Quảng Cáo & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Thiết Kế Studio Bằng AI
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
              Chỉ cần nhập mô tả yêu cầu hoặc bản JD. Mivy Studio tự động phân tích ý chính, sinh ảnh nền visual 3D điện ảnh và kết xuất bộ 3 poster sắc nét chuẩn in ấn trong chưa đầy 30 giây.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/studio/marketing"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-emerald-500 text-slate-950 font-bold text-base hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/25 group"
              >
                <span>Tạo Poster Tuyển Dụng Ngay</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/studio/image"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl glass-card text-white font-semibold text-base hover:bg-white/10 transition-colors"
              >
                <ImageIcon className="w-5 h-5 text-emerald-400" />
                <span>Thử Nghiệm Studio Tạo Ảnh</span>
              </Link>
            </div>

            {/* Social Proof Tags */}
            <div className="mt-16 pt-8 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-slate-400 text-sm">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Tiếng Việt chuẩn 100%</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>0đ Chi Phí API</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>3 Tỷ Lệ Đa Nền Tảng</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Xuất file PNG & ZIP</span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section id="tinh-nang" className="py-24 px-6 bg-slate-950/60 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Vì Sao Các Team Lựa Chọn Mivy Studio?
              </h2>
              <p className="text-slate-400 text-base sm:text-lg">
                Kết hợp sức mạnh trí tuệ nhân tạo thế hệ mới cùng bộ công cụ Canvas render chuyên biệt dành riêng cho thị trường Việt Nam.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <article className="glass-card p-8 rounded-2xl relative overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Bộ 3 Poster Đồng Bộ Một Ý</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  Không đăng rời rạc một ảnh. Mivy tự động tạo trọn bộ 3 poster gồm: Poster chính thu hút (Hero), Tiêu chuẩn chi tiết (Story) và Kênh ứng tuyển (Action).
                </p>
                <span className="text-xs font-semibold text-emerald-400">Đồng bộ nội dung & bố cục ↗</span>
              </article>

              <article className="glass-card p-8 rounded-2xl relative overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mb-6 text-blue-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Visual AI Nền Điện Ảnh 3D</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  Tự động sinh ảnh nền không gian công nghệ, studio trừu tượng hoặc phong cảnh điện ảnh tương ứng với ngành nghề mà không lo chữ bị méo mó.
                </p>
                <span className="text-xs font-semibold text-blue-400">Model Flux.1 miễn phí 100% ↗</span>
              </article>

              <article className="glass-card p-8 rounded-2xl relative overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-6 text-amber-400">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Hero Photo Banner 972px</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  Tải ảnh chụp team, văn phòng hoặc sự kiện thực tế lên và hiển thị toàn chiều rộng 972px ở vị trí trung tâm poster với viền kính sang trọng.
                </p>
                <span className="text-xs font-semibold text-amber-400">Tự động tối ưu bố cục ↗</span>
              </article>
            </div>
          </div>
        </section>

        {/* Poster Templates by Industry */}
        <section id="mau-poster" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Bố Cục Chuyên Biệt Theo Ngành Nghề
              </h2>
              <p className="text-slate-400 text-base sm:text-lg">
                Mỗi ngành có ngôn ngữ thị giác và hành vi ứng viên riêng biệt. Mivy Studio được huấn luyện mẫu thiết kế chuyên biệt cho từng lĩnh vực.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {industries.map((ind, idx) => (
                <div key={idx} className="glass-card p-6 rounded-2xl flex flex-col justify-between hover:border-emerald-500/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs px-2.5 py-1 rounded-md bg-white/5 border border-white/10 font-bold text-emerald-400">
                        {ind.tag}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">0{idx + 1}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{ind.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed mb-6">{ind.desc}</p>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Theme: {ind.theme}</span>
                    <Link href="/studio/marketing" className="text-xs font-bold text-emerald-400 hover:underline">
                      Thử mẫu ↗
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section id="so-sanh" className="py-20 px-6 bg-slate-950/40 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white text-center mb-12">
              So Sánh Mivy Studio vs Giải Pháp Khác
            </h2>

            <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 border-b border-white/10 text-slate-300 font-bold">
                    <tr>
                      <th className="p-4 sm:p-5">Tiêu chí</th>
                      <th className="p-4 sm:p-5 text-emerald-400">Mivy Studio</th>
                      <th className="p-4 sm:p-5 text-slate-400">Canva / Mẫu có sẵn</th>
                      <th className="p-4 sm:p-5 text-slate-400">Midjourney / DALL-E</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    <tr>
                      <td className="p-4 sm:p-5 font-semibold text-white">Chữ tiếng Việt & Bảng ma trận</td>
                      <td className="p-4 sm:p-5 text-emerald-400 font-bold">✓ Chuẩn xác 100%, không méo</td>
                      <td className="p-4 sm:p-5">Phải gõ tay từng ô</td>
                      <td className="p-4 sm:p-5 text-rose-400">✗ Chữ bị méo mó, sai chính tả</td>
                    </tr>
                    <tr>
                      <td className="p-4 sm:p-5 font-semibold text-white">Chi phí bản quyền & API</td>
                      <td className="p-4 sm:p-5 text-emerald-400 font-bold">✓ 0đ Miễn phí</td>
                      <td className="p-4 sm:p-5">Tính phí Pro hàng tháng</td>
                      <td className="p-4 sm:p-5">Tính phí USD theo lượt gen</td>
                    </tr>
                    <tr>
                      <td className="p-4 sm:p-5 font-semibold text-white">Tự động hóa từ JD</td>
                      <td className="p-4 sm:p-5 text-emerald-400 font-bold">✓ Tự trích xuất Role, Stack, Lương</td>
                      <td className="p-4 sm:p-5 text-rose-400">✗ Thủ công</td>
                      <td className="p-4 sm:p-5 text-rose-400">✗ Không có cấu trúc JD</td>
                    </tr>
                    <tr>
                      <td className="p-4 sm:p-5 font-semibold text-white">Thời gian hoàn thiện</td>
                      <td className="p-4 sm:p-5 text-emerald-400 font-bold">✓ 30 giây trọn bộ 3 poster</td>
                      <td className="p-4 sm:p-5">15 - 30 phút sửa mẫu</td>
                      <td className="p-4 sm:p-5">5 - 10 phút thử prompt</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white text-center mb-16">
              Câu Hỏi Thường Gặp
            </h2>

            <div className="space-y-6">
              {faqs.map((faq, idx) => (
                <article key={idx} className="glass-card p-6 sm:p-8 rounded-2xl border border-white/5">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">
                      Q
                    </span>
                    {faq.q}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed pl-9">{faq.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto glass-panel p-10 sm:p-16 rounded-3xl border border-emerald-500/30 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-6 relative z-10">
              Sẵn Sàng Nâng Tầm Hình Ảnh Quảng Cáo?
            </h2>
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mb-8 relative z-10">
              Không cần cài đặt phức tạp, không cần thẻ visa thanh toán API. Mở Studio và tạo ngay bộ poster đầu tiên cho chiến dịch của anh.
            </p>
            <Link
              href="/studio/marketing"
              className="inline-flex items-center gap-2 px-9 py-4 rounded-xl bg-emerald-500 text-slate-950 font-bold text-base hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/30 relative z-10"
            >
              <span>Bắt Đầu Tạo Poster Ngay</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 px-6 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">mivy</span>
            <span>· Nền tảng thiết kế quảng cáo tự động hóa</span>
          </div>
          <p>© {new Date().getFullYear()} Mivy Studio. Tối ưu hóa chuẩn SEO cho doanh nghiệp Việt Nam.</p>
        </div>
      </footer>
    </div>
  );
}
