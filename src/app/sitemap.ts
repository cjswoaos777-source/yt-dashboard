import { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { getAllNotices } from '@/lib/notices';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE.url;

  // 정적 페이지는 실제 수정 시각을 알 수 없으므로 lastModified 생략
  // (요청 시각을 넣으면 항상 "방금 수정됨"이 되어 신호로서 무의미)
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/dashboard`,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/dashboard/benchmarking`,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/notice`,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about`,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  const noticeRoutes: MetadataRoute.Sitemap = getAllNotices().map((n) => ({
    url: `${baseUrl}/notice/${n.slug}`,
    ...(n.date && { lastModified: new Date(n.date) }),
    changeFrequency: 'monthly' as const,
    priority: 0.3,
  }));

  return [...staticRoutes, ...noticeRoutes];
}
