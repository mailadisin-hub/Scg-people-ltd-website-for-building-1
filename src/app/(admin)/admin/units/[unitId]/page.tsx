import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/client";
import Link from "next/link";
import { ArrowLeft, Building2, User, CreditCard, FileText, Edit } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function updateWeight(formData: FormData) {
  "use server";
  const unitId = formData.get("unitId") as string;
  const weight = formData.get("weight") as string;
  if (!unitId || !weight) return;
  await prisma.unit.update({ where: { id: unitId }, data: { scheduleWeight: weight } });
  revalidatePath(`/admin/units/${unitId}`);
}

export default async function UnitDetailPage({ params }: { params: { unitId: string } }) {
  const unit = await prisma.unit.findUnique({
    where: { id: params.unitId },
    include: {
      leaseholder: { include: { user: true } },
      invoices: {
        where: { status: { not: "VOID" } },
        include: { lineItems: true, payments: true, serviceChargeYear: true },
        orderBy: { issueDate: "desc" },
      },
      payments: { orderBy: { paymentDate: "desc" }, take: 20 },
    },
  });

  if (!unit) notFound();

  const totalInvoiced = unit.invoices.reduce((sum, inv) => {
    return sum.plus(inv.lineItems.reduce((s, li) => s.plus(li.lineTotal), new Decimal(0)));
  }, new Decimal(0));

  const totalPaid = unit.payments.reduce((s, p) => s.plus(p.amount), new Decimal(0));
  const balance = totalInvoiced.minus(totalPaid);

  const statusConfig: Record<string, { variant: any; label: string }> = {
    DRAFT: { variant: "draft", label: "Draft" },
    SENT: { variant: "sent", label: "Sent" },
    PARTIALLY_PAID: { variant: "partiallyPaid", label: "Part Paid" },
    PAID: { variant: "paid", label: "Paid" },
    OVERDUE: { variant: "overdue", label: "Overdue" },
    VOID: { variant: "void", label: "Void" },
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/units" className="text-sm text-gray-500 hover:text-brand-blue flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Units
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-brand-blue flex items-center gap-2">
              <Building2 className="w-8 h-8" />
              {unit.unitRef}
            </h1>
            <p className="text-gray-500 mt-1">Westcote Place</p>
          </div>
          <Badge variant={unit.unitType === "COMMERCIAL" ? "gold" : "default"} className="text-sm px-3 py-1">
            {unit.unitType === "COMMERCIAL" ? "Commercial" : "Residential Flat"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Ledger */}
        <div className="xl:col-span-2 space-y-6">
          {/* Balance summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-brand-blue border-t-4">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">Total Invoiced</p>
                <p className="text-xl font-bold text-brand-blue mt-1">{formatCurrency(totalInvoiced.toNumber())}</p>
              </CardContent>
            </Card>
            <Card className="border-green-400 border-t-4">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">Total Paid</p>
                <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totalPaid.toNumber())}</p>
              </CardContent>
            </Card>
            <Card className={`border-t-4 ${balance.gt(0) ? "border-amber-400" : "border-green-400"}`}>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">Balance</p>
                <p className={`text-xl font-bold mt-1 ${balance.gt(0) ? "text-amber-600" : "text-green-700"}`}>
                  {formatCurrency(Math.abs(balance.toNumber()))}
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    {balance.gt(0) ? "owed" : balance.lt(0) ? "credit" : ""}
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Invoices */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Invoices
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {unit.invoices.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No invoices yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Invoice</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Period</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400">Due</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-400">Amount</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {unit.invoices.map((inv) => {
                      const invTotal = inv.lineItems.reduce((s, li) => s.plus(li.lineTotal), new Decimal(0));
                      const { variant, label } = statusConfig[inv.status] ?? { variant: "default", label: inv.status };
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link href={`/admin/invoices/${inv.id}`} className="text-brand-blue hover:underline font-medium">
                              {inv.invoiceNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{inv.serviceChargeYear.label} · {inv.quarter}</td>
                          <td className="px-4 py-3 text-gray-500">{formatDateShort(inv.dueDate)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-brand-blue">{formatCurrency(invTotal.toNumber())}</td>
                          <td className="px-4 py-3 text-center"><Badge variant={variant}>{label}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payment History
              </CardTitle>
              <Link href="/admin/payments">
                <Button size="sm" variant="outline">Record Payment</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {unit.payments.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No payments recorded</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {unit.payments.map((p) => (
                    <div key={p.id} className="py-2.5 flex justify-between text-sm">
                      <div>
                        <p className="text-gray-700">{p.method.replace(/_/g, " ")}</p>
                        <p className="text-xs text-gray-400">
                          {formatDateShort(p.paymentDate)}
                          {p.reference && ` · Ref: ${p.reference}`}
                          {!p.invoiceId && <span className="text-amber-500"> · Unallocated</span>}
                        </p>
                      </div>
                      <span className="font-semibold text-green-700">+{formatCurrency(Number(p.amount))}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Details */}
        <div className="space-y-4">
          {/* Leaseholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                Leaseholder
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unit.leaseholder ? (
                <div className="space-y-2">
                  <p className="font-semibold text-gray-800">{unit.leaseholder.user.name}</p>
                  <p className="text-sm text-gray-500">{unit.leaseholder.user.email}</p>
                  <Badge variant="paid">Portal Access Active</Badge>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-amber-600 mb-3">No portal account assigned</p>
                  <Link href="/admin/leaseholders">
                    <Button size="sm" variant="outline" className="w-full">Assign Leaseholder</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Apportionment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Apportionment</CardTitle>
            </CardHeader>
            <CardContent>
              {unit.unitType === "COMMERCIAL" ? (
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Schedule A</span>
                    <span className="font-semibold text-brand-blue">25.0000% (fixed)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Schedule B</span>
                    <span className="text-gray-400">Not applicable</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm space-y-1 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Schedule Weight</span>
                      <span className="font-semibold">{unit.scheduleWeight?.toString() ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Schedule A</span>
                      <span className="font-semibold text-brand-blue">
                        {unit.scheduleWeight ? (Number(unit.scheduleWeight) / 102 * 75).toFixed(4) : "—"}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Schedule B</span>
                      <span className="font-semibold text-brand-gold-dark">
                        {unit.scheduleWeight ? (Number(unit.scheduleWeight) / 102 * 100).toFixed(4) : "—"}%
                      </span>
                    </div>
                  </div>
                  <form action={updateWeight} className="flex gap-2">
                    <input type="hidden" name="unitId" value={unit.id} />
                    <input
                      name="weight"
                      type="number"
                      step="0.001"
                      min="1"
                      defaultValue={unit.scheduleWeight?.toString() ?? ""}
                      placeholder="Weight"
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue"
                    />
                    <Button type="submit" size="sm" variant="outline">
                      <Edit className="w-3 h-3" />
                    </Button>
                  </form>
                  <p className="text-xs text-gray-400 mt-1">Total flat weight = 102</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
