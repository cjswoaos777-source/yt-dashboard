import { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { getAllNotices } from '@/lib/notices';

/**
 * 정적 sitemap.
 *
 * 이전 버전은 채널(1.7MB)·태그(1MB) 데이터를 CDN에서 받아 URL을 열거했는데,
 * Vercel 함수 제한 시간을 넘겨 500이 났다. 그러면 XML 대신 Next의 HTML 에러
 * 페이지(<script/> 포함)가 응답되어 서치콘솔이 "사이트맵을 읽을 수 없음"을 냈다.
 *
 * 그래서 네트워크 의존을 전부 제거하고 정적 페이지 + 공지(로컬 md)만 담는다.
 * 동기 함수 + fs 접근만 있으므로 빌드 타임에 순수 XML로 고정된다.
 * 채널/태그 상세 페이지는 허브(/channel, /tag)의 내부 링크로 크롤링된다.
 * 쿼리스트링 URL(?page=N)은 정규 URL이 아니므로 포함하지 않는다.
 */
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
      url: `${baseUrl}/channel`,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tag`,
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
