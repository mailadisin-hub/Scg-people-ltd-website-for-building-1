import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, CreditCard } from "lucide-react";
import { revalidatePath } from "next/cache";
import { updateInvoiceStatus } from "@/lib/finance/invoiceEngine";
import type { PaymentMethod } from "@prisma/client";

async function recordPayment(formData: FormData) {
  "use server";
  const unitId = formData.get("unitId") as string;
  const invoiceId = formData.get("invoiceId") as string;
  const amount = formData.get("amount") as string;
  const paymentDate = formData.get("paymentDate") as string;
  const method = formData.get("method") as PaymentMethod;
  const reference = formData.get("reference") as string;
  const notes = formData.get("notes") as string;

  if (!unitId || !amount || !paymentDate || !method) return;

  const payment = await prisma.payment.create({
    data: {
      unitId,
      invoiceId: invoiceId || null,
      amount,
      paymentDate: new Date(paymentDate),
      method,
      reference: reference || null,
      notes: notes || null,
    },
  });

  if (invoiceId) {
    await updateInvoiceStatus(invoiceId);
  }

  revalidatePath("/admin/payments");
}

export default async function PaymentsPage() {
  const units = await prisma.unit.findMany({ orderBy: { unitRef: "asc" } });
  const payments = await prisma.payment.findMany({
    orderBy: { paymentDate: "desc" },
    take: 50,
    include: { unit: true, invoice: true },
  });

  const openInvoices = await prisma.invoice.findMany({
    where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
    include: { unit: true },
    orderBy: { dueDate: "asc" },
  });

  const methodLabels: Record<string, string> = {
    BANK_TRANSFER: "Bank Transfer",
    CHEQUE: "Cheque",
    DIRECT_DEBIT: "Direct Debit",
    CASH: "Cash",
    OTHER: "Other",
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-blue">Payments</h1>
          <p className="text-gray-500 mt-1">Record and reconcile payments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Record payment form */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Record Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={recordPayment} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Unit *</label>
                <select
                  name="unitId"
                  required
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue"
                >
                  <option value="">Select unit…</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.unitRef}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Link to Invoice (optional)</label>
                <select
                  name="invoiceId"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue"
                >
                  <option value="">Unallocated</option>
                  {openInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.unit.unitRef}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Amount (£) *</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Payment Date *</label>
                <input
                  name="paymentDate"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Method *</label>
                <select
                  name="method"
                  required
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue"
                >
                  <option value="">Select…</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="DIRECT_DEBIT">Direct Debit</option>
                  <option value="CASH">Cash</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Reference</label>
                <input
                  name="reference"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue"
                  placeholder="Bank ref / cheque no."
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-blue resize-none"
                  placeholder="Optional notes…"
                />
              </div>

              <Button type="submit" className="w-full">Record Payment</Button>
            </form>
          </CardContent>
        </Card>

        {/* Payment history */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No payments recorded yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {payments.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{p.unit.unitRef}</span>
                        <Badge variant="default" className="text-xs">{methodLabels[p.method] ?? p.method}</Badge>
                        {!p.invoiceId && (
                          <Badge variant="gold" className="text-xs">Unallocated</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDateShort(p.paymentDate)}
                        {p.invoice && ` · ${p.invoice.invoiceNumber}`}
                        {p.reference && ` · Ref: ${p.reference}`}
                      </p>
                    </div>
                    <span className="text-base font-bold text-green-700">
                      +{formatCurrency(Number(p.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
