import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { generateInvoices, previewInvoices } from "@/lib/finance/invoiceEngine";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import type { Quarter } from "@prisma/client";

async function generate(formData: FormData) {
  "use server";
  const yearId = formData.get("yearId") as string;
  const quarter = formData.get("quarter") as Quarter;
  if (!yearId || !quarter) return;

  try {
    await generateInvoices({ serviceChargeYearId: yearId, quarter });
  } catch (e: any) {
    // Redirect with error — in production use proper error state
    redirect(`/admin/invoices/generate?yearId=${yearId}&error=${encodeURIComponent(e.message)}`);
  }

  revalidatePath("/admin/invoices");
  redirect("/admin/invoices");
}

export default async function GenerateInvoicesPage({
  searchParams,
}: {
  searchParams: { yearId?: string; quarter?: string; error?: string };
}) {
  const years = await prisma.serviceChargeYear.findMany({
    orderBy: { startDate: "desc" },
  });

  const selectedYearId =
    searchParams.yearId ?? years.find((y) => y.isCurrent)?.id ?? years[0]?.id;

  const selectedQuarter = (searchParams.quarter as Quarter) ?? null;

  let preview = null;
  let previewError = null;

  if (selectedYearId && selectedQuarter) {
    try {
      preview = await previewInvoices({
        serviceChargeYearId: selectedYearId,
        quarter: selectedQuarter,
      });
    } catch (e: any) {
      previewError = e.message;
    }
  }

  const grandTotal = preview?.reduce((s, r) => s + r.grandTotal.toNumber(), 0) ?? 0;

  return (
    <div>
      <div className="mb-8">
        <Link href="/admin/invoices" className="text-sm text-gray-500 hover:text-brand-blue flex items-center gap-1 mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
        <h1 className="text-3xl font-bold text-brand-blue">Generate Invoices</h1>
        <p className="text-gray-500 mt-1">Preview and generate quarterly service charge invoices</p>
      </div>

      {searchParams.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      {/* Step 1: Select year and quarter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Step 1 — Select Year & Quarter</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="GET" className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-1">Financial Year</label>
              <select
                name="yearId"
                defaultValue={selectedYearId}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-brand-blue"
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label} {y.isCurrent ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-1">Quarter</label>
              <select
                name="quarter"
                defaultValue={selectedQuarter ?? ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-brand-blue"
              >
                <option value="">Select quarter…</option>
                <option value="Q1">Q1 (Apr–Jun)</option>
                <option value="Q2">Q2 (Jul–Sep)</option>
                <option value="Q3">Q3 (Oct–Dec)</option>
                <option value="Q4">Q4 (Jan–Mar)</option>
              </select>
            </div>
            <Button type="submit">Preview</Button>
          </form>
        </CardContent>
      </Card>

      {/* Step 2: Preview */}
      {previewError && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm">
          {previewError}
        </div>
      )}

      {preview && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Step 2 — Preview: {selectedQuarter} Invoices
                </CardTitle>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total to invoice</p>
                  <p className="text-xl font-bold text-brand-blue">{formatCurrency(grandTotal)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Unit</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Sched A</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Sched B</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.map((row) => (
                      <tr key={row.unitId} className={row.isCommercial ? "bg-amber-50/30" : ""}>
                        <td className="px-4 py-2 font-medium text-gray-800">{row.unitRef}</td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {formatCurrency(row.scheduleALineTotal.toNumber())}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {row.scheduleBLineTotal
                            ? formatCurrency(row.scheduleBLineTotal.toNumber())
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-brand-blue">
                          {formatCurrency(row.grandTotal.toNumber())}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-4 py-2 font-bold text-brand-blue">Total</td>
                      <td colSpan={2} />
                      <td className="px-4 py-2 text-right font-bold text-brand-blue text-base">
                        {formatCurrency(grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Generate */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-brand-blue mb-2">Step 3 — Generate Draft Invoices</h3>
              <p className="text-sm text-gray-500 mb-4">
                This will create {preview.length} DRAFT invoices. Review each invoice before sending.
              </p>
              <form action={generate}>
                <input type="hidden" name="yearId" value={selectedYearId} />
                <input type="hidden" name="quarter" value={selectedQuarter ?? ""} />
                <Button type="submit" size="lg" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Generate {preview.length} Draft Invoices
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
