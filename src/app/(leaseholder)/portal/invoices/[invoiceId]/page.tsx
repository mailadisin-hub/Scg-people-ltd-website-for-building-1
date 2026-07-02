import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/client";
import Link from "next/link";
import { ArrowLeft, FileText, CreditCard, Building2 } from "lucide-react";

const statusMap: Record<string, { variant: any; label: string }> = {
  DRAFT: { variant: "draft", label: "Pending" },
  SENT: { variant: "sent", label: "Outstanding" },
  PARTIALLY_PAID: { variant: "partiallyPaid", label: "Part Paid" },
  PAID: { variant: "paid", label: "Paid" },
  OVERDUE: { variant: "overdue", label: "Overdue" },
  VOID: { variant: "void", label: "Void" },
};

export default async function LeaseholderInvoiceDetailPage({
  params,
}: {
  params: { invoiceId: string };
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) redirect("/login");

  // Fetch leaseholder and invoice in parallel — saves one round-trip.
  const [leaseholder, invoice] = await Promise.all([
    prisma.leaseholder.findUnique({ where: { userId }, include: { unit: true } }),
    prisma.invoice.findUnique({
      where: { id: params.invoiceId },
      include: { unit: true, lineItems: true, payments: true, serviceChargeYear: true },
    }),
  ]);

  if (!leaseholder) redirect("/portal");
  if (!invoice || invoice.unitId !== leaseholder.unitId) notFound();

  const total = invoice.lineItems.reduce((s, li) => s.plus(li.lineTotal), new Decimal(0));
  const totalPaid = invoice.payments.reduce((s, p) => s.plus(p.amount), new Decimal(0));
  const outstanding = total.minus(totalPaid);
  const { variant, label } = statusMap[invoice.status] ?? { variant: "default", label: invoice.status };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/portal/invoices"
          className="text-sm text-gray-500 hover:text-brand-blue flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-blue flex items-center gap-2">
              <FileText className="w-6 h-6" />
              {invoice.invoiceNumber}
            </h1>
            <p className="text-gray-500 mt-1">
              {invoice.serviceChargeYear.label} · {invoice.quarter}
            </p>
          </div>
          <Badge variant={variant} className="text-sm px-3 py-1">
            {label}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Billed To
                  </p>
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">{invoice.unit.unitRef}</p>
                      <p className="text-sm text-gray-500">Westcote Place</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Invoice Details
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Issue Date</span>
                      <span className="text-gray-900 font-medium">{formatDate(invoice.issueDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Due Date</span>
                      <span className="text-gray-900 font-medium">{formatDate(invoice.dueDate)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase">
                      Description
                    </th>
                    <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase">
                      Your Share
                    </th>
                    <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase">
                      Mgmt Fee
                    </th>
                    <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoice.lineItems.map((li) => (
                    <tr key={li.id}>
                      <td className="py-3">
                        <p className="font-medium text-gray-800">{li.description}</p>
                        <p className="text-xs text-gray-400">
                          Share: {Number(li.sharePercentage).toFixed(4)}%
                        </p>
                      </td>
                      <td className="py-3 text-right text-gray-700">
                        {formatCurrency(Number(li.unitShareAmount))}
                      </td>
                      <td className="py-3 text-right text-gray-500">
                        {formatCurrency(Number(li.managementFeeAmount))}
                      </td>
                      <td className="py-3 text-right font-semibold text-brand-blue">
                        {formatCurrency(Number(li.lineTotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-900">
                    <td colSpan={3} className="pt-3 font-bold text-gray-900 text-base">
                      Total Due
                    </td>
                    <td className="pt-3 text-right font-bold text-brand-blue text-xl">
                      {formatCurrency(total.toNumber())}
                    </td>
                  </tr>
                  {totalPaid.gt(0) && (
                    <>
                      <tr>
                        <td colSpan={3} className="pt-1 text-sm text-gray-500">
                          Payments Received
                        </td>
                        <td className="pt-1 text-right text-sm text-green-600 font-medium">
                          -{formatCurrency(totalPaid.toNumber())}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="pt-1 font-bold text-gray-900">
                          Balance Outstanding
                        </td>
                        <td className="pt-1 text-right font-bold text-amber-600 text-lg">
                          {formatCurrency(outstanding.toNumber())}
                        </td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {invoice.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payments Received
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-50">
                  {invoice.payments.map((p) => (
                    <div key={p.id} className="py-2 flex justify-between text-sm">
                      <div>
                        <p className="text-gray-700">{p.method.replace(/_/g, " ")}</p>
                        <p className="text-xs text-gray-400">
                          {formatDateShort(p.paymentDate)}
                          {p.reference && ` · ${p.reference}`}
                        </p>
                      </div>
                      <span className="font-semibold text-green-700">
                        +{formatCurrency(Number(p.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="bg-brand-blue text-white">
            <CardContent className="p-6">
              <p className="text-white/70 text-sm mb-1">Total Due</p>
              <p className="text-3xl font-bold">{formatCurrency(total.toNumber())}</p>
              {outstanding.lt(total) && outstanding.gte(new Decimal(0)) && (
                <p className="text-white/70 text-sm mt-2">
                  Outstanding: {formatCurrency(outstanding.toNumber())}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Payment Instructions
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Please quote your invoice number when making payment.</p>
                <p className="font-medium text-gray-800 mt-2">{invoice.invoiceNumber}</p>
                <p className="text-xs text-gray-400 mt-3">
                  Contact your property manager for bank details.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
