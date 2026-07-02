import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) redirect("/login");
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/portal");

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      {/* ml-64 only on md+ where the sidebar is always visible */}
      <div className="md:ml-64">
        <main className="p-4 md:p-8 pt-16 md:pt-8 min-h-screen animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
