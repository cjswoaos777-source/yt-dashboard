import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-[#F5F5F4]">
      {/* Sidebar - Fixed Position */}
      <Sidebar />

      {/* Main Content - Pushed by Sidebar width */}
      <main className="flex-1 pl-64 transition-all duration-300">
        <div className="mx-auto w-full max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}