import { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { getAllNotices } from '@/lib/notices';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE.url;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/dashboard/benchmarking`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/notice`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  const noticeRoutes: MetadataRoute.Sitemap = getAllNotices().map((n) => ({
    url: `${baseUrl}/notice/${n.slug}`,
    lastModified: n.date ? new Date(n.date) : now,
    changeFrequency: 'monthly',
    priority: 0.3,
  }));

  return [...staticRoutes, ...noticeRoutes];
}
