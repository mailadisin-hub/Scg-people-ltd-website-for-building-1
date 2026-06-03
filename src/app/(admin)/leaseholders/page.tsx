import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Mail } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

async function createLeaseholder(formData: FormData) {
  "use server";
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const unitId = formData.get("unitId") as string;

  if (!name || !email || !password || !unitId) return;

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "LEASEHOLDER",
    },
  });

  await prisma.leaseholder.create({
    data: { userId: user.id, unitId },
  });

  revalidatePath("/admin/leaseholders");
  redirect("/admin/leaseholders");
}

export default async function LeaseholdersPage() {
  const leaseholders = await prisma.leaseholder.findMany({
    include: { user: true, unit: true },
    orderBy: { unit: { unitRef: "asc" } },
  });

  const unassignedUnits = await prisma.unit.findMany({
    where: { leaseholder: null },
    orderBy: { unitRef: "asc" },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-blue">Leaseholders</h1>
        <p className="text-gray-500 mt-1">{leaseholders.length} of 16 units have portal accounts</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Leaseholder list */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Portal Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaseholders.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No leaseholder accounts yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {leaseholders.map((lh) => (
                  <div key={lh.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{lh.user.name}</span>
                        <Badge variant="default">{lh.unit.unitRef}</Badge>
                        {lh.unit.unitType === "COMMERCIAL" && (
                          <Badge variant="gold">Commercial</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {lh.user.email}
                      </div>
                    </div>
                    <Badge variant="paid">Active</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create leaseholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Leaseholder
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unassignedUnits.length === 0 ? (
              <p className="text-sm text-gray-500">All units have been assigned portal accounts.</p>
            ) : (
              <form action={createLeaseholder} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Unit *</label>
                  <select
                    name="unitId"
                    required
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue"
                  >
                    <option value="">Select unit…</option>
                    {unassignedUnits.map((u) => (
                      <option key={u.id} value={u.id}>{u.unitRef}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Full Name *</label>
                  <input
                    name="name"
                    required
                    placeholder="Leaseholder name"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Email Address *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="email@example.com"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Temporary Password *</label>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
                <p className="text-xs text-amber-600">
                  Share the password securely — the leaseholder should change it after first login.
                </p>
                <Button type="submit" className="w-full">Create Account</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
