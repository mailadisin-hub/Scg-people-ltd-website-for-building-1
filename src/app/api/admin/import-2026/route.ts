import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── Real 2026 financial data from SCG People spreadsheet ───────────────────
//
// annualA = annual Schedule A charge incl. insurance (per unit, incl 2% mgmt fee)
// annualB = annual Schedule B charge (flats only, incl 2% mgmt fee)
// credit  = balancing credit carried forward from 2025 (negative = owed back)
// paid    = whether Q1 invoice has been paid
// inv     = invoice number suffix

const UNITS = [
  { ref: "Flat 1",      annualA: 700.77,  annualB: 657.00, credit: -228.81, paid: false, inv: "F01" },
  { ref: "Flat 2",      annualA: 700.77,  annualB: 657.00, credit: -177.89, paid: true,  inv: "F02" },
  { ref: "Flat 3",      annualA: 545.04,  annualB: 511.00, credit: -152.48, paid: false, inv: "F03" },
  { ref: "Flat 4",      annualA: 545.04,  annualB: 511.00, credit: -152.48, paid: true,  inv: "F04" },
  { ref: "Flat 5",      annualA: 545.04,  annualB: 511.00, credit: -152.48, paid: false, inv: "F05" },
  { ref: "Flat 6",      annualA: 545.04,  annualB: 511.00, credit: -228.71, paid: false, inv: "F06" },
  { ref: "Flat 7",      annualA: 545.04,  annualB: 511.00, credit: -177.89, paid: true,  inv: "F07" },
  { ref: "Flat 8",      annualA: 545.04,  annualB: 511.00, credit: -152.48, paid: false, inv: "F08" },
  { ref: "Flat 9",      annualA: 467.18,  annualB: 438.00, credit: -152.48, paid: false, inv: "F09" },
  { ref: "Flat 10",     annualA: 467.18,  annualB: 438.00, credit: -152.48, paid: false, inv: "F10" },
  { ref: "Flat 11",     annualA: 467.18,  annualB: 438.00, credit: -177.89, paid: false, inv: "F11" },
  { ref: "Flat 12",     annualA: 467.18,  annualB: 438.00, credit: -177.89, paid: true,  inv: "F12" },
  { ref: "Flat 13",     annualA: 467.18,  annualB: 438.00, credit: -152.48, paid: false, inv: "F13" },
  { ref: "Flat 14",     annualA: 467.18,  annualB: 438.00, credit: -152.48, paid: false, inv: "F14" },
  { ref: "Flat 15",     annualA: 467.18,  annualB: 438.00, credit: -152.48, paid: false, inv: "F15" },
  { ref: "Commercial",  annualA: 2595.42, annualB: 0,      credit: 0,       paid: true,  inv: "C01" },
];

// Budget for 2025/2026 schedule year
const BUDGET_A = [
  { categoryName: "Building Services",  budgetedAmount: "6950.00",  displayOrder: 1 },
  { categoryName: "Building Insurance", budgetedAmount: "3431.68",  displayOrder: 2 },
];
const BUDGET_B = [
  { categoryName: "Flat Services",      budgetedAmount: "7300.00",  displayOrder: 1 },
];

const MGMT_FEE = "2.00";

// Invoice issue/due dates — Q1 of 2025/2026 service charge year
const ISSUE_DATE = new Date("2025-04-01");
const DUE_DATE   = new Date("2025-05-01");

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}

async function handler(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const results: string[] = [];

  // ── 1. Find the 2025/2026 service charge year ──────────────────────────────
  const year = await prisma.serviceChargeYear.findUnique({
    where: { label: "2025/2026" },
    include: { schedules: true },
  });
  if (!year) return NextResponse.json({ error: "2025/2026 year not found — run /api/setup first" }, { status: 400 });

  const schedA = year.schedules.find((s) => s.scheduleType === "A");
  const schedB = year.schedules.find((s) => s.scheduleType === "B");
  if (!schedA || !schedB) return NextResponse.json({ error: "Schedules not found" }, { status: 400 });

  // ── 2. Delete all existing Q1 invoices for this year (clean slate) ──────────
  const existingQ1 = await prisma.invoice.findMany({
    where: { serviceChargeYearId: year.id, quarter: "Q1" },
    select: { id: true },
  });
  if (existingQ1.length > 0) {
    const ids = existingQ1.map((i) => i.id);
    await prisma.payment.deleteMany({ where: { invoiceId: { in: ids } } });
    await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: { in: ids } } });
    await prisma.invoice.deleteMany({ where: { id: { in: ids } } });
    results.push(`🗑️  Deleted ${ids.length} existing Q1 invoices`);
  }

  // ── 3. Update management fee to 2% ────────────────────────────────────────
  await prisma.schedule.update({ where: { id: schedA.id }, data: { managementFeePercent: MGMT_FEE } });
  await prisma.schedule.update({ where: { id: schedB.id }, data: { managementFeePercent: MGMT_FEE } });
  results.push("✅ Management fee updated to 2%");

  // ── 3. Replace budget line items with real 2026 figures ────────────────────
  await prisma.budgetLineItem.deleteMany({ where: { scheduleId: schedA.id } });
  await prisma.budgetLineItem.deleteMany({ where: { scheduleId: schedB.id } });

  for (const item of BUDGET_A) {
    await prisma.budgetLineItem.create({ data: { scheduleId: schedA.id, ...item, description: null } });
  }
  for (const item of BUDGET_B) {
    await prisma.budgetLineItem.create({ data: { scheduleId: schedB.id, ...item, description: null } });
  }
  results.push("✅ Budget updated: Schedule A £10,381.68 | Schedule B £7,300.00");

  // ── 4. Create Q1 2025/2026 invoices ────────────────────────────────────────
  const units = await prisma.unit.findMany();
  const unitMap = new Map(units.map((u) => [u.unitRef, u]));

  let created = 0;
  let skipped = 0;

  for (const data of UNITS) {
    const unit = unitMap.get(data.ref);
    if (!unit) { results.push(`⚠️  Unit not found: ${data.ref}`); continue; }

    const invoiceNumber = `WP-2026-Q1-${data.inv}`;

    const quarterlyA = round2(data.annualA / 4);
    const quarterlyB = round2(data.annualB / 4);
    const quarterlyTotal = round2(quarterlyA + quarterlyB);
    const netQ1 = round2(quarterlyTotal + data.credit); // credit is negative

    // Split net Q1 proportionally between schedule A and B
    const propA = quarterlyTotal > 0 ? quarterlyA / quarterlyTotal : 1;
    const propB = quarterlyTotal > 0 ? quarterlyB / quarterlyTotal : 0;
    const netA = round2(netQ1 * propA);
    const netB = round2(netQ1 * propB);

    const status = data.paid ? "PAID" : "OVERDUE";

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        serviceChargeYearId: year.id,
        unitId: unit.id,
        quarter: "Q1",
        issueDate: ISSUE_DATE,
        dueDate: DUE_DATE,
        status,
        sentAt: ISSUE_DATE,
        lineItems: {
          create: [
            {
              scheduleType: "A",
              description: `Schedule A (Building Services + Insurance) Q1 2025/26 — incl. balancing credit of £${Math.abs(data.credit).toFixed(2)}`,
              annualScheduleTotal: "10381.68",
              quarterlyTotal: String(round2(10381.68 / 4)),
              unitShareAmount: String(round2(data.annualA / 4 / 1.02)),
              managementFeeAmount: String(round2((data.annualA / 4) - (data.annualA / 4 / 1.02))),
              lineTotal: String(netA),
              sharePercentage: String(round2((data.annualA / (data.annualA + data.annualB || 1)) * 100)),
            },
            ...(data.annualB > 0
              ? [{
                  scheduleType: "B" as const,
                  description: `Schedule B (Flat Services) Q1 2025/26 — incl. balancing credit`,
                  annualScheduleTotal: "7300.00",
                  quarterlyTotal: String(round2(7300 / 4)),
                  unitShareAmount: String(round2(data.annualB / 4 / 1.02)),
                  managementFeeAmount: String(round2((data.annualB / 4) - (data.annualB / 4 / 1.02))),
                  lineTotal: String(netB),
                  sharePercentage: String(round2((data.annualB / (data.annualA + data.annualB)) * 100)),
                }]
              : []),
          ],
        },
      },
    });

    // Record payment for paid invoices
    if (data.paid) {
      await prisma.payment.create({
        data: {
          unitId: unit.id,
          invoiceId: invoice.id,
          amount: String(netQ1),
          paymentDate: new Date("2025-04-30"),
          method: "BANK_TRANSFER",
          reference: `Q1-2026-${data.inv}`,
          notes: "Recorded from 2026 spreadsheet import",
        },
      });
    }

    created++;
  }

  results.push(`✅ Q1 2025/2026 invoices: ${created} created`);

  return NextResponse.json({ success: true, results });
}
