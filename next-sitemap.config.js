/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://yt-dashboard-theta.vercel.app',
  generateRobotsTxt: false, // robots.ts 파일이 이미 있으므로 생성 안 함
  changefreq: 'daily',
  priority: 0.7,
  sitemapSize: 7000,
  outDir: 'public',
};
