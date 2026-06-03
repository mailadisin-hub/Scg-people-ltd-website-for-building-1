import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/client";
import { totalFlatsWeight, flatScheduleAPercent, flatScheduleBPercent } from "@/lib/finance/apportionment";
import { PieChart } from "lucide-react";

export default async function LeaseholderBudgetPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) redirect("/login");

  const leaseholder = await prisma.leaseholder.findUnique({
    where: { userId },
    include: { unit: true },
  });
  if (!leaseholder) redirect("/portal");

  const currentYear = await prisma.serviceChargeYear.findFirst({
    where: { isCurrent: true },
    include: {
      schedules: {
        include: { budgetLineItems: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });

  if (!currentYear) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No budget data available yet. Please contact your property manager.</p>
      </div>
    );
  }

  const scheduleA = currentYear.schedules.find((s) => s.scheduleType === "A");
  const scheduleB = currentYear.schedules.find((s) => s.scheduleType === "B");

  const flatUnits = await prisma.unit.findMany({ where: { unitType: "FLAT" } });
  const flatsTotal = totalFlatsWeight(flatUnits.map((u) => ({
    unitId: u.id, unitRef: u.unitRef, isCommercial: false, scheduleWeight: u.scheduleWeight,
  })));

  const isCommercial = leaseholder.unit.unitType === "COMMERCIAL";
  const weight = leaseholder.unit.scheduleWeight;

  const sharePercentA = isCommercial
    ? new Decimal("25")
    : weight ? flatScheduleAPercent(weight, flatsTotal) : new Decimal(0);

  const sharePercentB = !isCommercial && weight
    ? flatScheduleBPercent(weight, flatsTotal)
    : null;

  const totalBudgetA = scheduleA?.budgetLineItems.reduce((s, li) => s.plus(li.budgetedAmount), new Decimal(0)) ?? new Decimal(0);
  const totalBudgetB = scheduleB?.budgetLineItems.reduce((s, li) => s.plus(li.budgetedAmount), new Decimal(0)) ?? new Decimal(0);

  const myAnnualA = totalBudgetA.times(sharePercentA).div(100);
  const myAnnualB = sharePercentB ? totalBudgetB.times(sharePercentB).div(100) : new Decimal(0);
  const myAnnualTotal = myAnnualA.plus(myAnnualB);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-blue flex items-center gap-2">
          <PieChart className="w-6 h-6" />
          Budget {currentYear.label}
        </h1>
        <p className="text-gray-500 mt-1">Your share of the service charge budget</p>
      </div>

      {/* My annual summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="border-brand-blue border">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">My Annual Total</p>
            <p className="text-2xl font-bold text-brand-blue mt-1">{formatCurrency(myAnnualTotal.toNumber())}</p>
            <p className="text-xs text-gray-400 mt-1">Quarterly: {formatCurrency(myAnnualTotal.div(4).toNumber())}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Schedule A Share</p>
            <p className="text-xl font-bold text-brand-blue mt-1">{sharePercentA.toFixed(4)}%</p>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(myAnnualA.toNumber())} / yr</p>
          </CardContent>
        </Card>
        {sharePercentB && (
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Schedule B Share</p>
              <p className="text-xl font-bold text-brand-gold-dark mt-1">{sharePercentB.toFixed(4)}%</p>
              <p className="text-xs text-gray-400 mt-1">{formatCurrency(myAnnualB.toNumber())} / yr</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Budget detail */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {scheduleA && (
          <Card className="border-t-4 border-t-brand-blue">
            <CardHeader>
              <CardTitle className="text-base">Schedule A — Whole Building</CardTitle>
              <p className="text-xs text-gray-500">Your share: {sharePercentA.toFixed(4)}%</p>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 text-xs text-gray-400">Category</th>
                    <th className="text-right pb-2 text-xs text-gray-400">Total Budget</th>
                    <th className="text-right pb-2 text-xs text-gray-400">Your Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {scheduleA.budgetLineItems.map((item) => {
                    const myShare = new Decimal(item.budgetedAmount.toString()).times(sharePercentA).div(100);
                    return (
                      <tr key={item.id}>
                        <td className="py-2 text-gray-700">{item.categoryName}</td>
                        <td className="py-2 text-right text-gray-500 text-xs">{formatCurrency(Number(item.budgetedAmount))}</td>
                        <td className="py-2 text-right font-medium text-brand-blue">{formatCurrency(myShare.toNumber())}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-bold">
                    <td className="pt-2">Total</td>
                    <td className="pt-2 text-right text-gray-500 text-xs">{formatCurrency(totalBudgetA.toNumber())}</td>
                    <td className="pt-2 text-right text-brand-blue">{formatCurrency(myAnnualA.toNumber())}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        )}

        {scheduleB && sharePercentB && (
          <Card className="border-t-4 border-t-brand-gold">
            <CardHeader>
              <CardTitle className="text-base">Schedule B — Flats Only</CardTitle>
              <p className="text-xs text-gray-500">Your share: {sharePercentB.toFixed(4)}%</p>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 text-xs text-gray-400">Category</th>
                    <th className="text-right pb-2 text-xs text-gray-400">Total Budget</th>
                    <th className="text-right pb-2 text-xs text-gray-400">Your Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {scheduleB.budgetLineItems.map((item) => {
                    const myShare = new Decimal(item.budgetedAmount.toString()).times(sharePercentB).div(100);
                    return (
                      <tr key={item.id}>
                        <td className="py-2 text-gray-700">{item.categoryName}</td>
                        <td className="py-2 text-right text-gray-500 text-xs">{formatCurrency(Number(item.budgetedAmount))}</td>
                        <td className="py-2 text-right font-medium text-brand-gold-dark">{formatCurrency(myShare.toNumber())}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-bold">
                    <td className="pt-2">Total</td>
                    <td className="pt-2 text-right text-gray-500 text-xs">{formatCurrency(totalBudgetB.toNumber())}</td>
                    <td className="pt-2 text-right text-brand-gold-dark">{formatCurrency(myAnnualB.toNumber())}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
