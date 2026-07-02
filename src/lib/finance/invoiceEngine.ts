import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/client";
import {
  totalFlatsWeight,
  flatScheduleAPercent,
  flatScheduleBPercent,
  calculateQuarterlyAmount,
  COMMERCIAL_SCHEDULE_A_PERCENT,
} from "./apportionment";
import type { Quarter, ScheduleType } from "@prisma/client";

export interface GenerateInvoicesParams {
  serviceChargeYearId: string;
  quarter: Quarter;
  issueDateOverride?: Date;
}

export interface InvoicePreviewRow {
  unitId: string;
  unitRef: string;
  isCommercial: boolean;
  scheduleALineTotal: Decimal;
  scheduleBLineTotal: Decimal | null;
  grandTotal: Decimal;
}

/**
 * Preview invoice amounts without writing to the database.
 */
export async function previewInvoices(
  params: GenerateInvoicesParams
): Promise<InvoicePreviewRow[]> {
  const { scheduleA, scheduleB, units, flatsTotal } =
    await loadInvoiceData(params.serviceChargeYearId);

  const budgetA = await sumBudget(scheduleA.id);
  const budgetB = await sumBudget(scheduleB.id);

  return buildPreviewRows(units, flatsTotal, budgetA, budgetB, scheduleA, scheduleB);
}

/**
 * Generate invoices for all units for the given quarter.
 * Idempotent: throws if non-void invoices already exist for this year+quarter.
 */
export async function generateInvoices(params: GenerateInvoicesParams): Promise<number> {
  const { serviceChargeYearId, quarter } = params;
  const issueDate = params.issueDateOverride ?? new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + 30);

  // Idempotency guard
  const existing = await prisma.invoice.findFirst({
    where: {
      serviceChargeYearId,
      quarter,
      status: { not: "VOID" },
    },
  });
  if (existing) {
    throw new Error(
      `Invoices already exist for ${quarter}. Void them before regenerating.`
    );
  }

  const { yearLabel, scheduleA, scheduleB, units, flatsTotal } =
    await loadInvoiceData(serviceChargeYearId);

  const budgetA = await sumBudget(scheduleA.id);
  const budgetB = await sumBudget(scheduleB.id);

  const rows = buildPreviewRows(units, flatsTotal, budgetA, budgetB, scheduleA, scheduleB);
  const quarterNum = quarter.replace("Q", "");

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const unit = units.find((u) => u.id === row.unitId)!;
      const invoiceNumber = buildInvoiceNumber(yearLabel, quarter, unit.unitRef);

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          serviceChargeYearId,
          unitId: row.unitId,
          quarter,
          issueDate,
          dueDate,
          status: "DRAFT",
        },
      });

      // Schedule A line item (all units)
      const flatWeight = unit.unitType === "FLAT" ? unit.scheduleWeight! : null;
      const sharePercentA = row.isCommercial
        ? COMMERCIAL_SCHEDULE_A_PERCENT
        : flatScheduleAPercent(flatWeight!, flatsTotal);

      const calcA = calculateQuarterlyAmount({
        annualBudget: budgetA,
        sharePercent: sharePercentA,
        managementFeePercent: scheduleA.managementFeePercent,
      });

      await tx.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          scheduleType: "A",
          description: `Schedule A — Q${quarterNum} Service Charge`,
          annualScheduleTotal: calcA.annualScheduleTotal,
          quarterlyTotal: calcA.quarterlyTotal,
          unitShareAmount: calcA.unitShareAmount,
          managementFeeAmount: calcA.managementFeeAmount,
          lineTotal: calcA.lineTotal,
          sharePercentage: sharePercentA,
        },
      });

      // Schedule B line item (flats only)
      if (!row.isCommercial) {
        const sharePercentB = flatScheduleBPercent(flatWeight!, flatsTotal);
        const calcB = calculateQuarterlyAmount({
          annualBudget: budgetB,
          sharePercent: sharePercentB,
          managementFeePercent: scheduleB.managementFeePercent,
        });

        await tx.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            scheduleType: "B",
            description: `Schedule B — Q${quarterNum} Service Charge`,
            annualScheduleTotal: calcB.annualScheduleTotal,
            quarterlyTotal: calcB.quarterlyTotal,
            unitShareAmount: calcB.unitShareAmount,
            managementFeeAmount: calcB.managementFeeAmount,
            lineTotal: calcB.lineTotal,
            sharePercentage: sharePercentB,
          },
        });
      }
    }
  });

  return rows.length;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loadInvoiceData(serviceChargeYearId: string) {
  const year = await prisma.serviceChargeYear.findUniqueOrThrow({
    where: { id: serviceChargeYearId },
    include: {
      schedules: true,
    },
  });

  const scheduleA = year.schedules.find((s) => s.scheduleType === "A");
  const scheduleB = year.schedules.find((s) => s.scheduleType === "B");

  if (!scheduleA || !scheduleB) {
    throw new Error("Both Schedule A and Schedule B must exist for this year.");
  }

  const units = await prisma.unit.findMany({ orderBy: { unitRef: "asc" } });

  const flatUnits = units.filter((u) => u.unitType === "FLAT");
  const flatsTotal = totalFlatsWeight(
    flatUnits.map((u) => ({
      unitId: u.id,
      unitRef: u.unitRef,
      isCommercial: false,
      scheduleWeight: u.scheduleWeight,
    }))
  );

  return { yearLabel: year.label, scheduleA, scheduleB, units, flatsTotal };
}

async function sumBudget(scheduleId: string): Promise<Decimal> {
  const result = await prisma.budgetLineItem.aggregate({
    where: { scheduleId },
    _sum: { budgetedAmount: true },
  });
  return result._sum.budgetedAmount ?? new Decimal(0);
}

function buildPreviewRows(
  units: Array<{
    id: string;
    unitRef: string;
    unitType: string;
    scheduleWeight: Decimal | null;
  }>,
  flatsTotal: Decimal,
  budgetA: Decimal,
  budgetB: Decimal,
  scheduleA: { managementFeePercent: Decimal },
  scheduleB: { managementFeePercent: Decimal }
): InvoicePreviewRow[] {
  return units.map((unit) => {
    const isCommercial = unit.unitType === "COMMERCIAL";
    const sharePercentA = isCommercial
      ? COMMERCIAL_SCHEDULE_A_PERCENT
      : flatScheduleAPercent(unit.scheduleWeight!, flatsTotal);

    const calcA = calculateQuarterlyAmount({
      annualBudget: budgetA,
      sharePercent: sharePercentA,
      managementFeePercent: scheduleA.managementFeePercent,
    });

    let scheduleBLineTotal: Decimal | null = null;
    if (!isCommercial) {
      const sharePercentB = flatScheduleBPercent(unit.scheduleWeight!, flatsTotal);
      const calcB = calculateQuarterlyAmount({
        annualBudget: budgetB,
        sharePercent: sharePercentB,
        managementFeePercent: scheduleB.managementFeePercent,
      });
      scheduleBLineTotal = calcB.lineTotal;
    }

    const grandTotal = scheduleBLineTotal
      ? calcA.lineTotal.plus(scheduleBLineTotal)
      : calcA.lineTotal;

    return {
      unitId: unit.id,
      unitRef: unit.unitRef,
      isCommercial,
      scheduleALineTotal: calcA.lineTotal,
      scheduleBLineTotal,
      grandTotal,
    };
  });
}

function buildInvoiceNumber(yearLabel: string, quarter: Quarter, unitRef: string): string {
  const year = yearLabel.split("/")[0];
  const ref = unitRef
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace("FLAT", "F")
    .replace("COMMERCIAL", "COM");
  return `WP-${year}-${quarter}-${ref}`;
}

export async function updateInvoiceStatus(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { lineItems: true, payments: true },
  });

  if (invoice.status === "VOID") return;

  const totalDue = invoice.lineItems.reduce(
    (sum, li) => sum.plus(li.lineTotal),
    new Decimal(0)
  );
  const totalPaid = invoice.payments.reduce(
    (sum, p) => sum.plus(p.amount),
    new Decimal(0)
  );

  let status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "VOID" = invoice.status as any;

  if (totalPaid.gte(totalDue)) {
    status = "PAID";
  } else if (totalPaid.gt(0)) {
    status = "PARTIALLY_PAID";
  } else if (invoice.dueDate < new Date() && invoice.status === "SENT") {
    status = "OVERDUE";
  }

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
}
