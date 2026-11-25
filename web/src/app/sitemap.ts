import { MetadataRoute } from 'next';
import { NICHE_SLUGS } from '@/lib/landingNiches';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mivy.vn';
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
      url: `${baseUrl}/studio/marketing`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/studio/templates`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/studio/drafts`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...landingPages,
  ];
}
