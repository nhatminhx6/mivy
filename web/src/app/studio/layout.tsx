'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Sparkles, Image as ImageIcon, BookmarkCheck, FlaskConical, ExternalLink, Palette, ShoppingBag, PanelTop, ListOrdered, Wand2, Package, ArrowUpRight, Flame, LayoutGrid, Signpost, Clapperboard } from 'lucide-react';

const GROUPS = [
  { title: '', items: [
      { label: 'Tổng quan', href: '/studio', icon: LayoutDashboard },
      { label: 'Mẫu thiết kế', href: '/studio/templates', icon: LayoutGrid },
  ] },
  {
    title: 'Bán hàng',
    items: [
      { label: 'Banner sản phẩm', href: '/studio/product', icon: Wand2 },
      { label: 'Tạo quảng cáo', href: '/studio/marketing', icon: Sparkles },
      { label: 'Infographic', href: '/studio/infographic', icon: Flame },
      { label: 'Bảng giá', href: '/studio/pricelist', icon: ListOrdered },
      { label: 'Tạo ảnh', href: '/studio/image', icon: ImageIcon },
      { label: 'Video ngắn', href: '/studio/video', icon: Clapperboard },
    ],
  },
  {
    title: 'Thương hiệu',
    items: [
      { label: 'Thương hiệu', href: '/studio/brand', icon: Palette },
      { label: 'Bộ nhận diện', href: '/studio/brandpack', icon: Package },
      { label: 'Bìa & Avatar', href: '/studio/brand-assets', icon: PanelTop },
      { label: 'Bảng hiệu', href: '/studio/signage', icon: Signpost },
    ],
  },
  { title: 'Khác', items: [{ label: 'Chiến dịch', href: '/studio/drafts', icon: BookmarkCheck }] },
];

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const getBreadcrumb = () => {
    if (pathname.includes('/logo')) return 'Tạo logo';
    if (pathname.includes('/brand-assets')) return 'Bìa & Avatar';
    if (pathname.includes('/brandpack')) return 'Bộ nhận diện';
    if (pathname.includes('/product')) return 'Banner sản phẩm';
    if (pathname.includes('/pricelist')) return 'Bảng giá';
    if (pathname.includes('/brand')) return 'Thương hiệu';
    if (pathname.includes('/marketing')) return 'Tạo quảng cáo';
    if (pathname.includes('/infographic')) return 'Infographic';
    if (pathname.includes('/templates')) return 'Mẫu thiết kế';
    if (pathname.includes('/image')) return 'Tạo ảnh';
    if (pathname.includes('/drafts')) return 'Chiến dịch';
    if (pathname.includes('/lab')) return 'Phòng thử ảnh API';
    return 'Tổng quan';
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-[244px] shrink-0 border-r border-white/[0.06] glass-panel flex flex-col p-4 select-none">
        <Link href="/" className="flex items-center gap-2 px-2 pt-1 pb-5 group">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-white font-black text-lg shadow-lg shadow-indigo-500/30">M</span>
          <div className="leading-tight">
            <div className="text-lg font-black tracking-tight text-white">mivy</div>
            <div className="text-[9px] font-semibold text-slate-500 tracking-[0.18em] uppercase">Creative Studio</div>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-5">
          {GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.title && <div className="px-3 mb-1.5 mv-label">{group.title}</div>}
              <div className="space-y-0.5">
                {group.items.map((item, ii) => {
                  const Icon = item.icon;
                  const isActive = item.href === '/studio' ? pathname === '/studio' : (pathname === item.href || pathname.startsWith(item.href + '/'));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-active={isActive}
                      className="mv-nav mv-nav-enter"
                      style={{ animationDelay: `${0.04 * (gi * 4 + ii)}s` }}
                    >
                      {isActive && <span className="mv-nav-bar" />}
                      <Icon className="mv-nav-ico w-[18px] h-[18px]" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="pt-4 mt-2 border-t border-white/[0.06] space-y-2">
          <Link href="/pricing" className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-indigo-500/20 to-indigo-500/[0.06] border border-indigo-500/30 hover:border-indigo-500/50 transition-colors group">
            <Sparkles className="w-4 h-4 text-indigo-300 shrink-0" />
            <span className="text-xs font-bold text-white flex-1">Nâng cấp Pro</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-300" />
          </Link>
          <Link href="/lab" className="flex items-center gap-2.5 p-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
            <FlaskConical className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-400 group-hover:text-white flex-1">Phòng thử ảnh API</span>
            <ExternalLink className="w-3 h-3 text-slate-600" />
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-white/[0.06] glass-panel px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Mivy Studio</span>
            <span className="text-slate-600">/</span>
            <span className="font-semibold text-white">{getBreadcrumb()}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">0đ API</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow">M</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mv-fade">{children}</div>
        </main>
      </div>
    </div>
  );
}
