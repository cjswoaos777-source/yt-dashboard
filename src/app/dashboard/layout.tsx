import { Sidebar } from "@/components/dashboard/sidebar";
import { SiteFooter } from "@/components/legal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      {/* Mobile: pt-14 for top bar. Desktop lg+: pl-64 for fixed sidebar. */}
      <main className="flex-1 pt-14 transition-all duration-300 lg:pl-64 lg:pt-0">
        <div className="mx-auto w-full max-w-7xl">
          {children}
        </div>

        {/* Footer: 약관·개인정보·자체 지표 고지 (YouTube API 정책) */}
        <SiteFooter />
      </main>
    </div>
  );
}
