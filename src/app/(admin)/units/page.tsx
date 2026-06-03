import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/client";
import { Building2, User } from "lucide-react";
import Link from "next/link";

export default async function UnitsPage() {
  const units = await prisma.unit.findMany({
    orderBy: { unitRef: "asc" },
    include: {
      leaseholder: { include: { user: true } },
      invoices: {
        where: { status: { not: "VOID" } },
        include: { lineItems: true, payments: true },
      },
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-brand-blue">Units</h1>
        <p className="text-gray-500 mt-1">All 16 units at Westcote Place</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {units.map((unit) => {
          const totalInvoiced = unit.invoices.reduce((sum, inv) => {
            return sum.plus(inv.lineItems.reduce((s, li) => s.plus(li.lineTotal), new Decimal(0)));
          }, new Decimal(0));
          const totalPaid = unit.invoices.reduce((sum, inv) => {
            return sum.plus(inv.payments.reduce((s, p) => s.plus(p.amount), new Decimal(0)));
          }, new Decimal(0));
          const balance = totalInvoiced.minus(totalPaid);

          return (
            <Link key={unit.id} href={`/admin/units/${unit.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-brand-blue">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-brand-blue" />
                      <h3 className="font-bold text-brand-blue text-lg">{unit.unitRef}</h3>
                    </div>
                    <Badge variant={unit.unitType === "COMMERCIAL" ? "gold" : "default"}>
                      {unit.unitType === "COMMERCIAL" ? "Commercial" : "Flat"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="w-3.5 h-3.5" />
                      {unit.leaseholder ? (
                        <span>{unit.leaseholder.user.name}</span>
                      ) : (
                        <span className="text-amber-600 italic">No leaseholder assigned</span>
                      )}
                    </div>

                    {unit.scheduleWeight !== null && (
                      <div className="text-xs text-gray-400">
                        Weight: {unit.scheduleWeight.toString()} ·{" "}
                        {unit.unitType === "FLAT" && (
                          <>
                            Schedule A: {(Number(unit.scheduleWeight) / 102 * 75).toFixed(2)}% ·{" "}
                            Schedule B: {(Number(unit.scheduleWeight) / 102 * 100).toFixed(2)}%
                          </>
                        )}
                      </div>
                    )}

                    {unit.unitType === "COMMERCIAL" && (
                      <div className="text-xs text-gray-400">
                        Schedule A: 25.00% (fixed) · Schedule B: N/A
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">Balance</span>
                      <span
                        className={`text-sm font-bold ${
                          balance.gt(0)
                            ? "text-amber-600"
                            : balance.lt(0)
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {balance.isZero() ? "—" : formatCurrency(balance.toNumber())}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
