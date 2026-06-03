import { prisma } from "@/lib/prisma";
import { getBudgetReport } from "@/lib/finance/budgetReporting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/client";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FileText, TrendingDown, TrendingUp, Minus } from "lucide-react";

async function addBudgetLineItem(formData: FormData) {
  "use server";
  const scheduleId = formData.get("scheduleId") as string;
  const categoryName = formData.get("categoryName") as string;
  const budgetedAmount = formData.get("budgetedAmount") as string;
  if (!scheduleId || !categoryName || !budgetedAmount) return;
  await prisma.budgetLineItem.create({
    data: { scheduleId, categoryName, budgetedAmount },
  });
  revalidatePath("/admin/budget");
}

async function deleteBudgetLineItem(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await prisma.budgetLineItem.delete({ where: { id } });
  revalidatePath("/admin/budget");
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: { yearId?: string };
}) {
  const years = await prisma.serviceChargeYear.findMany({
    orderBy: { startDate: "desc" },
  });

  const selectedYearId =
    searchParams.yearId ?? years.find((y) => y.isCurrent)?.id ?? years[0]?.id;

  if (!selectedYearId) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">No financial years yet.</p>
        <Link href="/admin/years"><Button>Create a Financial Year</Button></Link>
      </div>
    );
  }

  const selectedYear = years.find((y) => y.id === selectedYearId);

  const schedules = await prisma.schedule.findMany({
    where: { serviceChargeYearId: selectedYearId },
    include: { budgetLineItems: { orderBy: { displayOrder: "asc" } } },
  });

  const scheduleA = schedules.find((s) => s.scheduleType === "A");
  const scheduleB = schedules.find((s) => s.scheduleType === "B");

  let report = null;
  try {
    report = await getBudgetReport(selectedYearId);
  } catch {}

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-blue">Budget & Forecast</h1>
          <p className="text-gray-500 mt-1">{selectedYear?.label}</p>
        </div>
        <div className="flex gap-2">
          {years.map((y) => (
            <Link key={y.id} href={`/admin/budget?yearId=${y.id}`}>
              <Button size="sm" variant={y.id === selectedYearId ? "default" : "outline"}>
                {y.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {[
          { schedule: scheduleA, type: "A", label: "Schedule A — Whole Building" },
          { schedule: scheduleB, type: "B", label: "Schedule B — Flats Only" },
        ].map(({ schedule, type, label }) => {
          if (!schedule) return null;
          const total = schedule.budgetLineItems.reduce(
            (s, item) => s + Number(item.budgetedAmount),
            0
          );

          return (
            <Card key={schedule.id} className={`border-t-4 ${type === "A" ? "border-t-brand-blue" : "border-t-brand-gold"}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{label}</CardTitle>
                  <span className="text-lg font-bold text-brand-blue">
                    {formatCurrency(total)} / yr
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Quarterly: {formatCurrency(total / 4)}
                </p>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm mb-4">
                  <tbody className="divide-y divide-gray-50">
                    {schedule.budgetLineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 text-gray-700">{item.categoryName}</td>
                        <td className="py-2 text-right font-medium text-brand-blue">
                          {formatCurrency(Number(item.budgetedAmount))}
                        </td>
                        <td className="py-2 pl-2">
                          <form action={deleteBudgetLineItem}>
                            <input type="hidden" name="id" value={item.id} />
                            <button
                              type="submit"
                              className="text-red-400 hover:text-red-600 text-xs"
                            >
                              ×
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <form action={addBudgetLineItem} className="flex gap-2">
                  <input type="hidden" name="scheduleId" value={schedule.id} />
                  <input
                    name="categoryName"
                    placeholder="Category name"
                    required
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-brand-blue"
                  />
                  <input
                    name="budgetedAmount"
                    type="number"
                    step="0.01"
                    placeholder="£ Amount"
                    required
                    className="w-24 px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-brand-blue"
                  />
                  <Button type="submit" size="sm">Add</Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Budget vs Actuals */}
      {report && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[
            { data: report.scheduleA, label: "Schedule A vs Actuals" },
            { data: report.scheduleB, label: "Schedule B vs Actuals" },
          ].map(({ data, label }) => (
            <Card key={label}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left pb-2 text-xs font-semibold text-gray-500">Category</th>
                      <th className="text-right pb-2 text-xs font-semibold text-gray-500">Budget</th>
                      <th className="text-right pb-2 text-xs font-semibold text-gray-500">Actual</th>
                      <th className="text-right pb-2 text-xs font-semibold text-gray-500">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.rows.map((row) => (
                      <tr key={row.categoryName}>
                        <td className="py-2 text-gray-700">{row.categoryName}</td>
                        <td className="py-2 text-right text-gray-600">
                          {formatCurrency(row.budgetedAmount.toNumber())}
                        </td>
                        <td className="py-2 text-right text-gray-600">
                          {formatCurrency(row.actualAmount.toNumber())}
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={`flex items-center justify-end gap-1 ${
                              row.variance.gt(0)
                                ? "text-green-600"
                                : row.variance.lt(0)
                                ? "text-red-600"
                                : "text-gray-400"
                            }`}
                          >
                            {row.variance.gt(0) ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : row.variance.lt(0) ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                            {formatCurrency(Math.abs(row.variance.toNumber()))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 font-bold">
                      <td className="pt-2 text-brand-blue">Total</td>
                      <td className="pt-2 text-right text-brand-blue">
                        {formatCurrency(data.totalBudgeted.toNumber())}
                      </td>
                      <td className="pt-2 text-right text-brand-blue">
                        {formatCurrency(data.totalActual.toNumber())}
                      </td>
                      <td className="pt-2 text-right">
                        <span className={data.totalVariance.gt(0) ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(Math.abs(data.totalVariance.toNumber()))}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
