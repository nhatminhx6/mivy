import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mivy.vn';

export const viewport: Viewport = {
  themeColor: '#07090e',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Mivy Studio — Tạo Poster Quảng Cáo & Thiết Kế Bằng AI 0đ API',
    template: '%s | Mivy Studio',
  },
  description:
    'Nền tảng tạo bộ 3 poster tuyển dụng, khóa học, dịch vụ và ảnh nền nghệ thuật AI chuẩn studio, miễn phí 100% không tốn tiền API. Xuất ảnh sắc nét 1080p, đa tỷ lệ 1:1, 4:5, 9:16.',
  keywords: [
    'tạo poster ai',
    'thiết kế poster tuyển dụng',
    'poster tuyển dụng ai',
    'visual ai background',
    'mivy studio',
    'thiết kế quảng cáo miễn phí',
    'poster khóa học',
    'bộ 3 poster quảng cáo',
    'ai design studio việt nam',
  ],
  authors: [{ name: 'Mivy Team', url: siteUrl }],
  creator: 'Mivy',
  publisher: 'Mivy Studio',
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: siteUrl,
    siteName: 'Mivy Studio',
    title: 'Mivy Studio — Tạo Poster Quảng Cáo & Thiết Kế Bằng AI 0đ API',
    description:
      'Tự động tạo bộ 3 poster tuyển dụng, khóa học, dịch vụ và visual background AI chuẩn studio, miễn phí 100% 0đ API.',
    images: [
      {
        url: `${siteUrl}/assets/recruitment-team.png`,
        width: 1200,
        height: 630,
        alt: 'Mivy Studio — AI Poster & Creative Workspace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mivy Studio — Tạo Poster Quảng Cáo & Thiết Kế Bằng AI 0đ API',
    description:
      'Tự động tạo bộ 3 poster tuyển dụng, khóa học, dịch vụ chuẩn studio với AI 0đ.',
    images: [`${siteUrl}/assets/recruitment-team.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'Mivy Studio',
        description: 'Tạo Poster Quảng Cáo & Thiết Kế Bằng AI 0đ API',
        inLanguage: 'vi-VN',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteUrl}/#software`,
        name: 'Mivy Studio',
        applicationCategory: 'DesignApplication',
        operatingSystem: 'All',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'VND',
        },
        description:
          'Nền tảng tạo poster đa ngành, nội dung marketing và hình ảnh nghệ thuật chuẩn studio tích hợp AI.',
      },
    ],
  };

  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,700&family=Caveat:wght@600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-[#07090e] text-[#f1f5f9] min-h-screen selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
