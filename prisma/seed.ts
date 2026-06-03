import { PrismaClient, UnitType } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

function createClient() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (url.startsWith("file:")) {
    const adapter = new PrismaBetterSqlite3({ url });
    return new PrismaClient({ adapter, log: ["error"] } as any);
  }
  const { PrismaPg } = require("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter, log: ["error"] } as any);
}

const prisma = createClient();

async function main() {
  console.log("🌱 Seeding Westcote Place database...");

  // ── Admin user ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@scgpeople.co.uk" },
    update: {},
    create: {
      email: "admin@scgpeople.co.uk",
      passwordHash,
      name: "SCG Admin",
      role: "ADMIN",
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // ── Units ───────────────────────────────────────────────────────────────────
  // Weights from lease schedule:
  //   Two-bed (Flats 1-2): 9
  //   One-bed (Flats 3-8): 7
  //   Studio (Flats 9-15): 6
  //   Commercial: null (pays fixed 25% of Schedule A)
  //
  // Total flat weight = 2×9 + 6×7 + 7×6 = 18 + 42 + 42 = 102
  // Commercial pays 25% Schedule A; flats share remaining 75%.
  // Flats share 100% of Schedule B proportionally.

  const unitData: Array<{
    unitRef: string;
    unitType: UnitType;
    floorNumber: number | null;
    scheduleWeight: string | null;
  }> = [
    { unitRef: "Flat 1",  unitType: "FLAT",       floorNumber: 1, scheduleWeight: "9" },
    { unitRef: "Flat 2",  unitType: "FLAT",       floorNumber: 1, scheduleWeight: "9" },
    { unitRef: "Flat 3",  unitType: "FLAT",       floorNumber: 1, scheduleWeight: "7" },
    { unitRef: "Flat 4",  unitType: "FLAT",       floorNumber: 2, scheduleWeight: "7" },
    { unitRef: "Flat 5",  unitType: "FLAT",       floorNumber: 2, scheduleWeight: "7" },
    { unitRef: "Flat 6",  unitType: "FLAT",       floorNumber: 2, scheduleWeight: "7" },
    { unitRef: "Flat 7",  unitType: "FLAT",       floorNumber: 3, scheduleWeight: "7" },
    { unitRef: "Flat 8",  unitType: "FLAT",       floorNumber: 3, scheduleWeight: "7" },
    { unitRef: "Flat 9",  unitType: "FLAT",       floorNumber: 3, scheduleWeight: "6" },
    { unitRef: "Flat 10", unitType: "FLAT",       floorNumber: 4, scheduleWeight: "6" },
    { unitRef: "Flat 11", unitType: "FLAT",       floorNumber: 4, scheduleWeight: "6" },
    { unitRef: "Flat 12", unitType: "FLAT",       floorNumber: 4, scheduleWeight: "6" },
    { unitRef: "Flat 13", unitType: "FLAT",       floorNumber: 5, scheduleWeight: "6" },
    { unitRef: "Flat 14", unitType: "FLAT",       floorNumber: 5, scheduleWeight: "6" },
    { unitRef: "Flat 15", unitType: "FLAT",       floorNumber: 5, scheduleWeight: "6" },
    { unitRef: "Commercial", unitType: "COMMERCIAL", floorNumber: 0, scheduleWeight: null },
  ];

  for (const u of unitData) {
    await prisma.unit.upsert({
      where: { unitRef: u.unitRef },
      update: {},
      create: u,
    });
  }
  console.log("✅ 16 units created (15 flats + 1 commercial)");

  // ── Service Charge Year 2025/2026 ───────────────────────────────────────────
  const year = await prisma.serviceChargeYear.upsert({
    where: { label: "2025/2026" },
    update: { isCurrent: true },
    create: {
      label: "2025/2026",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2026-03-31"),
      isCurrent: true,
    },
  });
  console.log("✅ Service Charge Year 2025/2026 created");

  // ── Schedules ───────────────────────────────────────────────────────────────
  const scheduleA = await prisma.schedule.upsert({
    where: {
      serviceChargeYearId_scheduleType: {
        serviceChargeYearId: year.id,
        scheduleType: "A",
      },
    },
    update: {},
    create: {
      serviceChargeYearId: year.id,
      scheduleType: "A",
      managementFeePercent: "3.25",
    },
  });

  const scheduleB = await prisma.schedule.upsert({
    where: {
      serviceChargeYearId_scheduleType: {
        serviceChargeYearId: year.id,
        scheduleType: "B",
      },
    },
    update: {},
    create: {
      serviceChargeYearId: year.id,
      scheduleType: "B",
      managementFeePercent: "3.25",
    },
  });
  console.log("✅ Schedule A and Schedule B created (3.25% management fee)");

  // ── Budget line items ────────────────────────────────────────────────────────
  // Schedule A — whole building
  const scheduleABudget = [
    { categoryName: "Building Insurance",     budgetedAmount: "3200.00", displayOrder: 1 },
    { categoryName: "Lift Maintenance",       budgetedAmount: "1800.00", displayOrder: 2 },
    { categoryName: "Communal Utilities",     budgetedAmount: "900.00",  displayOrder: 3 },
    { categoryName: "External Maintenance",   budgetedAmount: "1200.00", displayOrder: 4 },
    { categoryName: "Fire Safety",            budgetedAmount: "600.00",  displayOrder: 5 },
    { categoryName: "Building Repairs",       budgetedAmount: "2000.00", displayOrder: 6 },
    { categoryName: "Grounds Maintenance",    budgetedAmount: "800.00",  displayOrder: 7 },
    { categoryName: "CCTV & Security",        budgetedAmount: "400.00",  displayOrder: 8 },
  ];

  // Schedule B — flats only
  const scheduleBBudget = [
    { categoryName: "Communal Cleaning",      budgetedAmount: "3600.00", displayOrder: 1 },
    { categoryName: "Internal Maintenance",   budgetedAmount: "1500.00", displayOrder: 2 },
    { categoryName: "Communal Lighting",      budgetedAmount: "600.00",  displayOrder: 3 },
    { categoryName: "Intercom & Entry",       budgetedAmount: "400.00",  displayOrder: 4 },
    { categoryName: "Waste Management",       budgetedAmount: "800.00",  displayOrder: 5 },
  ];

  for (const item of scheduleABudget) {
    await prisma.budgetLineItem.create({
      data: { scheduleId: scheduleA.id, ...item, description: null },
    });
  }
  for (const item of scheduleBBudget) {
    await prisma.budgetLineItem.create({
      data: { scheduleId: scheduleB.id, ...item, description: null },
    });
  }

  const totalA = scheduleABudget.reduce((s, i) => s + parseFloat(i.budgetedAmount), 0);
  const totalB = scheduleBBudget.reduce((s, i) => s + parseFloat(i.budgetedAmount), 0);
  console.log(`✅ Budget seeded: Schedule A £${totalA}, Schedule B £${totalB}`);

  // ── Expense categories (sample) ─────────────────────────────────────────────
  const insuranceCat = await prisma.expenseCategory.create({
    data: {
      scheduleId: scheduleA.id,
      name: "Building Insurance",
      displayOrder: 1,
    },
  });
  await prisma.expenseItem.create({
    data: {
      expenseCategoryId: insuranceCat.id,
      description: "Annual building insurance premium 2025/26",
      amount: "3150.00",
      date: new Date("2025-04-01"),
      supplier: "Aviva",
      invoiceRef: "AV-2025-001",
    },
  });

  const cleaningCat = await prisma.expenseCategory.create({
    data: {
      scheduleId: scheduleB.id,
      name: "Communal Cleaning",
      displayOrder: 1,
    },
  });
  await prisma.expenseItem.create({
    data: {
      expenseCategoryId: cleaningCat.id,
      description: "Q1 communal cleaning contract",
      amount: "900.00",
      date: new Date("2025-06-30"),
      supplier: "CleanPro Services",
    },
  });

  console.log("✅ Sample expense categories and items created");
  console.log("\n🎉 Seeding complete!");
  console.log("📧 Admin login: admin@scgpeople.co.uk");
  console.log("🔑 Password:    ChangeMe123!  (change immediately after first login)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
