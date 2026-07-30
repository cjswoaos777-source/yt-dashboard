import { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    // /dashboard/sample은 disallow 대신 페이지 메타데이터의 noindex로 색인 제외
    // (disallow하면 크롤러가 noindex 태그 자체를 읽지 못함)
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
