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
    default: 'Mivy — Thiết kế & đặt in online, xuất file in chuẩn miễn phí',
    template: '%s | Mivy Studio',
  },
  description:
    'Tự thiết kế thiệp cưới, sticker, tem nhãn, hộp giấy, card visit… online miễn phí rồi xuất file in chuẩn (tràn lề, vạch cắt, CMYK, chữ outline) và gửi yêu cầu in. Nhận cả đơn lẻ, số lượng ít, báo giá nhanh qua Zalo.',
  keywords: [
    'thiết kế online miễn phí',
    'xuất file in chuẩn',
    'đặt in online',
    'in theo yêu cầu',
    'in số lượng ít',
    'thiết kế thiệp cưới online',
    'in sticker tem nhãn',
    'thiết kế bao bì hộp giấy',
    'file in chuẩn bleed cmyk',
    'xưởng in tphcm',
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
    title: 'Mivy — Thiết kế & đặt in online, xuất file in chuẩn miễn phí',
    description:
      'Thiết kế thiệp cưới, sticker, tem nhãn, bao bì, card visit… online miễn phí, xuất file in chuẩn rồi gửi yêu cầu in. Nhận cả đơn lẻ.',
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
    title: 'Mivy — Thiết kế & đặt in online, xuất file in chuẩn miễn phí',
    description:
      'Thiết kế thiệp cưới, sticker, tem nhãn, bao bì… online miễn phí, xuất file in chuẩn rồi gửi yêu cầu in.',
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
        description: 'Thiết kế & đặt in online, xuất file in chuẩn miễn phí',
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
          'Công cụ thiết kế online miễn phí cho dân in: thiệp, sticker, tem nhãn, bao bì, card visit… xuất file in chuẩn (tràn lề, vạch cắt, CMYK) rồi đặt in, nhận cả đơn lẻ.',
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
      <body className="bg-mv-bg text-mv-fg min-h-screen selection:bg-mv-accent selection:text-white">
        {children}
      </body>
    </html>
  );
}
