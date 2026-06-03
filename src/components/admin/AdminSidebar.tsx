"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  FileText,
  Receipt,
  CreditCard,
  FolderOpen,
  LogOut,
  ChevronRight,
  Banknote,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/units", label: "Units", icon: Building2 },
  { href: "/admin/leaseholders", label: "Leaseholders", icon: Users },
  { href: "/admin/years", label: "Financial Years", icon: CalendarDays },
  { href: "/admin/schedules", label: "Schedules & Expenses", icon: Banknote },
  { href: "/admin/budget", label: "Budget & Forecast", icon: FileText },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/documents", label: "Documents", icon: FolderOpen },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const close = () => setMobileOpen(false);

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 rounded-lg bg-brand-blue text-white shadow-lg"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop — mobile only, shown when drawer is open */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={close}
          aria-hidden
        />
      )}

      {/* Sidebar drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 w-64 bg-brand-blue flex flex-col z-50",
          "transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Close button — mobile only */}
        <button
          className="md:hidden absolute top-4 right-3 p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          onClick={close}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-10 h-10 bg-brand-gold rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight">SCG People Ltd</p>
            <p className="text-brand-gold-light text-xs truncate">Westcote Place</p>
          </div>
        </div>

        {/* Admin badge */}
        <div className="px-4 py-3">
          <span className="text-xs font-semibold text-brand-gold bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
            ADMIN PORTAL
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all group",
                  isActive
                    ? "bg-brand-gold text-white shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    isActive ? "text-white" : "text-white/60 group-hover:text-white"
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
