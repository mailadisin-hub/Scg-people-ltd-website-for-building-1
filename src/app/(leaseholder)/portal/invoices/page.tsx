import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/client";
import Link from "next/link";
import { FileText } from "lucide-react";

const statusMap: Record<string, { variant: any; label: string }> = {
  DRAFT: { variant: "draft", label: "Pending" },
  SENT: { variant: "sent", label: "Outstanding" },
  PARTIALLY_PAID: { variant: "partiallyPaid", label: "Part Paid" },
  PAID: { variant: "paid", label: "Paid" },
  OVERDUE: { variant: "overdue", label: "Overdue" },
  VOID: { variant: "void", label: "Void" },
};

export default async function LeaseholderInvoicesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) redirect("/login");

  const leaseholder = await prisma.leaseholder.findUnique({ where: { userId } });
  if (!leaseholder) redirect("/portal");

  // unitId is available immediately so we can fire the invoice query right away.
  const invoices = await prisma.invoice.findMany({
    where: { unitId: leaseholder.unitId, status: { not: "VOID" } },
    include: { lineItems: true, payments: true, serviceChargeYear: true },
    orderBy: { issueDate: "desc" },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-blue flex items-center gap-2">
          <FileText className="w-6 h-6" />
          My Invoices
        </h1>
      </div>

      <Card>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <p className="text-gray-400 text-center py-12">No invoices yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {invoices.map((inv) => {
                const total = inv.lineItems.reduce((s, li) => s.plus(li.lineTotal), new Decimal(0));
                const paid = inv.payments.reduce((s, p) => s.plus(p.amount), new Decimal(0));
                const outstanding = total.minus(paid);
                const { variant, label } = statusMap[inv.status] ?? { variant: "default", label: inv.status };

                return (
                  <Link
                    key={inv.id}
                    href={`/portal/invoices/${inv.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{inv.invoiceNumber}</p>
                      <p className="text-sm text-gray-500">
                        {inv.serviceChargeYear.label} · {inv.quarter} ·
                        Due {formatDateShort(inv.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand-blue">{formatCurrency(total.toNumber())}</p>
                      {outstanding.gt(0) && !outstanding.eq(total) && (
                        <p className="text-xs text-amber-600">
                          {formatCurrency(outstanding.toNumber())} remaining
                        </p>
                      )}
                      <Badge variant={variant}>{label}</Badge>
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
