// SEO metadata cho mọi trang /studio/* — 1 nguồn sự thật, lấy từ product-catalog.
// Mỗi route studio có 1 layout.tsx server nhỏ gọi studioMeta(slug) để export metadata
// (page vẫn là client, không đụng tới → không rủi ro UI). Sitemap dùng STUDIO_SEO_SLUGS.
import type { Metadata } from 'next';
import { PRODUCTS } from './product-catalog';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mivy.vn').replace(/\/$/, '');

const slugOf = (href: string) =>
  href.split('?')[0].replace(/^\/studio\//, '').replace(/\/$/, '');

type Entry = { name: string; blurb: string; keywords: string[] };

// Gom catalog theo route: tên + blurb của sản phẩm đầu tiên, GỘP keywords của mọi
// sản phẩm trỏ cùng route (vd /studio/sticker ăn keyword của sticker + tem + decal).
const CATALOG = new Map<string, Entry>();
for (const p of PRODUCTS) {
  if (p.mode !== 'studio') continue; // custom đều trỏ /studio/print-custom?need=...
  const s = slugOf(p.href);
  if (!s || s.includes('/')) continue;
  const cur = CATALOG.get(s);
  if (!cur) CATALOG.set(s, { name: p.name, blurb: p.blurb, keywords: [...p.keywords] });
  else cur.keywords.push(...p.keywords);
}

// Trang công khai không có trong catalog (vẫn index).
const PUBLIC_OVERRIDES: Record<string, Entry> = {
  'print-custom': {
    name: 'Đặt in theo yêu cầu',
    blurb: 'Gửi mẫu hoặc mô tả sản phẩm cần in, nhận báo giá qua Zalo — nhận cả đơn lẻ, số lượng ít.',
    keywords: ['đặt in', 'in theo yêu cầu', 'báo giá in', 'in số lượng ít', 'xưởng in tphcm'],
  },
  'templates': {
    name: 'Kho mẫu thiết kế',
    blurb: 'Hàng trăm mẫu thiết kế in sẵn — chọn mẫu, sửa nội dung, xuất file in chuẩn.',
    keywords: ['mẫu thiết kế', 'template in ấn', 'mẫu in sẵn', 'thiết kế online miễn phí'],
  },
};

// Trang app/riêng tư → noindex (không cho Google xếp hạng, không đưa vào sitemap).
const PRIVATE = new Set(['admin', 'orders', 'wallet', 'drafts', 'qc', 'brand']);

const humanize = (s: string) =>
  s.replace(/[-/]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\w/, (c) => c.toUpperCase());
const uniq = (a: string[]) => Array.from(new Set(a.map((x) => x.trim()).filter(Boolean)));

// Slug được SEO (đưa vào sitemap). Chỉ các sản phẩm thật, bỏ trang riêng tư.
export const STUDIO_SEO_SLUGS: string[] = [
  ...Array.from(CATALOG.keys()),
  ...Object.keys(PUBLIC_OVERRIDES),
].sort();

export function isStudioNoindex(slug: string): boolean {
  return PRIVATE.has(slug);
}

function build(name: string, blurb: string, keywords: string[], slug: string): Metadata {
  const url = `${SITE}/studio/${slug}`;
  const title = `${name} — thiết kế online, xuất file in chuẩn`;
  const description =
    `${blurb} Tự thiết kế miễn phí, xuất file in chuẩn (tràn lề, vạch cắt, CMYK, chữ outline) rồi gửi yêu cầu in. Nhận cả đơn lẻ.`.slice(0, 300);
  const ogTitle = `${name} | Mivy`;
  return {
    title,
    description,
    keywords: keywords.length ? keywords : undefined,
    alternates: { canonical: url },
    openGraph: { title: ogTitle, description, url, type: 'website', siteName: 'Mivy', locale: 'vi_VN' },
    twitter: { card: 'summary_large_image', title: ogTitle, description },
  };
}

export function studioMeta(slug: string): Metadata {
  if (PRIVATE.has(slug)) {
    return { title: humanize(slug), robots: { index: false, follow: false } };
  }
  const e = CATALOG.get(slug) || PUBLIC_OVERRIDES[slug];
  if (e) return build(e.name, e.blurb, uniq(e.keywords), slug);
  // Fallback: route có thật nhưng chưa khai báo catalog → vẫn index, copy chung.
  const name = humanize(slug);
  return build(name, `${name} in theo yêu cầu, nhận đơn lẻ số lượng ít.`, [], slug);
}
