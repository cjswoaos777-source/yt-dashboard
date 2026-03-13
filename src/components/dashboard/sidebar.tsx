"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, MonitorPlay, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "홈",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "벤치마킹",
    href: "/dashboard/benchmarking",
    icon: TrendingUp,
  },
  {
    title: "내 채널 분석",
    href: "/dashboard/my-channel",
    icon: MonitorPlay,
  },
  {
    title: "설정",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-stone-200 bg-[#FDFDFC] shadow-[1px_0_20px_rgba(0,0,0,0.02)]">
      <div className="flex h-full flex-col px-4 py-6">
        {/* Logo Area */}
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
            <span className="text-lg">🔥</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-stone-900">Viral Hunter</span>
        </div>

        {/* Menu Items */}
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
                    ? "bg-stone-200 text-stone-900"
                    : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-stone-900" : "text-stone-400")} />
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Footer Area (Optional) */}
        <div className="mt-auto px-2">
          <div className="rounded-xl bg-stone-100 p-4">
            <p className="text-xs font-medium text-stone-900">Pro Plan</p>
            <p className="text-[10px] text-stone-500">다음 결제일: 2월 26일</p>
          </div>
        </div>
      </div>
    </aside>
  );
}