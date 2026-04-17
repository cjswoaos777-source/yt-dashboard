"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, Menu, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const RAPIDAPI_URL = "https://rapidapi.com/cjswoaos777/api/youtube-viral-tracker";

const menuItems = [
  { title: "홈", href: "/dashboard", icon: LayoutDashboard },
  { title: "벤치마킹", href: "/dashboard/benchmarking", icon: TrendingUp },
];

// ─── Desktop Sidebar ───────────────────────────────────────────────────────────

function DesktopSidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-border bg-background shadow-[1px_0_20px_rgba(0,0,0,0.02)] lg:flex lg:flex-col">
      <div className="flex h-full flex-col px-4 py-6">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
            <span className="text-lg">🔥</span>
          </div>
          <span className="font-serif text-lg font-bold tracking-tight text-heading">Viral Hunter</span>
        </div>

        {/* Menu */}
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-black text-white"
                    : "text-muted-foreground hover:bg-neutral-100 hover:text-heading"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-muted-foreground")} />
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* API Link */}
        <a
          href={RAPIDAPI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm font-medium text-neutral-600 transition-all duration-200 hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900"
        >
          <Zap className="h-4 w-4 text-yellow-500" />
          API
          <span className="ml-auto rounded-full bg-black px-2 py-0.5 text-[10px] font-semibold text-white">
            RapidAPI
          </span>
        </a>
      </div>
    </aside>
  );
}

// ─── Mobile Top Bar + Drawer ───────────────────────────────────────────────────

function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Top Bar */}
      <header className="fixed left-0 top-0 z-50 flex h-14 w-full items-center justify-between border-b border-border bg-background px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white">
            <span className="text-base">🔥</span>
          </div>
          <span className="font-serif text-base font-bold tracking-tight text-heading">Viral Hunter</span>
        </div>
        <div className="flex items-center gap-2">
          {/* API 링크 - 모바일 상단바 우측 */}
          <a
            href={RAPIDAPI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[12px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-100"
          >
            <Zap className="h-3 w-3 text-yellow-500" />
            API
          </a>
          <button
            onClick={() => setOpen(true)}
            aria-label="메뉴 열기"
            className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 bg-background shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col px-4 py-6">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
                <span className="text-lg">🔥</span>
              </div>
              <span className="font-serif text-lg font-bold tracking-tight text-heading">Viral Hunter</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="메뉴 닫기"
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu */}
          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-black text-white"
                      : "text-muted-foreground hover:bg-neutral-100 hover:text-heading"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-muted-foreground")} />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* API Link in Drawer */}
          <a
            href={RAPIDAPI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm font-medium text-neutral-600 transition-all hover:bg-neutral-100"
          >
            <Zap className="h-4 w-4 text-yellow-500" />
            API
            <span className="ml-auto rounded-full bg-black px-2 py-0.5 text-[10px] font-semibold text-white">
              RapidAPI
            </span>
          </a>
        </div>
      </div>
    </>
  );
}

// ─── Export ────────────────────────────────────────────────────────────────────

export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileNav />
    </>
  );
}
