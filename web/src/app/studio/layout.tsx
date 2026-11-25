'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AccountBox } from '@/components/AccountBox';
import { AuthProvider } from '@/lib/auth';
import { Loader2, Menu, X, Sparkles, Palette, PanelTop, ListOrdered, Wand2, Package, Flame, LayoutGrid, Signpost, Heart, Sticker, KeyRound, FileUser, FileUp, Hash, Tag, Contact, Box, GalleryVerticalEnd, CalendarDays, Mail, FileText, RectangleHorizontal, BookOpen, ShieldCheck, ShoppingBag, Briefcase, CupSoda, Disc3, Tags, Ticket, IdCard, NotebookPen, Pizza, UtensilsCrossed, QrCode, Magnet, Coffee, Shirt, BadgeCheck, Fan, Frame, Sofa, Umbrella, ReceiptText, Gift, Presentation, ShoppingBasket, SquareStack, HardHat, MailOpen, Flag, PackageOpen, Wine, CupSoda as Tumbler, PenLine, Award, BookCopy, BookImage, Triangle, AppWindow, BookOpenText, Droplets, CakeSlice, Circle, MousePointer2, Bookmark, Mailbox, TicketCheck, Lightbulb, Store, Sandwich, ScanFace, PaintRoller, Signpost as SignpostIcon, Cylinder, Ribbon, Luggage, Backpack, LayoutPanelTop, Archive, Bike, ChefHat, ShieldHalf, Coins, Puzzle, Smartphone, Spade, Clock, MailPlus, Armchair, PartyPopper, Scissors, RectangleEllipsis, Tent, Pencil, Gift as GiftBox, StickyNote, Ribbon as RibbonIcon, Shield, UserRound, PackageCheck, CupSoda as CupBag, Wheat, Triangle as ConeIcon, Car, Moon } from 'lucide-react';

// 3 trụ: In ấn · Thương hiệu · Quảng cáo (đã bỏ trụ Ảnh sản phẩm cho sàn). Trang trùng/lẻ đã gộp hoặc ẩn khỏi menu (route vẫn còn).
const GROUPS = [
  {
    title: 'In ấn',
    items: [
      { label: 'In theo nhu cầu', href: '/in', icon: Tag },
      { label: 'Thiệp cưới · sinh nhật', href: '/studio/cards', icon: Heart },
      { label: 'Card visit', href: '/studio/cardvisit', icon: Contact },
      { label: 'Sticker', href: '/studio/sticker', icon: Sticker },
      { label: 'Móc khoá', href: '/studio/keychain', icon: KeyRound },
      { label: 'Hộp & túi giấy', href: '/studio/packaging', icon: Box },
      { label: 'Hashtag cầm tay', href: '/studio/hashtag', icon: Hash },
      { label: 'Lịch Tết', href: '/studio/calendar', icon: CalendarDays },
      { label: 'Lì xì & phong bì', href: '/studio/envelope', icon: Mail },
      { label: 'Tờ rơi', href: '/studio/flyer', icon: FileText },
      { label: 'Brochure gấp 3', href: '/studio/brochure', icon: BookOpen },
      { label: 'Tem bảo hành · niêm phong', href: '/studio/seal', icon: ShieldCheck },
      { label: 'Túi zip · bao bì', href: '/studio/pouch', icon: ShoppingBag },
      { label: 'Bộ văn phòng', href: '/studio/stationery', icon: Briefcase },
      { label: 'Ly in logo', href: '/studio/cup', icon: CupSoda },
      { label: 'Băng keo in logo', href: '/studio/tape', icon: Disc3 },
      { label: 'Túi vải canvas', href: '/studio/tote', icon: ShoppingBag },
      { label: 'Tag treo quần áo', href: '/studio/hangtag', icon: Tags },
      { label: 'Voucher · thẻ tích điểm', href: '/studio/voucher', icon: Ticket },
      { label: 'Thẻ đeo nhân viên', href: '/studio/badge', icon: IdCard },
      { label: 'Sổ tay in logo', href: '/studio/notebook', icon: NotebookPen },
      { label: 'Hộp đồ ăn · pizza', href: '/studio/foodbox', icon: Pizza },
      { label: 'Bộ bàn ăn F&B', href: '/studio/tableware', icon: UtensilsCrossed },
      { label: 'Kệ mica QR để bàn', href: '/studio/qrstand', icon: QrCode },
      { label: 'Nam châm tủ lạnh', href: '/studio/magnet', icon: Magnet },
      { label: 'Ly sứ in hình', href: '/studio/mug', icon: Coffee },
      { label: 'Áo thun đồng phục', href: '/studio/tshirt', icon: Shirt },
      { label: 'Huy hiệu cài áo', href: '/studio/pin', icon: BadgeCheck },
      { label: 'Quạt cầm tay', href: '/studio/fan', icon: Fan },
      { label: 'Tranh canvas', href: '/studio/canvas', icon: Frame },
      { label: 'Gối in hình', href: '/studio/pillow', icon: Sofa },
      { label: 'Ô dù in logo', href: '/studio/umbrella', icon: Umbrella },
      { label: 'Hoá đơn · phiếu liên', href: '/studio/receiptbook', icon: ReceiptText },
      { label: 'Giấy gói quà', href: '/studio/giftwrap', icon: Gift },
      { label: 'Bảng chữ A vỉa hè', href: '/studio/aframe', icon: Presentation },
      { label: 'Túi xốp in logo', href: '/studio/plasticbag', icon: ShoppingBasket },
      { label: 'Biển công ty', href: '/studio/plaque', icon: SquareStack },
      { label: 'Mũ lưỡi trai', href: '/studio/cap', icon: HardHat },
      { label: 'Thiệp Tết doanh nghiệp', href: '/studio/greeting', icon: MailOpen },
      { label: 'Cờ phướn · cờ dây', href: '/studio/flag', icon: Flag },
      { label: 'Hộp quà cứng', href: '/studio/rigidbox', icon: PackageOpen },
      { label: 'Nhãn chai · hũ', href: '/studio/label', icon: Wine },
      { label: 'Bình giữ nhiệt', href: '/studio/tumbler', icon: Tumbler },
      { label: 'Bút in logo', href: '/studio/pen', icon: PenLine },
      { label: 'Giấy khen · chứng nhận', href: '/studio/certificate', icon: Award },
      { label: 'Catalogue nhiều trang', href: '/studio/booklet', icon: BookCopy },
      { label: 'Photobook · kỷ yếu', href: '/studio/photobook', icon: BookImage },
      { label: 'Tent card để bàn', href: '/studio/tabletent', icon: Triangle },
      { label: 'Decal dán kính', href: '/studio/windowdecal', icon: AppWindow },
      { label: 'Menu dạng sổ', href: '/studio/menubook', icon: BookOpenText },
      { label: 'Khăn lạnh in logo', href: '/studio/wetwipe', icon: Droplets },
      { label: 'Hộp bánh kem', href: '/studio/cakebox', icon: CakeSlice },
      { label: 'Lót ly in logo', href: '/studio/coaster', icon: Circle },
      { label: 'Lót chuột in hình', href: '/studio/mousepad', icon: MousePointer2 },
      { label: 'Bookmark kẹp sách', href: '/studio/bookmark', icon: Bookmark },
      { label: 'Postcard', href: '/studio/postcard', icon: Mailbox },
      { label: 'Vé sự kiện', href: '/studio/ticket', icon: TicketCheck },
      { label: 'Hộp đèn', href: '/studio/lightbox', icon: Lightbulb },
      { label: 'Tem kệ · wobbler', href: '/studio/shelftalker', icon: Store },
      { label: 'Túi giấy đồ ăn', href: '/studio/foodbag', icon: Sandwich },
      { label: 'Khung check-in cầm tay', href: '/studio/selfieframe', icon: ScanFace },
      { label: 'Tranh dán tường', href: '/studio/wallmural', icon: PaintRoller },
      { label: 'Biển báo · chỉ dẫn', href: '/studio/signboard', icon: SignpostIcon },
      { label: 'Hộp ống tròn', href: '/studio/tube', icon: Cylinder },
      { label: 'Băng đeo chéo', href: '/studio/sash', icon: Ribbon },
      { label: 'Bảng tên cài áo', href: '/studio/nametag', icon: IdCard },
      { label: 'Thẻ hành lý', href: '/studio/luggagetag', icon: Luggage },
      { label: 'Túi rút', href: '/studio/drawstring', icon: Backpack },
      { label: 'Bảng menu treo tường', href: '/studio/menuboard', icon: LayoutPanelTop },
      { label: 'Hộp khăn giấy', href: '/studio/tissuebox', icon: Archive },
      { label: 'Thùng giao hàng', href: '/studio/deliverybox', icon: Bike },
      { label: 'Tạp dề in logo', href: '/studio/apron', icon: ChefHat },
      { label: 'Mũ bảo hiểm in logo', href: '/studio/helmet', icon: ShieldHalf },
      { label: 'Thẻ cào trúng thưởng', href: '/studio/scratchcard', icon: Coins },
      { label: 'Puzzle in ảnh', href: '/studio/puzzle', icon: Puzzle },
      { label: 'Ốp lưng điện thoại', href: '/studio/phonecase', icon: Smartphone },
      { label: 'Bộ bài in logo', href: '/studio/playingcards', icon: Spade },
      { label: 'Đồng hồ in logo', href: '/studio/clock', icon: Clock },
      { label: 'Thiệp mời sự kiện', href: '/studio/invitation', icon: MailPlus },
      { label: 'Sơ đồ chỗ ngồi tiệc', href: '/studio/seating', icon: Armchair },
      { label: 'Bảng chào mừng tiệc', href: '/studio/welcomesign', icon: PartyPopper },
      { label: 'Mác áo dệt', href: '/studio/wovenlabel', icon: Scissors },
      { label: 'Thảm chùi chân', href: '/studio/doormat', icon: RectangleEllipsis },
      { label: 'Mái hiên in logo', href: '/studio/awning', icon: Tent },
      { label: 'Nhãn tên học sinh', href: '/studio/namelabel', icon: Pencil },
      { label: 'Hộp quà cưới mini', href: '/studio/favorbox', icon: GiftBox },
      { label: 'Giấy note in logo', href: '/studio/notepad', icon: StickyNote },
      { label: 'Ruy băng in logo', href: '/studio/ribbon', icon: RibbonIcon },
      { label: 'Patch thêu', href: '/studio/patch', icon: Shield },
      { label: 'Standee mica mini', href: '/studio/acrylicstand', icon: UserRound },
      { label: 'Thùng carton in logo', href: '/studio/carton', icon: PackageCheck },
      { label: 'Túi đựng ly trà sữa', href: '/studio/cupcarrier', icon: CupBag },
      { label: 'Bao gạo · bao bì nông sản', href: '/studio/ricebag', icon: Wheat },
      { label: 'Nón lá in logo', href: '/studio/nonla', icon: ConeIcon },
      { label: 'Decal dán xe công ty', href: '/studio/cardecal', icon: Car },
      { label: 'Hộp bánh trung thu', href: '/studio/mooncakebox', icon: Moon },
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
      { label: 'Standee', href: '/studio/standee', icon: GalleryVerticalEnd },
      { label: 'Banner & backdrop', href: '/studio/banner', icon: RectangleHorizontal },
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
    if (pathname.includes('/cardvisit')) return 'Card visit';
    if (pathname.includes('/standee')) return 'Standee';
    if (pathname.includes('/packaging')) return 'Hộp & túi giấy';
    if (pathname.includes('/hashtag')) return 'Hashtag cầm tay';
    if (pathname.includes('/calendar')) return 'Lịch Tết';
    if (pathname.includes('/envelope')) return 'Lì xì & phong bì';
    if (pathname.includes('/flyer')) return 'Tờ rơi';
    if (pathname.includes('/banner')) return 'Banner & backdrop';
    if (pathname.includes('/brochure')) return 'Brochure gấp 3';
    if (pathname.includes('/seal')) return 'Tem bảo hành · niêm phong';
    if (pathname.includes('/pouch')) return 'Túi zip · bao bì';
    if (pathname.includes('/stationery')) return 'Bộ văn phòng';
    if (pathname.includes('/cup')) return 'Ly in logo';
    if (pathname.includes('/tape')) return 'Băng keo in logo';
    if (pathname.includes('/tote')) return 'Túi vải canvas';
    if (pathname.includes('/hangtag')) return 'Tag treo quần áo';
    if (pathname.includes('/voucher')) return 'Voucher · thẻ tích điểm';
    if (pathname.includes('/badge')) return 'Thẻ đeo nhân viên';
    if (pathname.includes('/notebook')) return 'Sổ tay in logo';
    if (pathname.includes('/foodbox')) return 'Hộp đồ ăn · pizza';
    if (pathname.includes('/tableware')) return 'Bộ bàn ăn F&B';
    if (pathname.includes('/qrstand')) return 'Kệ mica QR để bàn';
    if (pathname.includes('/magnet')) return 'Nam châm tủ lạnh';
    if (pathname.includes('/mug')) return 'Ly sứ in hình';
    if (pathname.includes('/tshirt')) return 'Áo thun đồng phục';
    if (pathname.includes('/studio/pin')) return 'Huy hiệu cài áo';
    if (pathname.includes('/studio/fan')) return 'Quạt cầm tay';
    if (pathname.includes('/studio/canvas')) return 'Tranh canvas';
    if (pathname.includes('/pillow')) return 'Gối in hình';
    if (pathname.includes('/umbrella')) return 'Ô dù in logo';
    if (pathname.includes('/receiptbook')) return 'Hoá đơn · phiếu liên';
    if (pathname.includes('/giftwrap')) return 'Giấy gói quà';
    if (pathname.includes('/aframe')) return 'Bảng chữ A vỉa hè';
    if (pathname.includes('/plasticbag')) return 'Túi xốp in logo';
    if (pathname.includes('/plaque')) return 'Biển công ty';
    if (pathname.includes('/studio/cap')) return 'Mũ lưỡi trai';
    if (pathname.includes('/greeting')) return 'Thiệp Tết doanh nghiệp';
    if (pathname.includes('/studio/flag')) return 'Cờ phướn · cờ dây';
    if (pathname.includes('/rigidbox')) return 'Hộp quà cứng';
    if (pathname.includes('/studio/label')) return 'Nhãn chai · hũ';
    if (pathname.includes('/tumbler')) return 'Bình giữ nhiệt';
    if (pathname.includes('/studio/pen')) return 'Bút in logo';
    if (pathname.includes('/studio/certificate')) return 'Giấy khen · chứng nhận';
    if (pathname.includes('/studio/booklet')) return 'Catalogue nhiều trang';
    if (pathname.includes('/studio/photobook')) return 'Photobook · kỷ yếu';
    if (pathname.includes('/studio/tabletent')) return 'Tent card để bàn';
    if (pathname.includes('/studio/windowdecal')) return 'Decal dán kính';
    if (pathname.includes('/studio/menubook')) return 'Menu dạng sổ';
    if (pathname.includes('/studio/wetwipe')) return 'Khăn lạnh in logo';
    if (pathname.includes('/studio/cakebox')) return 'Hộp bánh kem';
    if (pathname.includes('/studio/coaster')) return 'Lót ly in logo';
    if (pathname.includes('/studio/mousepad')) return 'Lót chuột in hình';
    if (pathname.includes('/studio/bookmark')) return 'Bookmark kẹp sách';
    if (pathname.includes('/studio/postcard')) return 'Postcard';
    if (pathname.includes('/studio/ticket')) return 'Vé sự kiện';
    if (pathname.includes('/studio/lightbox')) return 'Hộp đèn';
    if (pathname.includes('/studio/shelftalker')) return 'Tem kệ · wobbler';
    if (pathname.includes('/studio/foodbag')) return 'Túi giấy đồ ăn';
    if (pathname.includes('/studio/selfieframe')) return 'Khung check-in cầm tay';
    if (pathname.includes('/studio/wallmural')) return 'Tranh dán tường';
    if (pathname.includes('/studio/signboard')) return 'Biển báo · chỉ dẫn';
    if (pathname.includes('/studio/tube')) return 'Hộp ống tròn';
    if (pathname.includes('/studio/sash')) return 'Băng đeo chéo';
    if (pathname.includes('/studio/nametag')) return 'Bảng tên cài áo';
    if (pathname.includes('/studio/luggagetag')) return 'Thẻ hành lý';
    if (pathname.includes('/studio/drawstring')) return 'Túi rút';
    if (pathname.includes('/studio/menuboard')) return 'Bảng menu treo tường';
    if (pathname.includes('/studio/tissuebox')) return 'Hộp khăn giấy';
    if (pathname.includes('/studio/deliverybox')) return 'Thùng giao hàng';
    if (pathname.includes('/studio/apron')) return 'Tạp dề in logo';
    if (pathname.includes('/studio/helmet')) return 'Mũ bảo hiểm in logo';
    if (pathname.includes('/studio/scratchcard')) return 'Thẻ cào trúng thưởng';
    if (pathname.includes('/studio/puzzle')) return 'Puzzle in ảnh';
    if (pathname.includes('/studio/phonecase')) return 'Ốp lưng điện thoại';
    if (pathname.includes('/studio/playingcards')) return 'Bộ bài in logo';
    if (pathname.includes('/studio/clock')) return 'Đồng hồ in logo';
    if (pathname.includes('/studio/invitation')) return 'Thiệp mời sự kiện';
    if (pathname.includes('/studio/seating')) return 'Sơ đồ chỗ ngồi tiệc';
    if (pathname.includes('/studio/welcomesign')) return 'Bảng chào mừng tiệc';
    if (pathname.includes('/studio/wovenlabel')) return 'Mác áo dệt';
    if (pathname.includes('/studio/doormat')) return 'Thảm chùi chân';
    if (pathname.includes('/studio/awning')) return 'Mái hiên in logo';
    if (pathname.includes('/studio/namelabel')) return 'Nhãn tên học sinh';
    if (pathname.includes('/studio/favorbox')) return 'Hộp quà cưới mini';
    if (pathname.includes('/studio/notepad')) return 'Giấy note in logo';
    if (pathname.includes('/studio/ribbon')) return 'Ruy băng in logo';
    if (pathname.includes('/studio/patch')) return 'Patch thêu';
    if (pathname.includes('/studio/acrylicstand')) return 'Standee mica mini';
    if (pathname.includes('/studio/carton')) return 'Thùng carton in logo';
    if (pathname.includes('/studio/cupcarrier')) return 'Túi đựng ly trà sữa';
    if (pathname.includes('/studio/ricebag')) return 'Bao gạo · bao bì nông sản';
    if (pathname.includes('/studio/nonla')) return 'Nón lá in logo';
    if (pathname.includes('/studio/cardecal')) return 'Decal dán xe công ty';
    if (pathname.includes('/studio/mooncakebox')) return 'Hộp bánh trung thu';
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
