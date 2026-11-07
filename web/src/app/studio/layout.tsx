'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AccountBox } from '@/components/AccountBox';
import { AuthProvider } from '@/lib/auth';
import { Loader2, Menu, X, Sparkles, Palette, PanelTop, ListOrdered, Wand2, Package, Flame, LayoutGrid, Signpost, Heart, Sticker, KeyRound, FileUser, FileUp, Hash } from 'lucide-react';

// 3 trụ: In ấn · Thương hiệu · Quảng cáo (đã bỏ trụ Ảnh sản phẩm cho sàn). Trang trùng/lẻ đã gộp hoặc ẩn khỏi menu (route vẫn còn).
const GROUPS = [
  {
    title: 'In ấn',
    items: [
      { label: 'Thiệp cưới · sinh nhật', href: '/studio/cards', icon: Heart },
      { label: 'Sticker', href: '/studio/sticker', icon: Sticker },
      { label: 'Móc khoá', href: '/studio/keychain', icon: KeyRound },
      { label: 'Hashtag cầm tay', href: '/studio/hashtag', icon: Hash },
      { label: 'Đặt in theo yêu cầu', href: '/studio/print-custom', icon: FileUp },
      { label: 'Tạo CV', href: '/studio/cv', icon: FileUser },
    ],
  },
  {
    title: 'Thương hiệu',
    items: [
      { label: 'Tạo logo', href: '/studio/logo', icon: Sparkles },
      { label: 'Bộ nhận diện', href: '/studio/brandpack', icon: Package },
      { label: 'Bìa & Avatar', href: '/studio/brand-assets', icon: PanelTop },
      { label: 'Bảng hiệu', href: '/studio/signage', icon: Signpost },
      { label: 'Cài đặt thương hiệu', href: '/studio/brand', icon: Palette },
    ],
  },
  {
    title: 'Quảng cáo',
    items: [
      { label: 'Poster & banner sale', href: '/studio/marketing', icon: Flame },
      { label: 'Mẫu thiết kế', href: '/studio/templates', icon: LayoutGrid },
      { label: 'Infographic', href: '/studio/infographic', icon: Wand2 },
      { label: 'Bảng giá', href: '/studio/pricelist', icon: ListOrdered },
    ],
  },
];

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><StudioShell>{children}</StudioShell></AuthProvider>;
}

function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false); // menu trượt trên điện thoại
  useEffect(() => setMenuOpen(false), [pathname]);
  // Đang chuyển trang: bấm menu → hiện loading ngay tới khi trang mới lên (lần đầu mở trang có thể lâu)
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [pathname]);
  useEffect(() => { if (!pending) return; const t = setTimeout(() => setPending(null), 30000); return () => clearTimeout(t); }, [pending]); // lỡ kẹt thì tự gỡ
  const go = (e: React.MouseEvent, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || pathname === href) return;
    setPending(href);
  };
  // Bản dev: biên dịch sẵn từng trang trong menu lúc rảnh để lần đầu bấm không phải chờ
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    let stop = false;
    const t = setTimeout(async () => {
      for (const g of GROUPS) for (const it of g.items) {
        if (stop) return;
        await fetch(it.href, { cache: 'no-store' }).catch(() => null);
      }
    }, 4000);
    return () => { stop = true; clearTimeout(t); };
  }, []);

  const getBreadcrumb = () => {
    if (pathname.includes('/logo')) return 'Tạo logo';
    if (pathname.includes('/brand-assets')) return 'Bìa & Avatar';
    if (pathname.includes('/brandpack')) return 'Bộ nhận diện';
    if (pathname.includes('/signage')) return 'Bảng hiệu';
    if (pathname.includes('/pricelist')) return 'Bảng giá';
    if (pathname.includes('/brand')) return 'Cài đặt thương hiệu';
    if (pathname.includes('/marketing')) return 'Poster & banner sale';
    if (pathname.includes('/infographic')) return 'Infographic';
    if (pathname.includes('/templates')) return 'Mẫu thiết kế';
    if (pathname.includes('/wallet')) return 'Ví của tôi';
    if (pathname.includes('/admin')) return 'Quản trị';
    if (pathname.includes('/print-custom')) return 'Đặt in theo yêu cầu';
    if (pathname.includes('/studio/orders')) return 'Đơn in của tôi';
    if (pathname.includes('/cards')) return 'Thiệp cưới · sinh nhật';
    if (pathname.includes('/sticker')) return 'Sticker';
    if (pathname.includes('/keychain')) return 'Móc khoá';
    return 'Studio';
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {menuOpen && <button type="button" aria-label="Đóng menu" onClick={() => setMenuOpen(false)} className="lg:hidden fixed inset-0 z-40 bg-ink/40" />}
      <aside className={`w-[244px] shrink-0 border-r border-mv-hair bg-mv-surface flex flex-col p-4 select-none fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`} data-testid="studio-sidebar">
        <Link href="/" className="flex items-center gap-2.5 px-1.5 pt-1 pb-5 group">
          <span className="grid place-items-center w-9 h-9 rounded-[11px] bg-mv-accent text-white font-extrabold text-[17px]">M</span>
          <div className="leading-tight">
            <div className="text-lg font-extrabold tracking-tight text-mv-fg">mivy</div>
            <div className="text-[10px] font-semibold text-mv-muted-2 tracking-[0.14em] uppercase">Creative Studio</div>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto -mr-2 pr-2 space-y-4">
          {GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.title && <div className="px-2.5 mb-1.5 mv-label">{group.title}</div>}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === '/studio' ? pathname === '/studio' : (pathname === item.href || pathname.startsWith(item.href + '/'));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(e) => go(e, item.href)}
                      data-active={isActive}
                      data-pending={pending === item.href || undefined}
                      className="mv-nav"
                    >
                      {pending === item.href ? <Loader2 className="mv-nav-ico w-[18px] h-[18px] animate-spin" /> : <Icon className="mv-nav-ico w-[18px] h-[18px]" />}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="pt-4 mt-2 border-t border-mv-hair space-y-2">
          <AccountBox />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-[60px] border-b border-mv-hair bg-mv-surface px-3 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-label="Mở menu" className="lg:hidden mv-btn mv-btn-ghost !p-2" data-testid="studio-menu-btn">{menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}</button>
            <span className="text-mv-muted hidden sm:inline">Mivy Studio</span>
            <span className="text-mv-muted-2 hidden sm:inline" aria-hidden="true">/</span>
            <span className="font-semibold text-mv-fg">{getBreadcrumb()}</span>
            {pending && <span className="flex items-center gap-1.5 text-xs text-mv-accent"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang mở trang…</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[11px] font-bold px-2.5 py-1 rounded-lg bg-mv-accent-soft text-mv-accent">0đ API</span>
            <div className="w-9 h-9 rounded-full bg-mv-surface border border-mv-hair text-mv-accent flex items-center justify-center font-bold text-xs shadow-[0_1px_2px_rgba(18,23,38,0.05)]">M</div>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto p-2 sm:p-6 lg:p-8">
          {pending && (
            <div className="sticky top-0 z-30 h-0" data-testid="studio-nav-loading">
              <div className="absolute -top-2 sm:-top-6 lg:-top-8 -left-2 sm:-left-6 lg:-left-8 -right-2 sm:-right-6 lg:-right-8 h-0.5 overflow-hidden bg-mv-accent-soft">
                <div className="h-full w-1/3 bg-mv-accent animate-[mvbar_1s_ease-in-out_infinite]" />
              </div>
            </div>
          )}
          <div className={`mv-fade transition-opacity ${pending ? 'opacity-40 pointer-events-none' : ''}`}>{children}</div>
        </main>
        <style>{'@keyframes mvbar{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}'}</style>
      </div>
    </div>
  );
}
