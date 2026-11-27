import { MetadataRoute } from 'next';
import { NICHE_SLUGS } from '@/lib/landingNiches';
import { STUDIO_SEO_SLUGS } from '@/lib/studioSeo';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mivy.vn').replace(/\/$/, '');
  const currentDate = new Date().toISOString();

  const landingPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/in`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.88,
    },
    ...NICHE_SLUGS.map((slug) => ({
      url: `${baseUrl}/in/${slug}`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
  ];

  // Mọi trang sản phẩm /studio/* (nguồn: product-catalog qua studioSeo).
  const studioPages: MetadataRoute.Sitemap = STUDIO_SEO_SLUGS.map((slug) => ({
    url: `${baseUrl}/studio/${slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.72,
  }));

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/studio`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...landingPages,
    ...studioPages,
  ];
}
