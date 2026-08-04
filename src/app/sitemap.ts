import { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { getAllNotices } from '@/lib/notices';
import { getIndexableChannelIds, CHANNEL_LIST_PAGE_SIZE } from '@/lib/channels';
import { getTagSlugs, TAG_LIST_PAGE_SIZE } from '@/lib/tags';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // 채널 목록 허브 + 상세 페이지 (구독자 1만 이상만 — lib/channels.ts 기준)
  // CDN 조회가 실패해도 sitemap 자체는 나가야 하므로 빈 배열로 폴백한다.
  let channelRoutes: MetadataRoute.Sitemap = [];
  try {
    const ids = await getIndexableChannelIds();

    // 허브 페이지 (1페이지는 쿼리 없는 정규 URL)
    const totalPages = Math.max(1, Math.ceil(ids.length / CHANNEL_LIST_PAGE_SIZE));
    const listRoutes: MetadataRoute.Sitemap = Array.from(
      { length: totalPages },
      (_, i) => ({
        url: i === 0 ? `${baseUrl}/channel` : `${baseUrl}/channel?page=${i + 1}`,
        changeFrequency: 'daily' as const,
        priority: i === 0 ? 0.8 : 0.5,
      }),
    );

    const detailRoutes: MetadataRoute.Sitemap = ids.map((id) => ({
      url: `${baseUrl}/channel/${id}`,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }));

    channelRoutes = [...listRoutes, ...detailRoutes];
  } catch {
    // 폴백: 채널 URL 없이 나머지 사이트맵만 제공
  }

  // 태그 허브 + 상세. 채널과 같은 이유로 실패해도 sitemap 자체는 나가야 한다.
  let tagRoutes: MetadataRoute.Sitemap = [];
  try {
    const slugs = await getTagSlugs();
    const tagPages = Math.max(1, Math.ceil(slugs.length / TAG_LIST_PAGE_SIZE));
    tagRoutes = [
      ...Array.from({ length: tagPages }, (_, i) => ({
        url: i === 0 ? `${baseUrl}/tag` : `${baseUrl}/tag?page=${i + 1}`,
        changeFrequency: 'hourly' as const,
        priority: i === 0 ? 0.8 : 0.5,
      })),
      ...slugs.map((slug) => ({
        url: `${baseUrl}/tag/${slug}`,
        changeFrequency: 'hourly' as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // 폴백: 태그 URL 없이 나머지 사이트맵만 제공
  }

  return [...staticRoutes, ...noticeRoutes, ...channelRoutes, ...tagRoutes];
}
