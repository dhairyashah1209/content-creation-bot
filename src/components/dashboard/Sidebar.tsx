"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, TrendingUp, Lightbulb, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: BarChart2 },
  { href: "/trends", label: "Trend Explorer", icon: TrendingUp },
  { href: "/content", label: "Content Studio", icon: Lightbulb, badge: "Phase 2" },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 border-r bg-muted/30 min-h-screen py-6 px-3 gap-1 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 mb-6">
        <Sparkles className="w-5 h-5 text-violet-600" />
        <span className="font-bold text-sm">TrendBot</span>
      </div>

      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
              isActive
                ? "bg-background text-foreground font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
            {item.badge && (
              <span className="ml-auto text-[10px] bg-violet-100 text-violet-700 rounded px-1.5 py-0.5">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </aside>
  );
}
