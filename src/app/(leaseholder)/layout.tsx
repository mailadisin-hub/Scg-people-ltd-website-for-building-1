import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cache } from "react";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import { Building2, FileText, FolderOpen, PieChart, LogOut } from "lucide-react";

// cache() deduplicates this query within a single request — the layout and
// the page both call it but it only hits the DB once.
export const getLeaseholder = cache((userId: string) =>
  prisma.leaseholder.findUnique({ where: { userId }, include: { unit: true } })
);

async function LeaseholderNav({ userId }: { userId: string }) {
  const leaseholder = await getLeaseholder(userId);

  return (
    <header className="bg-brand-blue shadow-md sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/portal" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-gold rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">SCG People Ltd</p>
              <p className="text-brand-gold-light text-xs">Westcote Place</p>
            </div>
          </Link>

          {/* Unit badge */}
          {leaseholder && (
            <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
              <span className="text-white/70 text-xs">Your unit:</span>
              <span className="text-brand-gold font-semibold text-sm">
                {leaseholder.unit.unitRef}
              </span>
            </div>
          )}

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            <NavLink href="/portal/invoices" label="Invoices" icon={<FileText className="w-4 h-4" />} />
            <NavLink href="/portal/budget" label="Budget" icon={<PieChart className="w-4 h-4" />} />
            <NavLink href="/portal/documents" label="Documents" icon={<FolderOpen className="w-4 h-4" />} />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </form>
          </nav>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 text-sm font-medium transition-colors"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export default async function LeaseholderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as { role?: string; id?: string };
  if (user.role === "ADMIN") redirect("/admin/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaseholderNav userId={user.id!} />
      <main className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">{children}</main>
    </div>
  );
}
