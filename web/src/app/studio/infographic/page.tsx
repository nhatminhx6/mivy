'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Plus, Trash2, Flame, Package, Upload, X, Loader2, BadgeCheck, Maximize2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { renderFeatureInfographic, renderListInfographic, AD_BACKGROUNDS, getBackground, POSTER_THEMES, POSTER_VARIANTS, InfographicData, InfographicRow, PosterCard, PosterThemeId } from '@/lib/infographic-engine';
import { renderPosterInfographic, posterColorsFromBrand, isCustomHero } from '@/lib/poster-engine';
import { loadBrand } from '@/lib/brand-presets';
import { renderHtmlToPng, downloadBlob } from '@/lib/html-export';
import { scaleImage, cutoutImage, slugify } from '@/lib/image-utils';
import type { BrandKit } from '@/types';
import { ILLUSTRATIONS, illustrationUrl } from '@/lib/illustrations';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { TemplateHtmlPreview, TemplateHtmlPreviewHandle } from '@/components/TemplateHtmlPreview';
import { AsyncButton } from '@/components/AsyncButton';

type Aspect = '1:1' | '4:5' | '9:16';

const TEMPLATES: { name: string; bg: string; theme?: PosterThemeId; data: InfographicData }[] = [
  {
    name: 'Poster khai trương / Sale', bg: 'd_navy', theme: 'orange',
    data: {
      layout: 'poster', variant: 'stage', brand: 'Mộc Store', note: 'Hàng xịn giá mềm',
      kicker: 'Khai trương', title: 'Mở cửa', title2: 'hàng mới.', tagline: 'Giảm đến 50%!',
      hero: ['shopping_bags', 'wrapped_gift', 'party_popper'],
      cards: [
        { tag: '🎁 Khách mới', title: 'Quà chào sân', items: [
          { icon: '🛍️', text: 'Giảm 50% đơn đầu', sub: 'Áp dụng 3 ngày khai trương' },
          { icon: '🚚', text: 'Freeship toàn quốc', sub: 'Đơn từ 199k' },
          { icon: '🎀', text: 'Tặng kèm túi vải', sub: 'Số lượng có hạn' },
        ] },
        { tag: '⭐ Khách thân', title: 'Đặc quyền VIP', items: [
          { icon: '💳', text: 'Tích điểm x2', sub: 'Mọi đơn hàng' },
          { icon: '🎂', text: 'Quà sinh nhật', sub: 'Voucher 100k' },
          { icon: '⚡', text: 'Ưu tiên hàng mới', sub: 'Mở bán sớm 24h' },
        ] },
      ],
      contacts: ['📞 0909 123 456', '📍 fb.com/tenshop'], cta: 'Rủ bạn cùng săn!', rows: [],
    },
  },
  {
    name: 'Poster tuyển dụng / Tech', bg: 'd_navy', theme: 'blue',
    data: {
      layout: 'poster', variant: 'split', brand: 'TechViet', note: 'Người giỏi làm nên sản phẩm',
      kicker: 'Đang tuyển', title: 'Sản phẩm', title2: 'gặp Kỹ thuật.', tagline: 'AI gặp Gaming.',
      hero: ['laptop', 'video_game', 'robot'],
      cards: [
        { tag: '💼 Product & Tech', title: 'Technical Product Lead', items: [
          { icon: '🧳', text: '5+ năm kinh nghiệm', sub: '2+ năm làm chủ sản phẩm' },
          { icon: '💻', text: 'Laravel · React · Next.js' },
          { icon: '📊', text: 'Roadmap · KPI · SQL' },
          { icon: '🛠️', text: 'Code thực chiến · AI tools' },
        ] },
        { tag: '🧠 AI & GenAI', title: 'Senior AI Engineer', items: [
          { icon: '🧳', text: '5+ năm kinh nghiệm', sub: '2+ năm LLM/VLM/GenAI' },
          { icon: '🤖', text: 'LLM · VLM · Agentic AI' },
          { icon: '🎬', text: 'Multimodal · Video/Audio' },
          { icon: '⚙️', text: 'Fine-tuning · MLOps' },
        ] },
      ],
      contacts: ['✉️ tuyendung@congty.vn', '📞 0909 123 456'], cta: 'Biết ai giỏi? Giới thiệu nhé!', rows: [],
    },
  },
  {
    name: 'Poster Flash Sale', bg: 'd_navy', theme: 'red',
    data: {
      layout: 'poster', variant: 'bigdeal', brand: 'Mộc Store', note: 'Chỉ 1 ngày duy nhất',
      kicker: 'Flash Sale', title: 'Sale sập sàn', title2: 'cuối năm.', tagline: 'Giá chạm đáy!',
      bigText: '12.12', code: 'SAPSAN12',
      hero: ['fire', 'shopping_cart', 'money_bag'],
      cards: [
        { tag: '⚡ Khung giờ vàng', title: 'Deal 0h – 2h', items: [
          { icon: '🔥', text: 'Đồng giá 12k', sub: '100 suất mỗi khung' },
          { icon: '💥', text: 'Giảm đến 70%', sub: 'Toàn bộ hàng hot' },
          { icon: '⏰', text: 'Mở lại lúc 12h', sub: 'Đặt báo thức nhé' },
        ] },
        { tag: '🎟️ Voucher', title: 'Săn mã thêm', items: [
          { icon: '🎫', text: 'Mã giảm 50k', sub: 'Đơn từ 299k' },
          { icon: '🚚', text: 'Freeship 0đ', sub: 'Không giới hạn' },
          { icon: '💳', text: 'Hoàn xu 10%', sub: 'Thanh toán bằng ví' },
        ] },
      ],
      contacts: ['🛒 Shopee: tenshop', '📱 TikTok: @tenshop'], cta: 'Tag đứa hay săn sale!', rows: [],
    },
  },
  {
    name: 'Poster mỹ phẩm', bg: 'd_navy', theme: 'pink',
    data: {
      layout: 'poster', variant: 'bento', brand: 'Glow Lab', note: 'Da xinh mỗi ngày',
      kicker: 'Hàng mới về', title: 'Serum', title2: 'cấp ẩm.', tagline: 'Mềm mịn tự nhiên',
      hero: ['lotion_bottle', 'lipstick', 'sparkles'],
      cards: [
        { tag: '🌿 Thành phần', title: 'Lành tính', items: [
          { icon: '💧', text: 'Hyaluronic Acid', sub: 'Cấp ẩm sâu' },
          { icon: '🌸', text: 'Chiết xuất hoa hồng', sub: 'Dịu nhẹ cho da' },
          { icon: '🧪', text: 'Không cồn, không paraben' },
        ] },
        { tag: '🎁 Combo', title: 'Mua 2 tặng 1', items: [
          { icon: '🛍️', text: 'Combo 2 chai 399k', sub: 'Tiết kiệm 120k' },
          { icon: '💄', text: 'Tặng son mini', sub: 'Đơn từ 299k' },
          { icon: '🚚', text: 'Giao nhanh 2h', sub: 'Nội thành' },
        ] },
      ],
      contacts: ['📞 0909 123 456', '📍 fb.com/tenshop'], cta: 'Inbox để được tư vấn!', rows: [],
    },
  },
  {
    name: 'Poster trà sữa / quán', bg: 'd_navy', theme: 'orange',
    data: {
      layout: 'poster', variant: 'menu', brand: 'Trà Mây', note: 'Mở cửa 8h – 22h',
      kicker: 'Menu mới', title: 'Trà sữa', title2: 'mùa thu.', tagline: 'Ngọt vừa, thơm lâu',
      hero: ['bubble_tea', 'hot_beverage', 'birthday_cake'],
      cards: [
        { tag: '🧋 Món hot', title: 'Best seller', items: [
          { icon: '🧋', text: 'Trà sữa khoai môn', sub: '35k' },
          { icon: '🍵', text: 'Matcha kem cheese', sub: '39k' },
          { icon: '☕', text: 'Cà phê muối', sub: '29k' },
        ] },
        { tag: '🎉 Ưu đãi tuần', title: 'Uống là vui', items: [
          { icon: '2️⃣', text: 'Mua 2 giảm 20%', sub: 'Thứ 2 – Thứ 5' },
          { icon: '🎂', text: 'Sinh nhật free 1 ly', sub: 'Kèm CCCD' },
          { icon: '🛵', text: 'Giao tận nơi 3km', sub: 'Đơn từ 60k' },
        ] },
      ],
      contacts: ['📞 0909 123 456', '🛵 GrabFood · ShopeeFood'], cta: 'Rủ cạ cứng đi uống!', rows: [],
    },
  },
  {
    name: 'Poster BST thời trang', bg: 'd_navy', theme: 'violet',
    data: {
      layout: 'poster', variant: 'collage', brand: 'Mộc Store', note: 'Số lượng có hạn',
      kicker: 'BST mới', title: 'Thu này', title2: 'mặc gì?', tagline: 'Nhẹ nhàng mà chất',
      hero: ['dress', 'handbag', 'high_heeled_shoe'],
      cards: [
        { tag: '👗 Bộ sưu tập', title: 'Autumn 2026', items: [
          { icon: '👗', text: 'Đầm midi 2 màu', sub: 'Size S – XL' },
          { icon: '🧥', text: 'Blazer form rộng', sub: 'Vải tuyết mưa' },
          { icon: '👜', text: 'Túi kẹp nách', sub: 'Phối mọi outfit' },
        ] },
        { tag: '🛡️ Chính sách', title: 'Mua yên tâm', items: [
          { icon: '🔄', text: 'Đổi size 7 ngày', sub: 'Miễn phí' },
          { icon: '📦', text: 'Kiểm hàng trước', sub: 'Rồi mới thanh toán' },
          { icon: '🚚', text: 'Freeship đơn 299k' },
        ] },
      ],
      contacts: ['🛒 Shopee: tenshop', '📱 Zalo: 0909 123 456'], cta: 'Lưu lại để chốt đơn!', rows: [],
    },
  },
  {
    name: 'Poster minigame / giveaway', bg: 'd_navy', theme: 'blue',
    data: {
      layout: 'poster', variant: 'steps', brand: 'Mộc Store', note: 'Kết quả 20h Chủ nhật',
      kicker: 'Minigame', title: 'Giveaway', title2: 'mừng 10K.', tagline: 'Quà xịn, dễ trúng!',
      hero: ['wrapped_gift', 'trophy', 'party_popper'],
      cards: [
        { tag: '📝 Cách tham gia', title: '3 bước dễ ợt', items: [
          { icon: '1️⃣', text: 'Like + follow page' },
          { icon: '2️⃣', text: 'Tag 2 người bạn', sub: 'Vào bình luận bài này' },
          { icon: '3️⃣', text: 'Share công khai', sub: 'Kèm #MocStore10K' },
        ] },
        { tag: '🏆 Giải thưởng', title: '5 phần quà', items: [
          { icon: '🥇', text: 'Voucher 1 triệu', sub: '1 giải nhất' },
          { icon: '🥈', text: 'Voucher 300k', sub: '2 giải nhì' },
          { icon: '🎁', text: 'Set quà xinh', sub: '2 giải khuyến khích' },
        ] },
      ],
      contacts: ['📍 fb.com/tenshop', '⏰ Hạn chót 23h59 Thứ 7'], cta: 'Tham gia liền tay!', rows: [],
    },
  },
  {
    name: 'Reality / Hot-take (so sánh)', bg: 'd_navy',
    data: {
      kicker: 'Chia sẻ thật', title: 'React Native', title2: 'Reality 📱',
      hook: 'Nhìn thì dễ… tới lúc ship lên production 😅',
      rows: [
        { icon: '🤖', left: 'Android chạy ngon', right: 'iOS vỡ trận' },
        { icon: '🐞', left: 'Debug thì ổn', right: 'Release crash' },
        { icon: '⌨️', left: 'UI nhìn đẹp', right: 'Bật bàn phím là hỏng' },
        { icon: '📱', left: 'Máy nào cũng chạy', right: 'Trừ 1 máy của sếp' },
      ],
      insight: 'Trải nghiệm thật bắt đầu ở nơi tutorial kết thúc.',
      cta: 'Anh em thấy đúng không? 👇', brand: '✸ mivy',
    },
  },
  {
    name: 'Sự thật phũ bán hàng (so sánh)', bg: 'd_wine',
    data: {
      kicker: 'Sự thật phũ', title: 'Bán hàng Online', title2: 'nhìn dễ mà… 🥲',
      hook: 'Ai cũng tưởng cứ đăng là có đơn',
      rows: [
        { icon: '📸', left: 'Chụp ảnh đẹp', right: 'Vẫn không ai bấm vào' },
        { icon: '💬', left: 'Rep tin nhắn 24/7', right: '“Để em hỏi lại” rồi mất hút' },
        { icon: '🚚', left: 'Giá rẻ nhất sàn', right: 'Khách vẫn so giá' },
        { icon: '⭐', left: 'Hàng xịn thật', right: '1 sao vì shipper trễ' },
      ],
      insight: 'Khác biệt nằm ở thương hiệu, không phải giá.',
      cta: 'Chủ shop nào thấm điểm nào? 👇', brand: '✸ mivy',
    },
  },
  {
    name: 'Tips / Checklist (liệt kê)', bg: 'n_cream',
    data: {
      kicker: '5 điều ước', title: 'Giá mà biết sớm', title2: 'khi mới bán hàng',
      hook: 'Tiết kiệm anh em vài tháng mò mẫm 🔥',
      rows: [
        { icon: '🎯', left: 'Chọn 1 tệp khách thật rõ, đừng bán cho tất cả' },
        { icon: '🖼️', left: 'Ảnh/banner nhất quán ăn đứt chạy quảng cáo bừa' },
        { icon: '🔁', left: 'Khách cũ mua lại > tốn tiền kéo khách mới' },
        { icon: '📊', left: 'Đo số mỗi ngày, đừng bán theo cảm tính' },
      ],
      insight: 'Làm đều 1 việc nhỏ mỗi ngày > bùng nổ 1 hôm.',
      cta: 'Lưu lại để làm dần nhé 👇', brand: '✸ mivy',
    },
  },
  {
    name: 'Ra mắt / Feature (card + terminal)', bg: 'd_midnight',
    data: {
      kicker: 'Release Candidate', title: 'React Native', title2: '0.88',
      hook: 'Nền tảng ổn định hơn — nhiều cải tiến đáng giá.',
      rows: [
        { icon: '⚛️', left: 'React 19.3', right: 'Tích hợp & cải tiến' },
        { icon: '⚡', left: 'Hermes Updates', right: 'Hiệu năng & ổn định' },
        { icon: '📦', left: 'Event Handling', right: 'Sửa lỗi & cải tiến' },
        { icon: '🍎', left: 'Swift Package Manager', right: 'Hỗ trợ iOS tốt hơn' },
      ],
      command: 'npx react-native@0.88.0-rc', layout: 'feature', brand: '✸ mivy',
    },
  },
];

const BG_GROUPS = Array.from(new Set(AD_BACKGROUNDS.map((b) => b.group)));

// Bộ ảnh đa sàn: 1 nội dung → đủ khổ chuẩn từng nền tảng.
const PLATFORMS: { aspect: Aspect; file: string }[] = [
  { aspect: '1:1', file: 'shopee-lazada-tiktokshop_1080x1080' },
  { aspect: '4:5', file: 'facebook-instagram_1080x1350' },
  { aspect: '9:16', file: 'tiktok-reels-story-zalo_1080x1920' },
];

// Liên hệ từ bộ nhận diện → tối đa 2 dòng footer poster.
function kitContacts(b: BrandKit): string[] {
  const c = b.contact || {};
  return [c.phone && `📞 ${c.phone}`, c.zalo && `💬 Zalo ${c.zalo}`, c.facebook && `👍 ${c.facebook}`, c.website && `🌐 ${c.website}`, c.address && `📍 ${c.address}`]
    .filter((x): x is string => !!x).slice(0, 2);
}
const withKit = (d: InfographicData, b: BrandKit): InfographicData => {
  const cs = kitContacts(b);
  return { ...d, brand: b.name || d.brand, logo: b.logo, contacts: cs.length ? cs : d.contacts };
};

export default function InfographicStudio() {
  const [bgId, setBgId] = useState<string>(TEMPLATES[0].bg);
  const [themeId, setThemeId] = useState<PosterThemeId | 'brand'>(TEMPLATES[0].theme || 'blue');
  const [aspect, setAspect] = useState<Aspect>('4:5');
  const [data, setData] = useState<InfographicData>(TEMPLATES[0].data);
  const [full, setFull] = useState(false); // xem toàn màn hình
  const [heroSlot, setHeroSlot] = useState(0);
  // Cột xem trước (màn rộng) cao vừa khít phần màn hình còn lại → ảnh luôn hiện trọn, không bị cắt đáy
  const [colEl, setColEl] = useState<HTMLDivElement | null>(null);
  const [colH, setColH] = useState<number | null>(null);
  useEffect(() => {
    const el = colEl; if (!el) return;
    const scroller = el.closest('main') || window;
    const fit = () => setColH(window.innerWidth >= 1024 ? Math.max(360, Math.round(window.innerHeight - el.getBoundingClientRect().top - 16)) : null);
    fit(); scroller.addEventListener('scroll', fit, { passive: true }); window.addEventListener('resize', fit);
    return () => { scroller.removeEventListener('scroll', fit); window.removeEventListener('resize', fit); };
  }, [colEl]);
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [full]); // ô hình chính đang chọn để thay
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [useKit, setUseKit] = useState(false);
  const [cutting, setCutting] = useState<string | null>(null);
  const [zipState, setZipState] = useState('');
  const [zipErr, setZipErr] = useState('');
  const htmlPreviewRef = useRef<TemplateHtmlPreviewHandle | null>(null);
  const isFeature = data.layout === 'feature';
  const isPoster = data.layout === 'poster';
  const bg = getBackground(bgId) || AD_BACKGROUNDS[0];
  const posterTheme = themeId === 'brand' ? (kit ? posterColorsFromBrand(kit) : 'blue') : themeId;
  const renderFor = (a: Aspect) => (isPoster ? renderPosterInfographic(data, posterTheme, a)
    : isFeature ? renderFeatureInfographic(data, bg, a) : renderListInfographic(data, bg, a));
  const rendered = renderFor(aspect);

  // Bộ nhận diện đã lưu (/studio/brand) → tự áp: tên shop, logo, liên hệ, màu thương hiệu
  useEffect(() => {
    const b = loadBrand();
    if (!b || !(b.name || b.logo)) return;
    setKit(b);
    setUseKit(true);
    setThemeId('brand');
    setData((d) => withKit(d, b));
  }, []);
  const toggleKit = () => {
    if (!kit) return;
    const on = !useKit;
    setUseKit(on);
    if (on) { setData((d) => withKit(d, kit)); setThemeId('brand'); }
    else { setData((d) => ({ ...d, logo: undefined })); if (themeId === 'brand') setThemeId('blue'); }
  };
  const tpl = { id: `infographic-${data.layout || 'list'}-${isPoster ? `${data.variant || 'split'}-${themeId}` : bgId}`, title: 'Infographic', group: 'Infographic', ...rendered };

  const set = (patch: Partial<InfographicData>) => setData((d) => ({ ...d, ...patch }));
  const setRow = (i: number, patch: Partial<InfographicRow>) =>
    setData((d) => ({ ...d, rows: d.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));
  const addRow = () => setData((d) => ({ ...d, rows: [...d.rows, { icon: '✅', left: 'Ý mới', right: '' }] }));
  const delRow = (i: number) => setData((d) => ({ ...d, rows: d.rows.filter((_, idx) => idx !== i) }));

  // poster: card + minh hoạ
  const cards = data.cards || [];
  const setCard = (ci: number, patch: Partial<PosterCard>) =>
    setData((d) => ({ ...d, cards: (d.cards || []).map((c, i) => (i === ci ? { ...c, ...patch } : c)) }));
  const setItem = (ci: number, ii: number, patch: Partial<PosterCard['items'][number]>) =>
    setCard(ci, { items: cards[ci].items.map((it, i) => (i === ii ? { ...it, ...patch } : it)) });
  const toggleHero = (id: string) => setData((d) => {
    const h = d.hero || [];
    if (h.includes(id)) return { ...d, hero: h.filter((x) => x !== id) };
    return { ...d, hero: h.length < 3 ? [...h, id] : [...h.slice(0, 2), id] };
  });
  // Bấm hình minh hoạ: đã chọn → bỏ; chưa → đặt vào ô đang chọn rồi nhảy sang ô kế.
  const pickHero = (id: string) => {
    const h = data.hero || [];
    const at = h.indexOf(id);
    if (at >= 0) { setData((d) => ({ ...d, hero: h.filter((x) => x !== id) })); setHeroSlot(Math.min(at, h.length - 1)); return; }
    const s = Math.min(heroSlot, h.length);
    const next = s < h.length ? h.map((x, i) => (i === s ? id : x)) : [...h, id];
    setData((d) => ({ ...d, hero: next }));
    setHeroSlot(next.length < 3 ? next.length : (s + 1) % 3);
  };

  const loadTemplate = (t: typeof TEMPLATES[number]) => {
    setBgId(t.bg);
    if (t.theme && !(useKit && kit)) setThemeId(t.theme);
    setData(useKit && kit ? withKit(t.data, kit) : t.data);
  };

  // Ảnh sản phẩm thật làm hình chính (ảnh mới lên đầu = hình to nhất). Tách nền chỉ khi user bấm.
  const customHeroes = (data.hero || []).filter(isCustomHero);
  const onUpload = async (files: FileList | null) => {
    for (const f of Array.from(files || []).slice(0, 3)) {
      const url = await scaleImage(f);
      setData((d) => ({ ...d, hero: [url, ...(d.hero || [])].slice(0, 3) }));
    }
  };
  const cutoutHero = async (src: string) => {
    if (cutting) return;
    setCutting(src);
    try {
      const url = await cutoutImage(src);
      setData((d) => ({ ...d, hero: (d.hero || []).map((h) => (h === src ? url : h)) }));
    } catch {
      /* tách lỗi → giữ ảnh gốc */
    } finally {
      setCutting(null);
    }
  };

  const download = async () => { await htmlPreviewRef.current?.exportPng(); };

  // 1 chạm: xuất đủ khổ các sàn → 1 file .zip
  const downloadAll = async () => {
    if (zipState) return;
    setZipErr('');
    try {
      const slug = slugify(`${data.title} ${data.title2 || ''}`);
      const files: Record<string, Uint8Array> = {};
      for (const [i, p] of PLATFORMS.entries()) {
        setZipState(`Đang xuất ${i + 1}/${PLATFORMS.length}…`);
        const blob = await renderHtmlToPng(renderFor(p.aspect));
        files[`${slug}-${p.file}.png`] = new Uint8Array(await blob.arrayBuffer());
      }
      const { zipSync } = await import('fflate');
      downloadBlob(new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: 'application/zip' }), `${slug}-bo-anh-da-san.zip`);
    } catch {
      setZipErr('Xuất bộ ảnh bị lỗi, anh bấm lại giúp em nhé.');
    } finally {
      setZipState('');
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-5">
        <h1 className="mv-h1 !text-2xl flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" /> Infographic trend</h1>
        <p className="mv-sub !mt-0.5">Điền nội dung → preview đổi ngay → tải PNG. Render 100% bằng code (không tốn AI).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 items-start">
        {/* CỘT TRÁI: điều khiển */}
        <div className="space-y-4 min-w-0">
          {/* Bộ nhận diện: nhập 1 lần ở /studio/brand → tự điền vào poster */}
          <div className="glass-panel border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
            {kit ? (<>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {kit.logo ? <img src={kit.logo} alt="" className="w-9 h-9 rounded-lg bg-white object-contain p-1 shrink-0" /> : <BadgeCheck className="w-5 h-5 text-indigo-300 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">Bộ nhận diện: {kit.name || 'Chưa đặt tên'}</div>
                <div className="text-[11px] text-slate-400">Tự điền tên shop, logo, liên hệ & màu thương hiệu vào ảnh.</div>
              </div>
              <button type="button" role="switch" aria-checked={useKit} onClick={toggleKit} title="Bật/tắt bộ nhận diện"
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${useKit ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-white/20 text-slate-300 hover:border-white/40'}`}>
                {useKit ? 'Đang dùng' : 'Dùng'}
              </button>
            </>) : (<>
              <BadgeCheck className="w-5 h-5 text-slate-400 shrink-0" />
              <div className="flex-1 text-xs text-slate-300">Chưa có bộ nhận diện. Nhập 1 lần, mọi ảnh tự có logo, màu và liên hệ của shop.</div>
              <Link href="/studio/brand" className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs shrink-0">Tạo ngay</Link>
            </>)}
          </div>

          {/* 1 · Mẫu */}
          <CollapsibleSection title="1 · Chọn mẫu">
            <p className="text-[11px] text-slate-400 mb-2.5">Bấm 1 mẫu để nạp nội dung + phong cách mồi, rồi chỉnh bên dưới.</p>
            {[
              { label: 'Poster minh hoạ', list: TEMPLATES.filter((t) => t.data.layout === 'poster') },
              { label: 'Infographic chữ', list: TEMPLATES.filter((t) => t.data.layout !== 'poster') },
            ].map((g) => (
              <div key={g.label} className="mb-2.5 last:mb-0">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">{g.label}</div>
                <div className="flex flex-wrap gap-2">
                  {g.list.map((t) => (
                    <button key={t.name} type="button" onClick={() => loadTemplate(t)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${data === t.data ? 'border-indigo-400 bg-indigo-500/15 text-white' : 'border-white/15 text-slate-200 hover:border-indigo-400 hover:text-white'}`}>{t.name}</button>
                  ))}
                </div>
              </div>
            ))}
          </CollapsibleSection>

          {/* 2 · Màu nền & Khổ */}
          <CollapsibleSection title="2 · Màu nền & Khổ">
            {isPoster ? (<>
              <div className="mv-label mb-1.5">Bố cục</div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {POSTER_VARIANTS.map((pv) => (
                  <button key={pv.id} type="button" onClick={() => set({ variant: pv.id })}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${(data.variant || 'split') === pv.id ? 'bg-white text-slate-950 border-white' : 'border-white/15 text-slate-300 hover:text-white hover:border-white/40'}`}>
                    {pv.name}
                  </button>
                ))}
              </div>
              <div className="mv-label mb-1.5">Màu chủ đạo</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {kit && (() => { const bc = posterColorsFromBrand(kit); return (
                  <button type="button" onClick={() => setThemeId('brand')} title="Màu từ bộ nhận diện"
                    className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${themeId === 'brand' ? 'border-white bg-white/10 text-white' : 'border-white/15 text-slate-300 hover:border-white/40'}`}>
                    <span className="w-5 h-5 rounded-full" style={{ background: bc.main, boxShadow: `inset 0 0 0 3px ${bc.soft}` }} />Thương hiệu
                  </button>); })()}
                {POSTER_THEMES.map((t) => (
                  <button key={t.id} type="button" onClick={() => setThemeId(t.id)} title={t.name}
                    className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${themeId === t.id ? 'border-white bg-white/10 text-white' : 'border-white/15 text-slate-300 hover:border-white/40'}`}>
                    <span className="w-5 h-5 rounded-full" style={{ background: t.main, boxShadow: `inset 0 0 0 3px ${t.soft}` }} />{t.name}
                  </button>
                ))}
              </div>
            </>) : (<>
            <div className="mv-label mb-1.5">Màu nền</div>
            <div className="space-y-3 mb-4">
              {BG_GROUPS.map((group) => (
                <div key={group}>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">{group}</div>
                  <div className="flex flex-wrap gap-2">
                    {AD_BACKGROUNDS.filter((b) => b.group === group).map((b) => (
                      <button key={b.id} type="button" onClick={() => setBgId(b.id)} title={b.name}
                        className={`w-9 h-9 rounded-lg border-2 transition-all ${bgId === b.id ? 'border-white scale-110 shadow-lg' : 'border-white/10 hover:border-white/40'}`}
                        style={{ background: b.css, backgroundSize: 'cover' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            </>)}
            <div className="mv-label mb-1.5">Khổ</div>
            <div className="flex flex-wrap gap-1.5">
              {(['4:5', '1:1', '9:16'] as Aspect[]).map((a) => (
                <button key={a} type="button" onClick={() => setAspect(a)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${aspect === a ? 'bg-white text-slate-950 border-white' : 'border-white/15 text-slate-300 hover:text-white hover:border-white/40'}`}>
                  {a === '4:5' ? 'Dọc 4:5' : a === '1:1' ? 'Vuông 1:1' : 'Story 9:16'}
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* 3 · Nội dung */}
          <CollapsibleSection title="3 · Nội dung">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <L label={isPoster ? 'Chữ viết tay trên (pill)' : 'Nhãn trên (kicker)'}><input className="mv-input" value={data.kicker || ''} onChange={(e) => set({ kicker: e.target.value })} placeholder={isPoster ? 'VD: Khai trương' : 'VD: Sự thật phũ'} /></L>
              <L label="Thương hiệu / watermark"><input className="mv-input" value={data.brand || ''} onChange={(e) => set({ brand: e.target.value })} placeholder="✸ mivy" /></L>
              <L label="Tiêu đề (dòng 1)"><input className="mv-input" value={data.title} onChange={(e) => set({ title: e.target.value })} placeholder="VD: Bán hàng Online" /></L>
              <L label="Tiêu đề (dòng 2)"><input className="mv-input" value={data.title2 || ''} onChange={(e) => set({ title2: e.target.value })} placeholder="VD: nhìn dễ mà… 🥲" /></L>
            </div>
            {isPoster ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <L label="Dòng viết tay dưới tiêu đề"><input className="mv-input" value={data.tagline || ''} onChange={(e) => set({ tagline: e.target.value })} placeholder="VD: Giảm đến 50%!" /></L>
                <L label="Ghi chú góc phải (viết tay)"><input className="mv-input" value={data.note || ''} onChange={(e) => set({ note: e.target.value })} placeholder="VD: Hàng xịn giá mềm" /></L>
                {data.variant === 'bigdeal' && (<>
                  <L label="Số / chữ cực to"><input className="mv-input" value={data.bigText || ''} onChange={(e) => set({ bigText: e.target.value })} placeholder="VD: 12.12  ·  -50%" /></L>
                  <L label="Mã voucher (vé)"><input className="mv-input" value={data.code || ''} onChange={(e) => set({ code: e.target.value })} placeholder="VD: SAPSAN12" /></L>
                </>)}
              </div>
            ) : (
              <div className="mt-3"><L label="Câu móc (hook)"><input className="mv-input" value={data.hook || ''} onChange={(e) => set({ hook: e.target.value })} placeholder="VD: Ai cũng tưởng cứ đăng là có đơn" /></L></div>
            )}
          </CollapsibleSection>

          {/* 4 · Poster: minh hoạ 3D + card */}
          {isPoster && (<>
          <CollapsibleSection title="4 · Hình chính" right={<span className="text-[11px] text-slate-400">{(data.hero || []).length}/3</span>}>
            <div className="mb-3 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="mv-label">Ảnh sản phẩm của anh</span>
                <label className="mv-btn mv-btn-ghost !px-3 !py-1.5 !text-xs cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Tải ảnh
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" data-testid="hero-upload"
                    onChange={(e) => { onUpload(e.target.files); e.target.value = ''; }} />
                </label>
              </div>
              {customHeroes.length ? (
                <div className="flex gap-2.5 flex-wrap">
                  {customHeroes.map((src, i) => (
                    <div key={i} className="relative w-20">
                      <div className="w-20 h-20 rounded-lg border border-white/15 p-1" style={{ background: 'repeating-conic-gradient(#ffffff14 0 25%, transparent 0 50%) 0 0/12px 12px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full h-full object-contain" />
                      </div>
                      <button type="button" onClick={() => cutoutHero(src)} disabled={!!cutting}
                        className="mt-1 w-full flex items-center justify-center gap-1 rounded-md border border-white/15 py-1 text-[10px] font-semibold text-slate-200 hover:border-indigo-400 disabled:opacity-50">
                        {cutting === src ? <><Loader2 className="w-3 h-3 animate-spin" /> Đang tách…</> : '✂ Tách nền'}
                      </button>
                      <button type="button" onClick={() => toggleHero(src)} title="Bỏ ảnh"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Ảnh thật sẽ thay hình 3D làm hình chính. Ảnh còn nền thì bấm &quot;✂ Tách nền&quot;.</p>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mb-2">Hoặc chọn hình minh hoạ 3D: bấm ô cần thay, rồi bấm hình bên dưới (ô 1 là hình chính, to nhất).</p>
            <div className="flex gap-2 mb-2.5" data-testid="hero-slots">
              {[0, 1, 2].map((i) => {
                const v = (data.hero || [])[i]; const on = heroSlot === i;
                return (
                  <button key={i} type="button" onClick={() => setHeroSlot(i)}
                    className={`relative w-16 h-16 rounded-lg border-2 p-1.5 transition-colors ${on ? 'border-indigo-400 bg-indigo-500/15' : 'border-white/10 border-dashed hover:border-white/30'}`}>
                    {v ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={isCustomHero(v) ? v : illustrationUrl(v)} alt="" className="w-full h-full object-contain" />
                    ) : <span className="text-[10px] text-slate-500">Trống</span>}
                    <span className={`absolute -top-1.5 -left-1.5 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center ${on ? 'bg-indigo-500' : 'bg-slate-600'}`}>{i === 0 ? '1 · chính' : i + 1}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {ILLUSTRATIONS.map((il) => {
                const idx = (data.hero || []).indexOf(il.id);
                return (
                  <button key={il.id} type="button" onClick={() => pickHero(il.id)} title={`${il.name} · ${il.group}`}
                    className={`relative aspect-square rounded-lg border p-1 transition-colors ${idx >= 0 ? 'border-indigo-400 bg-indigo-500/15' : 'border-white/10 hover:border-white/30 bg-white/[0.03]'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={illustrationUrl(il.id)} alt={il.name} className="w-full h-full object-contain" loading="lazy" />
                    {idx >= 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-[9px] font-bold text-white flex items-center justify-center">{idx + 1}</span>}
                  </button>
                );
              })}
            </div>
          </CollapsibleSection>

          {cards.map((c, ci) => (
            <CollapsibleSection key={ci} title={`${ci === 0 ? '5' : '6'} · Card ${ci + 1}`} defaultOpen={ci === 0}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <L label="Nhãn (pill)"><input className="mv-input" value={c.tag} onChange={(e) => setCard(ci, { tag: e.target.value })} placeholder="🎁 Ưu đãi" /></L>
                <L label="Tiêu đề card"><input className="mv-input" value={c.title} onChange={(e) => setCard(ci, { title: e.target.value })} placeholder="Quà chào sân" /></L>
              </div>
              <div className="space-y-2 mt-3">
                {c.items.map((it, ii) => (
                  <div key={ii} className="flex items-center gap-2">
                    <input className="mv-input !w-12 !px-2 text-center" value={it.icon || ''} onChange={(e) => setItem(ci, ii, { icon: e.target.value })} placeholder="✦" title="Emoji" />
                    <input className="mv-input flex-1 min-w-0" value={it.text} onChange={(e) => setItem(ci, ii, { text: e.target.value })} placeholder="Ý chính" />
                    <input className="mv-input flex-1 min-w-0" value={it.sub || ''} onChange={(e) => setItem(ci, ii, { sub: e.target.value })} placeholder="Dòng phụ (tuỳ chọn)" />
                    <button type="button" onClick={() => setCard(ci, { items: c.items.filter((_, i) => i !== ii) })} className="mv-btn mv-btn-ghost !p-2 !text-rose-300" title="Xoá dòng"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              {c.items.length < 4 && (
                <button type="button" onClick={() => setCard(ci, { items: [...c.items, { icon: '✅', text: 'Ý mới' }] })} className="mv-btn mv-btn-ghost !px-3 !py-2 !text-xs mt-3"><Plus className="w-3.5 h-3.5" /> Thêm dòng</button>
              )}
            </CollapsibleSection>
          ))}

          <CollapsibleSection title={`${cards.length ? 4 + cards.length + 1 : 5} · Liên hệ & CTA`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <L key={i} label={`Liên hệ ${i + 1}`}><input className="mv-input" value={(data.contacts || [])[i] || ''}
                  onChange={(e) => { const cs = [...(data.contacts || ['', ''])]; cs[i] = e.target.value; set({ contacts: cs }); }} placeholder={i ? '📍 fb.com/tenshop' : '📞 0909 123 456'} /></L>
              ))}
            </div>
            <div className="mt-3"><L label="CTA viết tay (có mũi tên)"><input className="mv-input" value={data.cta || ''} onChange={(e) => set({ cta: e.target.value })} placeholder="VD: Rủ bạn cùng săn!" /></L></div>
          </CollapsibleSection>
          </>)}

          {/* 4 · Các dòng */}
          {!isPoster && (<>
          <CollapsibleSection title="4 · Các dòng">
            <p className="text-[11px] text-slate-400 mb-2.5">Để trống ô phải = kiểu liệt kê; điền ô phải = so sánh.</p>
            <div className="space-y-2.5">
              {data.rows.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className="mv-input !w-12 !px-2 text-center" value={r.icon || ''} onChange={(e) => setRow(i, { icon: e.target.value })} placeholder="🔥" title="Emoji" />
                  <input className="mv-input flex-1 min-w-0" value={r.left} onChange={(e) => setRow(i, { left: e.target.value })} placeholder="Vế trái" />
                  <input className="mv-input flex-1 min-w-0" value={r.right || ''} onChange={(e) => setRow(i, { right: e.target.value })} placeholder="Vế phải (tùy chọn)" />
                  <button type="button" onClick={() => delRow(i)} className="mv-btn mv-btn-ghost !p-2 !text-rose-300" title="Xoá dòng"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addRow} className="mv-btn mv-btn-ghost !px-3 !py-2 !text-xs mt-3"><Plus className="w-3.5 h-3.5" /> Thêm dòng</button>
          </CollapsibleSection>

          {/* 5 · Chốt & CTA / Terminal */}
          <CollapsibleSection title="5 · Chốt & CTA">
            {isFeature ? (
              <L label="Dòng lệnh / Mã (thanh terminal)"><input className="mv-input" value={data.command || ''} onChange={(e) => set({ command: e.target.value })} placeholder="VD: npx react-native@0.88.0-rc  ·  MÃ: THU2026" /></L>
            ) : (<>
              <L label="Câu chốt (hộp nổi bật)"><input className="mv-input" value={data.insight || ''} onChange={(e) => set({ insight: e.target.value })} placeholder="VD: Khác biệt nằm ở thương hiệu, không phải giá." /></L>
              <div className="mt-3"><L label="CTA (câu hỏi tương tác)"><input className="mv-input" value={data.cta || ''} onChange={(e) => set({ cta: e.target.value })} placeholder="VD: Chủ shop nào thấm? 👇" /></L></div>
            </>)}
          </CollapsibleSection>
          </>)}
        </div>

        {/* CỘT PHẢI: preview ghim + tải — cao đúng bằng màn hình để luôn thấy trọn ảnh */}
        <div ref={setColEl} style={colH ? { height: colH } : undefined} className="lg:sticky lg:top-4 self-start flex flex-col gap-3">
          <div className="glass-card p-3 rounded-2xl space-y-2 hover:!transform-none border border-indigo-500/40 ring-1 ring-indigo-500/25 bg-indigo-500/[0.06] shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <AsyncButton onClick={download} loadingText="Đang xuất…" className="mv-btn mv-btn-primary w-full !flex justify-center !py-2.5 !text-sm disabled:opacity-70">
                <Download className="w-4 h-4" /> <span>Tải PNG</span>
              </AsyncButton>
              <button type="button" onClick={downloadAll} disabled={!!zipState} className="mv-btn mv-btn-ghost w-full !flex justify-center !py-2.5 !text-sm disabled:opacity-60" title="1080×1080 Shopee · Lazada · TikTok Shop — 1080×1350 Facebook · Instagram — 1080×1920 TikTok · Story · Zalo">
                {zipState ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />} <span className="truncate">{zipState || 'Bộ đa sàn (.zip)'}</span>
              </button>
            </div>
            {zipErr && <p className="text-[11px] text-rose-300 text-center">{zipErr}</p>}
          </div>
          <div className="glass-panel rounded-2xl p-3 border border-white/10 flex flex-col min-h-0 lg:flex-1">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-sm font-bold text-white">Xem trước <span className="ml-1 text-[10px] font-semibold text-indigo-200">PNG · 2×</span></span>
              <button type="button" onClick={() => setFull(true)} data-testid="preview-full" className="mv-btn mv-btn-ghost !px-2.5 !py-1.5 !text-xs"><Maximize2 className="w-3.5 h-3.5" /> Toàn màn hình</button>
            </div>
            <div className="min-h-0 lg:flex-1 cursor-zoom-in" onClick={() => setFull(true)} data-testid="preview-box">
              <TemplateHtmlPreview ref={htmlPreviewRef} template={tpl} content={{}} noFill maxHeightVh={62} fitHeight={!!colH} />
            </div>
          </div>
        </div>
      </div>

      {full && typeof document !== 'undefined' && createPortal((
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setFull(false)} data-testid="preview-overlay">
          <button type="button" onClick={() => setFull(false)}
            className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20">
            <X className="w-4 h-4" /> Đóng
          </button>
          <div className="w-full h-full pointer-events-none">
            <TemplateHtmlPreview template={tpl} content={{}} noFill fitHeight />
          </div>
        </div>
      ), document.body)}
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mv-label block mb-1.5">{label}</span>{children}</label>;
}
