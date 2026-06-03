import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/client";
import Link from "next/link";
import { ArrowLeft, Send, FileText, Building2, CreditCard } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateInvoiceStatus } from "@/lib/finance/invoiceEngine";

async function sendInvoice(formData: FormData) {
  "use server";
  const invoiceId = formData.get("invoiceId") as string;
  if (!invoiceId) return;

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: {
      unit: { include: { leaseholder: { include: { user: true } } } },
      lineItems: true,
    },
  });

  if (!invoice.unit.leaseholder?.user.email) {
    redirect(`/admin/invoices/${invoiceId}?error=No+email+address+for+this+unit`);
  }

  // Mark as sent (PDF generation/email requires real env vars in production)
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "SENT", sentAt: new Date() },
  });

  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}?sent=1`);
}

async function voidInvoice(formData: FormData) {
  "use server";
  const invoiceId = formData.get("invoiceId") as string;
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "VOID" } });
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}`);
}

const statusConfig: Record<string, { variant: any; label: string }> = {
  DRAFT: { variant: "draft", label: "Draft" },
  SENT: { variant: "sent", label: "Sent" },
  PARTIALLY_PAID: { variant: "partiallyPaid", label: "Part Paid" },
  PAID: { variant: "paid", label: "Paid" },
  OVERDUE: { variant: "overdue", label: "Overdue" },
  VOID: { variant: "void", label: "Void" },
};

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: { invoiceId: string };
  searchParams: { sent?: string; error?: string };
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    include: {
      unit: { include: { leaseholder: { include: { user: true } } } },
      lineItems: true,
      payments: true,
      serviceChargeYear: true,
    },
  });

  if (!invoice) notFound();

  const total = invoice.lineItems.reduce((s, li) => s.plus(li.lineTotal), new Decimal(0));
  const totalPaid = invoice.payments.reduce((s, p) => s.plus(p.amount), new Decimal(0));
  const outstanding = total.minus(totalPaid);
  const { variant, label } = statusConfig[invoice.status] ?? { variant: "default", label: invoice.status };
  const leaseholder = invoice.unit.leaseholder;

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/invoices" className="text-sm text-gray-500 hover:text-brand-blue flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-blue">{invoice.invoiceNumber}</h1>
            <p className="text-gray-500 mt-1">
              {invoice.unit.unitRef} · {invoice.serviceChargeYear.label} · {invoice.quarter}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={variant} className="text-sm px-3 py-1">{label}</Badge>
            {invoice.status === "DRAFT" && (
              <form action={sendInvoice}>
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <Button type="submit" className="gap-2">
                  <Send className="w-4 h-4" /> Send Invoice
                </Button>
              </form>
            )}
            {(invoice.status === "DRAFT" || invoice.status === "SENT") && (
              <form action={voidInvoice}>
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <Button type="submit" variant="ghost" className="text-red-500 hover:text-red-700">
                  Void
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {searchParams.sent && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
          <Send className="w-4 h-4" /> Invoice marked as sent successfully.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Invoice detail */}
        <div className="xl:col-span-2 space-y-6">
          {/* Header info */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Billed To</p>
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">{invoice.unit.unitRef}</p>
                      <p className="text-sm text-gray-500">Westcote Place</p>
                      {leaseholder && (
                        <>
                          <p className="text-sm text-gray-700 mt-1">{leaseholder.user.name}</p>
                          <p className="text-sm text-gray-500">{leaseholder.user.email}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Invoice Details</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Issue Date</span>
                      <span className="text-gray-900 font-medium">{formatDate(invoice.issueDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Due Date</span>
                      <span className="text-gray-900 font-medium">{formatDate(invoice.dueDate)}</span>
                    </div>
                    {invoice.sentAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sent</span>
                        <span className="text-gray-900 font-medium">{formatDateShort(invoice.sentAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Line items */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left pb-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase">Annual Budget</th>
                    <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase">Quarterly</th>
                    <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase">Your Share</th>
                    <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase">Mgmt Fee</th>
                    <th className="text-right pb-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
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
                      <td className="py-3 text-right text-gray-500">{formatCurrency(Number(li.annualScheduleTotal))}</td>
                      <td className="py-3 text-right text-gray-500">{formatCurrency(Number(li.quarterlyTotal))}</td>
                      <td className="py-3 text-right text-gray-700">{formatCurrency(Number(li.unitShareAmount))}</td>
                      <td className="py-3 text-right text-gray-500">{formatCurrency(Number(li.managementFeeAmount))}</td>
                      <td className="py-3 text-right font-semibold text-brand-blue">{formatCurrency(Number(li.lineTotal))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-900">
                    <td colSpan={5} className="pt-3 font-bold text-gray-900 text-base">Total Due</td>
                    <td className="pt-3 text-right font-bold text-brand-blue text-xl">
                      {formatCurrency(total.toNumber())}
                    </td>
                  </tr>
                  {totalPaid.gt(0) && (
                    <>
                      <tr>
                        <td colSpan={5} className="pt-1 text-sm text-gray-500">Payments Received</td>
                        <td className="pt-1 text-right text-sm text-green-600 font-medium">
                          -{formatCurrency(totalPaid.toNumber())}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="pt-1 font-bold text-gray-900">Balance Outstanding</td>
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

          {/* Payments */}
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
                        <p className="text-gray-700">{p.method.replace("_", " ")}</p>
                        <p className="text-xs text-gray-400">
                          {formatDateShort(p.paymentDate)}
                          {p.reference && ` · ${p.reference}`}
                        </p>
                      </div>
                      <span className="font-semibold text-green-700">+{formatCurrency(Number(p.amount))}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="bg-brand-blue text-white">
            <CardContent className="p-6">
              <p className="text-white/70 text-sm mb-1">Total Due</p>
              <p className="text-3xl font-bold">{formatCurrency(total.toNumber())}</p>
              {outstanding.lt(total) && (
                <p className="text-white/70 text-sm mt-2">
                  Outstanding: {formatCurrency(outstanding.toNumber())}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</p>
              <Link href={`/admin/payments?invoiceId=${invoice.id}`}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <CreditCard className="w-4 h-4" /> Record Payment
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
