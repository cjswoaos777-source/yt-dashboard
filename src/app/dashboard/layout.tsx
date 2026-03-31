import { Sidebar } from "@/components/dashboard/sidebar";

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
      </main>
    </div>
  );
}