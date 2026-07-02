import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/client";

export interface BudgetRow {
  categoryName: string;
  budgetedAmount: Decimal;
  actualAmount: Decimal;
  variance: Decimal;
  variancePercent: Decimal | null;
}

export interface ScheduleReport {
  scheduleType: "A" | "B";
  managementFeePercent: Decimal;
  rows: BudgetRow[];
  totalBudgeted: Decimal;
  totalActual: Decimal;
  totalVariance: Decimal;
}

export async function getBudgetReport(serviceChargeYearId: string): Promise<{
  scheduleA: ScheduleReport;
  scheduleB: ScheduleReport;
}> {
  const schedules = await prisma.schedule.findMany({
    where: { serviceChargeYearId },
    include: {
      budgetLineItems: true,
      expenseCategories: {
        include: { expenseItems: true },
      },
    },
  });

  const buildReport = (
    schedule: (typeof schedules)[0],
    type: "A" | "B"
  ): ScheduleReport => {
    // Group budgeted amounts by category name
    const budgetMap = new Map<string, Decimal>();
    for (const item of schedule.budgetLineItems) {
      const existing = budgetMap.get(item.categoryName) ?? new Decimal(0);
      budgetMap.set(item.categoryName, existing.plus(item.budgetedAmount));
    }

    // Group actual amounts by category name
    const actualMap = new Map<string, Decimal>();
    for (const cat of schedule.expenseCategories) {
      const total = cat.expenseItems.reduce(
        (sum, item) => sum.plus(item.amount),
        new Decimal(0)
      );
      const existing = actualMap.get(cat.name) ?? new Decimal(0);
      actualMap.set(cat.name, existing.plus(total));
    }

    // Merge all category names
    const allCategories = new Set([...Array.from(budgetMap.keys()), ...Array.from(actualMap.keys())]);
    const rows: BudgetRow[] = [];

    for (const name of Array.from(allCategories)) {
      const budgeted = budgetMap.get(name) ?? new Decimal(0);
      const actual = actualMap.get(name) ?? new Decimal(0);
      const variance = budgeted.minus(actual);
      const variancePercent = budgeted.isZero()
        ? null
        : variance.div(budgeted).times(100);

      rows.push({ categoryName: name, budgetedAmount: budgeted, actualAmount: actual, variance, variancePercent });
    }

    rows.sort((a, b) => a.categoryName.localeCompare(b.categoryName));

    const totalBudgeted = rows.reduce((s, r) => s.plus(r.budgetedAmount), new Decimal(0));
    const totalActual = rows.reduce((s, r) => s.plus(r.actualAmount), new Decimal(0));
    const totalVariance = totalBudgeted.minus(totalActual);

    return {
      scheduleType: type,
      managementFeePercent: schedule.managementFeePercent,
      rows,
      totalBudgeted,
      totalActual,
      totalVariance,
    };
  };

  const sA = schedules.find((s) => s.scheduleType === "A");
  const sB = schedules.find((s) => s.scheduleType === "B");

  if (!sA || !sB) throw new Error("Both schedules required");

  return {
    scheduleA: buildReport(sA, "A"),
    scheduleB: buildReport(sB, "B"),
  };
}
