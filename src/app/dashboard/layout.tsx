import { Sidebar } from "@/components/dashboard/sidebar";

const RAPIDAPI_URL = "https://rapidapi.com/cjswoaos777/api/youtube-viral-tracker";

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

        {/* Footer */}
        <footer className="mx-auto w-full max-w-7xl px-4 pb-8 pt-6 sm:px-6 lg:px-10">
          <div className="border-t border-neutral-100 pt-5 text-center text-[12px] text-neutral-400">
            <a
              href={RAPIDAPI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline transition-colors"
            >
              API
            </a>
            {" "}문의:{" "}
            <a
              href="mailto:cjswoaos777@gmail.com"
              className="hover:text-neutral-700 transition-colors"
            >
              cjswoaos777@gmail.com
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
