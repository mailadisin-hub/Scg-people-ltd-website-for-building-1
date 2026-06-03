import { Decimal } from "@prisma/client/runtime/client";

// Weights from lease documents
// Two-bed: 9, One-bed: 7, Studio: 6
// Total flat weight: 2×9 + 6×7 + 7×6 = 18 + 42 + 42 = 102
// Commercial pays a fixed 25% of Schedule A; flats share the remaining 75%.

export const COMMERCIAL_SCHEDULE_A_PERCENT = new Decimal("25");
export const FLATS_SCHEDULE_A_PERCENT = new Decimal("75");
export const MANAGEMENT_FEE_DEFAULT = new Decimal("3.25");

export interface UnitApportionment {
  unitId: string;
  unitRef: string;
  isCommercial: boolean;
  scheduleWeight: Decimal | null;
}

/**
 * Calculate the total weight of all flat units.
 * Used to normalise each flat's proportional share.
 */
export function totalFlatsWeight(units: UnitApportionment[]): Decimal {
  return units
    .filter((u) => !u.isCommercial && u.scheduleWeight !== null)
    .reduce((sum, u) => sum.plus(u.scheduleWeight!), new Decimal(0));
}

/**
 * Returns a flat's percentage share of Schedule A (within the 75% flats portion).
 * e.g. weight=9, totalWeight=102 → 9/102 * 75 = 6.6176...%
 */
export function flatScheduleAPercent(weight: Decimal, flatsTotal: Decimal): Decimal {
  return weight.div(flatsTotal).times(FLATS_SCHEDULE_A_PERCENT);
}

/**
 * Returns a flat's percentage share of Schedule B (100% flats only).
 * e.g. weight=9, totalWeight=102 → 9/102 * 100 = 8.8235...%
 */
export function flatScheduleBPercent(weight: Decimal, flatsTotal: Decimal): Decimal {
  return weight.div(flatsTotal).times(100);
}

/**
 * Calculate the unit's share amount from a schedule's annual budget.
 * Returns quarterly share (annual / 4) with management fee applied.
 */
export function calculateQuarterlyAmount(params: {
  annualBudget: Decimal;
  sharePercent: Decimal;
  managementFeePercent: Decimal;
}): {
  annualScheduleTotal: Decimal;
  quarterlyTotal: Decimal;
  unitShareAmount: Decimal;
  managementFeeAmount: Decimal;
  lineTotal: Decimal;
} {
  const annualScheduleTotal = params.annualBudget;
  const quarterlyTotal = annualScheduleTotal.div(4);
  const unitShareAmount = quarterlyTotal.times(params.sharePercent).div(100);
  const managementFeeAmount = unitShareAmount.times(params.managementFeePercent).div(100);
  const lineTotal = unitShareAmount.plus(managementFeeAmount);

  return {
    annualScheduleTotal,
    quarterlyTotal,
    unitShareAmount,
    managementFeeAmount,
    lineTotal,
  };
}

/** Format Decimal as GBP string */
export function formatGBP(amount: Decimal | number | string): string {
  const n = typeof amount === "object" ? amount.toNumber() : Number(amount);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(n);
}
