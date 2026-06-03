import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/client";
import Link from "next/link";
import { Plus, ChevronRight, Banknote } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function addExpenseCategory(formData: FormData) {
  "use server";
  const scheduleId = formData.get("scheduleId") as string;
  const name = formData.get("name") as string;
  if (!scheduleId || !name) return;
  await prisma.expenseCategory.create({ data: { scheduleId, name } });
  revalidatePath("/admin/schedules");
}

async function addExpenseItem(formData: FormData) {
  "use server";
  const categoryId = formData.get("categoryId") as string;
  const description = formData.get("description") as string;
  const amount = formData.get("amount") as string;
  const date = formData.get("date") as string;
  const supplier = formData.get("supplier") as string;
  const invoiceRef = formData.get("invoiceRef") as string;

  if (!categoryId || !description || !amount || !date) return;

  await prisma.expenseItem.create({
    data: {
      expenseCategoryId: categoryId,
      description,
      amount,
      date: new Date(date),
      supplier: supplier || null,
      invoiceRef: invoiceRef || null,
    },
  });
  revalidatePath("/admin/schedules");
}

async function updateManagementFee(formData: FormData) {
  "use server";
  const scheduleId = formData.get("scheduleId") as string;
  const fee = formData.get("fee") as string;
  if (!scheduleId || !fee) return;
  await prisma.schedule.update({
    where: { id: scheduleId },
    data: { managementFeePercent: fee },
  });
  revalidatePath("/admin/schedules");
}

export default async function SchedulesPage({
  searchParams,
}: {
  searchParams: { yearId?: string };
}) {
  const years = await prisma.serviceChargeYear.findMany({
    orderBy: { startDate: "desc" },
  });

  const selectedYearId = searchParams.yearId ?? years.find((y) => y.isCurrent)?.id ?? years[0]?.id;

  if (!selectedYearId) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">No financial years exist yet.</p>
        <Link href="/admin/years"><Button>Create a Financial Year</Button></Link>
      </div>
    );
  }

  const schedules = await prisma.schedule.findMany({
    where: { serviceChargeYearId: selectedYearId },
    include: {
      expenseCategories: {
        orderBy: { displayOrder: "asc" },
        include: { expenseItems: { orderBy: { date: "desc" } } },
      },
    },
  });

  const scheduleA = schedules.find((s) => s.scheduleType === "A");
  const scheduleB = schedules.find((s) => s.scheduleType === "B");
  const selectedYear = years.find((y) => y.id === selectedYearId);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-blue">Schedules & Expenses</h1>
          <p className="text-gray-500 mt-1">Record actual expenses against each schedule</p>
        </div>
        {/* Year picker */}
        <div className="flex gap-2">
          {years.map((y) => (
            <Link key={y.id} href={`/admin/schedules?yearId=${y.id}`}>
              <Button
                size="sm"
                variant={y.id === selectedYearId ? "default" : "outline"}
              >
                {y.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {[scheduleA, scheduleB].map((schedule) => {
          if (!schedule) return null;
          const isA = schedule.scheduleType === "A";
          const totalActual = schedule.expenseCategories.reduce((sum, cat) => {
            return sum.plus(
              cat.expenseItems.reduce((s, item) => s.plus(item.amount), new Decimal(0))
            );
          }, new Decimal(0));

          return (
            <Card key={schedule.id} className={`border-t-4 ${isA ? "border-t-brand-blue" : "border-t-brand-gold"}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className={`w-5 h-5 ${isA ? "text-brand-blue" : "text-brand-gold"}`} />
                    Schedule {schedule.scheduleType}
                    <span className="text-xs font-normal text-gray-500">
                      {isA ? "(Whole Building)" : "(Flats Only)"}
                    </span>
                  </CardTitle>
                  <span className="text-lg font-bold text-brand-blue">
                    {formatCurrency(totalActual.toNumber())}
                  </span>
                </div>

                {/* Management fee editor */}
                <form action={updateManagementFee} className="flex items-center gap-2 mt-2">
                  <input type="hidden" name="scheduleId" value={schedule.id} />
                  <span className="text-xs text-gray-500">Management fee:</span>
                  <input
                    name="fee"
                    defaultValue={schedule.managementFeePercent.toString()}
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-brand-blue"
                    step="0.01"
                    min="0"
                    max="10"
                    type="number"
                  />
                  <span className="text-xs text-gray-500">%</span>
                  <button type="submit" className="text-xs text-brand-blue hover:underline">Save</button>
                </form>
              </CardHeader>

              <CardContent className="space-y-4">
                {schedule.expenseCategories.map((cat) => {
                  const catTotal = cat.expenseItems.reduce(
                    (s, item) => s.plus(item.amount),
                    new Decimal(0)
                  );
                  return (
                    <div key={cat.id} className="border border-gray-100 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between bg-gray-50 px-4 py-2">
                        <span className="text-sm font-semibold text-gray-800">{cat.name}</span>
                        <span className="text-sm font-bold text-brand-blue">
                          {formatCurrency(catTotal.toNumber())}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {cat.expenseItems.map((item) => (
                          <div key={item.id} className="px-4 py-2 flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-700">{item.description}</p>
                              <p className="text-xs text-gray-400">
                                {formatDate(item.date)}
                                {item.supplier && ` · ${item.supplier}`}
                                {item.invoiceRef && ` · Ref: ${item.invoiceRef}`}
                              </p>
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {formatCurrency(Number(item.amount))}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Add expense item inline */}
                      <form action={addExpenseItem} className="px-4 py-3 bg-gray-50/50 border-t border-gray-100">
                        <input type="hidden" name="categoryId" value={cat.id} />
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input
                            name="description"
                            placeholder="Description"
                            required
                            className="px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-brand-blue col-span-2"
                          />
                          <input
                            name="amount"
                            type="number"
                            step="0.01"
                            placeholder="Amount (£)"
                            required
                            className="px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-brand-blue"
                          />
                          <input
                            name="date"
                            type="date"
                            required
                            className="px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-brand-blue"
                          />
                          <input
                            name="supplier"
                            placeholder="Supplier (optional)"
                            className="px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-brand-blue"
                          />
                          <input
                            name="invoiceRef"
                            placeholder="Invoice ref (optional)"
                            className="px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-brand-blue"
                          />
                        </div>
                        <button
                          type="submit"
                          className="text-xs text-brand-blue hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Expense
                        </button>
                      </form>
                    </div>
                  );
                })}

                {/* Add category */}
                <form action={addExpenseCategory} className="flex gap-2 mt-2">
                  <input type="hidden" name="scheduleId" value={schedule.id} />
                  <input
                    name="name"
                    placeholder="New category name…"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue focus:outline-none"
                    required
                  />
                  <Button type="submit" size="sm">
                    <Plus className="w-4 h-4" />
                    Add Category
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
