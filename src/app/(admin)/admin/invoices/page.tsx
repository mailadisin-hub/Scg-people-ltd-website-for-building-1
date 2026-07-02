import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/client";
import { Plus } from "lucide-react";
import Link from "next/link";

const statusConfig: Record<string, { variant: any; label: string }> = {
  DRAFT: { variant: "draft", label: "Draft" },
  SENT: { variant: "sent", label: "Sent" },
  PARTIALLY_PAID: { variant: "partiallyPaid", label: "Part Paid" },
  PAID: { variant: "paid", label: "Paid" },
  OVERDUE: { variant: "overdue", label: "Overdue" },
  VOID: { variant: "void", label: "Void" },
};

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: [{ issueDate: "desc" }, { invoiceNumber: "asc" }],
    include: {
      unit: true,
      lineItems: true,
      payments: true,
      serviceChargeYear: true,
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-blue">Invoices</h1>
          <p className="text-gray-500 mt-1">{invoices.length} invoices total</p>
        </div>
        <Link href="/admin/invoices/generate">
          <Button>
            <Plus className="w-4 h-4" />
            Generate Invoices
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="mb-4">No invoices yet.</p>
              <Link href="/admin/invoices/generate">
                <Button>Generate First Quarter Invoices</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="md:hidden divide-y divide-gray-100">
                {invoices.map((inv) => {
                  const total = inv.lineItems.reduce(
                    (s, li) => s.plus(li.lineTotal),
                    new Decimal(0)
                  );
                  const { variant, label } = statusConfig[inv.status] ?? {
                    variant: "default",
                    label: inv.status,
                  };
                  return (
                    <Link
                      key={inv.id}
                      href={`/admin/invoices/${inv.id}`}
                      className="block p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-brand-blue">{inv.invoiceNumber}</span>
                        <Badge variant={variant}>{label}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {inv.unit.unitRef} · {inv.quarter}
                        </span>
                        <span className="text-sm font-bold text-brand-blue">
                          {formatCurrency(total.toNumber())}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Due {formatDateShort(inv.dueDate)}
                      </p>
                    </Link>
                  );
                })}
              </div>

              {/* Desktop: full table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Year / Quarter</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Issue Date</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {invoices.map((inv) => {
                      const total = inv.lineItems.reduce(
                        (s, li) => s.plus(li.lineTotal),
                        new Decimal(0)
                      );
                      const { variant, label } = statusConfig[inv.status] ?? {
                        variant: "default",
                        label: inv.status,
                      };
                      return (
                        <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <Link
                              href={`/admin/invoices/${inv.id}`}
                              className="font-medium text-brand-blue hover:underline"
                            >
                              {inv.invoiceNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-gray-700">{inv.unit.unitRef}</td>
                          <td className="px-6 py-4 text-gray-500">
                            {inv.serviceChargeYear.label} · {inv.quarter}
                          </td>
                          <td className="px-6 py-4 text-gray-500">{formatDateShort(inv.issueDate)}</td>
                          <td className="px-6 py-4 text-gray-500">{formatDateShort(inv.dueDate)}</td>
                          <td className="px-6 py-4 text-right font-semibold text-brand-blue">
                            {formatCurrency(total.toNumber())}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant={variant}>{label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
