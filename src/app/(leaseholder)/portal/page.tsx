import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/client";
import { FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

async function getPortalData(userId: string) {
  const leaseholder = await prisma.leaseholder.findUnique({
    where: { userId },
    include: { unit: true, user: true },
  });

  if (!leaseholder) return null;

  const invoices = await prisma.invoice.findMany({
    where: { unitId: leaseholder.unitId, status: { not: "VOID" } },
    include: { lineItems: true, payments: true },
    orderBy: { issueDate: "desc" },
  });

  const totalDue = invoices.reduce((sum, inv) => {
    const invTotal = inv.lineItems.reduce((s, li) => s.plus(li.lineTotal), new Decimal(0));
    return sum.plus(invTotal);
  }, new Decimal(0));

  const totalPaid = invoices.reduce((sum, inv) => {
    return sum.plus(inv.payments.reduce((s, p) => s.plus(p.amount), new Decimal(0)));
  }, new Decimal(0));

  const balance = totalDue.minus(totalPaid);

  const nextDue = invoices.find(
    (inv) => inv.status === "SENT" || inv.status === "PARTIALLY_PAID" || inv.status === "OVERDUE"
  );

  return { leaseholder, invoices: invoices.slice(0, 5), totalDue, totalPaid, balance, nextDue };
}

export default async function PortalDashboard() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) redirect("/login");

  const data = await getPortalData(userId);

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Your account is not yet linked to a unit. Please contact your property manager.</p>
      </div>
    );
  }

  const { leaseholder, invoices, balance, nextDue } = data;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-blue">
          Welcome, {leaseholder.user?.name ?? "Leaseholder"}
        </h1>
        <p className="text-gray-500 mt-1">
          {leaseholder.unit.unitRef}, Westcote Place
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className={balance.gt(0) ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-600">Account Balance</p>
            <p className={`text-2xl font-bold mt-1 ${balance.gt(0) ? "text-amber-700" : "text-green-700"}`}>
              {formatCurrency(balance.toNumber())}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {balance.gt(0) ? "Outstanding" : balance.lt(0) ? "Credit" : "Fully paid"}
            </p>
          </CardContent>
        </Card>

        {nextDue && (
          <Card className="border-blue-200 bg-blue-50 sm:col-span-2">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-gray-600">Next Payment Due</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-2xl font-bold text-brand-blue">
                  {formatCurrency(
                    nextDue.lineItems.reduce((s, li) => s + Number(li.lineTotal), 0) -
                      nextDue.payments.reduce((s, p) => s + Number(p.amount), 0)
                  )}
                </p>
                <p className="text-sm text-gray-600 font-medium">
                  Due {formatDate(nextDue.dueDate)}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">Invoice {nextDue.invoiceNumber}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Invoices</CardTitle>
          <Link href="/portal/invoices" className="text-xs text-brand-gold hover:underline font-medium">
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No invoices yet</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {invoices.map((inv) => {
                const total = inv.lineItems.reduce((s, li) => s + Number(li.lineTotal), 0);
                const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
                const statusMap: Record<string, { variant: any; label: string; icon: React.ReactNode }> = {
                  PAID: { variant: "paid", label: "Paid", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                  SENT: { variant: "sent", label: "Outstanding", icon: <Clock className="w-3.5 h-3.5" /> },
                  PARTIALLY_PAID: { variant: "partiallyPaid", label: "Part Paid", icon: <Clock className="w-3.5 h-3.5" /> },
                  OVERDUE: { variant: "overdue", label: "Overdue", icon: <AlertCircle className="w-3.5 h-3.5" /> },
                  DRAFT: { variant: "draft", label: "Pending", icon: <FileText className="w-3.5 h-3.5" /> },
                };
                const { variant, label, icon } = statusMap[inv.status] ?? { variant: "default", label: inv.status, icon: null };

                return (
                  <Link
                    key={inv.id}
                    href={`/portal/invoices/${inv.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 px-2 -mx-2 rounded transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">
                        {inv.quarter} · Due {new Date(inv.dueDate).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-brand-blue">{formatCurrency(total)}</p>
                      <Badge variant={variant} className="text-xs gap-1">
                        {icon}
                        {label}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
