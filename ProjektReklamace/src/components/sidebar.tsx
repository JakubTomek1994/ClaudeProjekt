"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  Inbox,
  LayoutDashboard,
  Package,
  Settings,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match?: (pathname: string) => boolean;
  adminOnly?: boolean;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, match: (p) => p === "/" },
    ],
  },
  {
    label: "Případy",
    items: [
      {
        href: "/cases",
        label: "Přehled",
        icon: FileText,
        match: (p) =>
          p === "/cases" ||
          (p.startsWith("/cases/") && !p.startsWith("/cases/drafts")),
      },
      { href: "/cases/drafts", label: "Drafty", icon: Inbox },
    ],
  },
  {
    label: "Evidence",
    items: [
      { href: "/customers", label: "Zákazníci", icon: Users },
      { href: "/orders", label: "Objednávky", icon: Package },
    ],
  },
  {
    label: "Reporting",
    items: [{ href: "/stats", label: "Statistiky", icon: BarChart3 }],
  },
  {
    label: "Správa",
    items: [
      { href: "/settings", label: "Nastavení", icon: Settings, adminOnly: true },
    ],
  },
];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-brand-foreground font-display text-lg font-bold shadow-[0_2px_8px_oklch(0.55_0.225_22/0.25)]">
          R
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-lg font-semibold tracking-tight text-sidebar-foreground">
            Reklamace
          </span>
          <span className="small-caps text-muted-foreground">
            Evidence případů
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group, groupIdx) => {
          const visible = group.items.filter((it) => !it.adminOnly || isAdmin);
          if (visible.length === 0) return null;

          return (
            <div key={groupIdx} className={cn(groupIdx > 0 && "mt-6")}>
              {group.label && (
                <div className="small-caps mb-1.5 px-3 text-[10px] font-semibold text-muted-foreground/80">
                  {group.label}
                </div>
              )}
              <ul className="space-y-0.5">
                {visible.map((item) => {
                  const active = item.match
                    ? item.match(pathname)
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground hover:translate-x-0.5",
                        )}
                      >
                        {active && (
                          <span
                            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand"
                            aria-hidden
                          />
                        )}
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-3">
        <p className="small-caps text-[10px] text-muted-foreground/70">
          Verze 0.1 · Fáze 1 (MVP)
        </p>
      </div>
    </aside>
  );
}
