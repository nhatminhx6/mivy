import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mivy.vn').replace(/\/$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/_next/',
        '/studio/admin',
        '/studio/orders',
        '/studio/wallet',
        '/studio/drafts',
        '/studio/qc',
        '/studio/brand',
        '/login',
        '/review',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
