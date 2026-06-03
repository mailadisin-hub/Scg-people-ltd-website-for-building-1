import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

function html(title: string, body: string, success: boolean) {
  const color = success ? "#16a34a" : "#dc2626";
  const bg = success ? "#f0fdf4" : "#fef2f2";
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — Westcote Place</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#fff;border-radius:16px;padding:40px;max-width:480px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.10)}
    .badge{display:inline-block;background:${bg};color:${color};border:1px solid ${color}40;border-radius:20px;padding:6px 16px;font-size:13px;font-weight:700;margin-bottom:20px}
    h1{font-size:22px;font-weight:800;color:#1C3664;margin-bottom:8px}
    p{font-size:14px;color:#555;line-height:1.6;margin-bottom:12px}
    .mono{background:#f3f4f6;border-radius:8px;padding:12px 16px;font-family:monospace;font-size:13px;color:#1a1a1a;margin:8px 0}
    a{display:inline-block;margin-top:20px;background:#1C3664;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${title}</div>
    ${body}
  </div>
</body>
</html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function GET(req: NextRequest) {
  // Token guard — must match SETUP_TOKEN env var
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.SETUP_TOKEN;

  if (!expected) {
    return html(
      "Setup disabled",
      `<h1>Setup disabled</h1><p>Add a <strong>SETUP_TOKEN</strong> environment variable in Netlify to enable this route.</p>`,
      false
    );
  }

  if (!token || token !== expected) {
    return html(
      "Invalid token",
      `<h1>Invalid token</h1><p>The setup token you provided is incorrect. Check your <strong>SETUP_TOKEN</strong> environment variable.</p>`,
      false
    );
  }

  // Idempotency — don't re-seed if already done
  const existing = await prisma.user.findUnique({
    where: { email: "admin@scgpeople.co.uk" },
  });
  if (existing) {
    return html(
      "Already set up",
      `<h1>Already set up ✓</h1>
       <p>The database has already been seeded. Your portal is ready.</p>
       <p>Log in with:</p>
       <div class="mono">Email: admin@scgpeople.co.uk<br>Password: ChangeMe123!</div>
       <p><strong>Change your password immediately after logging in.</strong></p>
       <a href="/login">Go to login →</a>`,
      true
    );
  }

  // Run seed
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  await prisma.user.create({
    data: { email: "admin@scgpeople.co.uk", passwordHash, name: "SCG Admin", role: "ADMIN" },
  });

  const unitData = [
    { unitRef: "Flat 1",      unitType: "FLAT"       as const, floorNumber: 1, scheduleWeight: "9"   },
    { unitRef: "Flat 2",      unitType: "FLAT"       as const, floorNumber: 1, scheduleWeight: "9"   },
    { unitRef: "Flat 3",      unitType: "FLAT"       as const, floorNumber: 1, scheduleWeight: "7"   },
    { unitRef: "Flat 4",      unitType: "FLAT"       as const, floorNumber: 2, scheduleWeight: "7"   },
    { unitRef: "Flat 5",      unitType: "FLAT"       as const, floorNumber: 2, scheduleWeight: "7"   },
    { unitRef: "Flat 6",      unitType: "FLAT"       as const, floorNumber: 2, scheduleWeight: "7"   },
    { unitRef: "Flat 7",      unitType: "FLAT"       as const, floorNumber: 3, scheduleWeight: "7"   },
    { unitRef: "Flat 8",      unitType: "FLAT"       as const, floorNumber: 3, scheduleWeight: "7"   },
    { unitRef: "Flat 9",      unitType: "FLAT"       as const, floorNumber: 3, scheduleWeight: "6"   },
    { unitRef: "Flat 10",     unitType: "FLAT"       as const, floorNumber: 4, scheduleWeight: "6"   },
    { unitRef: "Flat 11",     unitType: "FLAT"       as const, floorNumber: 4, scheduleWeight: "6"   },
    { unitRef: "Flat 12",     unitType: "FLAT"       as const, floorNumber: 4, scheduleWeight: "6"   },
    { unitRef: "Flat 13",     unitType: "FLAT"       as const, floorNumber: 5, scheduleWeight: "6"   },
    { unitRef: "Flat 14",     unitType: "FLAT"       as const, floorNumber: 5, scheduleWeight: "6"   },
    { unitRef: "Flat 15",     unitType: "FLAT"       as const, floorNumber: 5, scheduleWeight: "6"   },
    { unitRef: "Commercial",  unitType: "COMMERCIAL" as const, floorNumber: 0, scheduleWeight: null  },
  ];
  for (const u of unitData) {
    await prisma.unit.create({ data: u });
  }

  const year = await prisma.serviceChargeYear.create({
    data: { label: "2025/2026", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31"), isCurrent: true },
  });

  const scheduleA = await prisma.schedule.create({
    data: { serviceChargeYearId: year.id, scheduleType: "A", managementFeePercent: "3.25" },
  });
  const scheduleB = await prisma.schedule.create({
    data: { serviceChargeYearId: year.id, scheduleType: "B", managementFeePercent: "3.25" },
  });

  const budgetA = [
    { categoryName: "Building Insurance",   budgetedAmount: "3200.00", displayOrder: 1 },
    { categoryName: "Lift Maintenance",     budgetedAmount: "1800.00", displayOrder: 2 },
    { categoryName: "Communal Utilities",   budgetedAmount: "900.00",  displayOrder: 3 },
    { categoryName: "External Maintenance", budgetedAmount: "1200.00", displayOrder: 4 },
    { categoryName: "Fire Safety",          budgetedAmount: "600.00",  displayOrder: 5 },
    { categoryName: "Building Repairs",     budgetedAmount: "2000.00", displayOrder: 6 },
    { categoryName: "Grounds Maintenance",  budgetedAmount: "800.00",  displayOrder: 7 },
    { categoryName: "CCTV & Security",      budgetedAmount: "400.00",  displayOrder: 8 },
  ];
  const budgetB = [
    { categoryName: "Communal Cleaning",   budgetedAmount: "3600.00", displayOrder: 1 },
    { categoryName: "Internal Maintenance",budgetedAmount: "1500.00", displayOrder: 2 },
    { categoryName: "Communal Lighting",   budgetedAmount: "600.00",  displayOrder: 3 },
    { categoryName: "Intercom & Entry",    budgetedAmount: "400.00",  displayOrder: 4 },
    { categoryName: "Waste Management",    budgetedAmount: "800.00",  displayOrder: 5 },
  ];

  for (const item of budgetA) {
    await prisma.budgetLineItem.create({ data: { scheduleId: scheduleA.id, ...item, description: null } });
  }
  for (const item of budgetB) {
    await prisma.budgetLineItem.create({ data: { scheduleId: scheduleB.id, ...item, description: null } });
  }

  return html(
    "Setup complete ✓",
    `<h1>Westcote Place is ready! 🎉</h1>
     <p>Your database has been set up with 16 units (15 flats + commercial), service charge year 2025/2026, and sample budget data.</p>
     <p>Log in with:</p>
     <div class="mono">Email: admin@scgpeople.co.uk<br>Password: ChangeMe123!</div>
     <p><strong>Please change your password immediately after logging in.</strong></p>
     <p style="font-size:12px;color:#999;margin-top:16px">You can delete the SETUP_TOKEN environment variable from Netlify now — this route will not run again.</p>
     <a href="/login">Go to login →</a>`,
    true
  );
}
