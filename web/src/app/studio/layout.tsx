'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Sparkles, Image as ImageIcon, BookmarkCheck, FlaskConical, ExternalLink } from 'lucide-react';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Tổng quan', href: '/studio', icon: LayoutDashboard },
    { label: 'Tạo quảng cáo', href: '/studio/marketing', icon: Sparkles },
    { label: 'Tạo ảnh', href: '/studio/image', icon: ImageIcon },
    { label: 'Chiến dịch', href: '/studio/drafts', icon: BookmarkCheck },
  ];

  const getBreadcrumb = () => {
    if (pathname.includes('/marketing')) return 'Tạo quảng cáo';
    if (pathname.includes('/image')) return 'Tạo ảnh';
    if (pathname.includes('/drafts')) return 'Chiến dịch đã lưu';
    if (pathname.includes('/lab')) return 'Phòng thử ảnh API';
    return 'Tổng quan';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#07090e]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 glass-panel flex flex-col justify-between p-5 select-none">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-2xl font-black tracking-tight text-white mb-1 group">
            <span>mivy</span>
            <span className="text-emerald-400 group-hover:rotate-45 transition-transform duration-300">✳</span>
          </Link>
          <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase mb-8">
            KHÔNG GIAN SÁNG TẠO
          </p>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-white/10">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              MIVY STUDIO 2.0
            </span>
            <p className="text-xs text-slate-400 mt-2 mb-3 leading-relaxed">
              Tạo ảnh và nội dung quảng cáo từ ý tưởng của anh với 0đ API.
            </p>
            <Link
              href="/lab"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Mở phòng thử ảnh API</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-white/10 glass-panel px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Mivy Studio /</span>
            <span className="font-semibold text-white">{getBreadcrumb()}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
              M
            </div>
          </div>
        </header>

        {/* Workspace Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#07090e]">
          {children}
        </main>
      </div>
    </div>
  );
}
