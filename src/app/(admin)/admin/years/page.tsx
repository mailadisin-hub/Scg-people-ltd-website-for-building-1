import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function createYear(formData: FormData) {
  "use server";
  const label = formData.get("label") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  if (!label || !startDate || !endDate) return;

  const year = await prisma.serviceChargeYear.create({
    data: {
      label,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isCurrent: false,
    },
  });

  // Auto-create both schedules
  await prisma.schedule.createMany({
    data: [
      { serviceChargeYearId: year.id, scheduleType: "A", managementFeePercent: "3.25" },
      { serviceChargeYearId: year.id, scheduleType: "B", managementFeePercent: "3.25" },
    ],
  });

  revalidatePath("/admin/years");
  redirect("/admin/years");
}

async function setCurrentYear(formData: FormData) {
  "use server";
  const yearId = formData.get("yearId") as string;
  await prisma.serviceChargeYear.updateMany({ data: { isCurrent: false } });
  await prisma.serviceChargeYear.update({ where: { id: yearId }, data: { isCurrent: true } });
  revalidatePath("/admin/years");
  redirect("/admin/years");
}

export default async function YearsPage() {
  const years = await prisma.serviceChargeYear.findMany({
    orderBy: { startDate: "desc" },
    include: { schedules: true },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-blue">Financial Years</h1>
        <p className="text-gray-500 mt-1">Manage service charge years for Westcote Place</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Existing years */}
        <div className="space-y-4">
          {years.length === 0 ? (
            <p className="text-gray-400 text-sm">No financial years yet.</p>
          ) : (
            years.map((year) => (
              <Card key={year.id} className={year.isCurrent ? "border-brand-gold border-2" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-brand-blue" />
                      <h3 className="font-bold text-brand-blue text-lg">{year.label}</h3>
                    </div>
                    {year.isCurrent && <Badge variant="gold">Current Year</Badge>}
                  </div>

                  <div className="text-sm text-gray-500 space-y-1 mb-4">
                    <p>{formatDate(year.startDate)} → {formatDate(year.endDate)}</p>
                    <p>{year.schedules.length} schedule(s) configured</p>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/admin/schedules?yearId=${year.id}`}>
                      <Button size="sm" variant="outline">Manage Schedules</Button>
                    </Link>
                    <Link href={`/admin/budget?yearId=${year.id}`}>
                      <Button size="sm" variant="outline">Budget</Button>
                    </Link>
                    {!year.isCurrent && (
                      <form action={setCurrentYear}>
                        <input type="hidden" name="yearId" value={year.id} />
                        <Button size="sm" variant="ghost" type="submit">Set as Current</Button>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create new year */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createYear} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Year Label
                </label>
                <input
                  name="label"
                  placeholder="e.g. 2026/2027"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <p className="text-xs text-gray-400">
                Schedule A and B will be created automatically with a 3.25% management fee.
              </p>
              <Button type="submit" className="w-full">
                Create Financial Year
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
