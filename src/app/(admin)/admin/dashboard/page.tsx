import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/client";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  FileText,
} from "lucide-react";
import Link from "next/link";

async function getDashboardData() {
  const currentYear = await prisma.serviceChargeYear.findFirst({
    where: { isCurrent: true },
  });

  if (!currentYear) {
    return { currentYear: null, kpis: null, recentInvoices: [], overdueInvoices: [] };
  }

  // Run all remaining queries in parallel — cuts 4 round-trips down to 1 wait.
  const [allInvoices, totalCollected, recentInvoices, overdueInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: { serviceChargeYearId: currentYear.id, status: { not: "VOID" } },
      include: { lineItems: true, payments: true, unit: true },
    }),
    prisma.payment.aggregate({
      where: { invoice: { serviceChargeYearId: currentYear.id } },
      _sum: { amount: true },
    }),
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { unit: true, lineItems: true },
    }),
    prisma.invoice.findMany({
      where: { status: "OVERDUE" },
      include: { unit: true, lineItems: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
  ]);

  const totalInvoiced = allInvoices.reduce((sum, inv) => {
    const invTotal = inv.lineItems.reduce((s, li) => s.plus(li.lineTotal), new Decimal(0));
    return sum.plus(invTotal);
  }, new Decimal(0));

  const outstanding = totalInvoiced.minus(totalCollected._sum.amount ?? new Decimal(0));
  const overdueCount = allInvoices.filter((inv) => inv.status === "OVERDUE").length;
  const paidCount = allInvoices.filter((inv) => inv.status === "PAID").length;
  const sentCount = allInvoices.filter((inv) => inv.status === "SENT").length;

  return {
    currentYear,
    kpis: {
      totalInvoiced,
      totalCollected: totalCollected._sum.amount ?? new Decimal(0),
      outstanding,
      overdueCount,
      paidCount,
      sentCount,
    },
    recentInvoices,
    overdueInvoices,
  };
}

export default async function AdminDashboard() {
  const { currentYear, kpis, recentInvoices, overdueInvoices } = await getDashboardData();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-blue">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          {currentYear
            ? `Service Charge Year ${currentYear.label}`
            : "No active financial year — set one up in Financial Years"}
        </p>
      </div>

      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          <div className="animate-slide-up [animation-delay:0ms]">
            <KpiCard
              title="Total Invoiced"
              value={formatCurrency(kpis.totalInvoiced.toNumber())}
              icon={<FileText className="w-5 h-5" />}
              color="blue"
              subtitle={`${currentYear!.label}`}
            />
          </div>
          <div className="animate-slide-up [animation-delay:75ms]">
            <KpiCard
              title="Collected"
              value={formatCurrency(kpis.totalCollected.toNumber())}
              icon={<CheckCircle2 className="w-5 h-5" />}
              color="green"
              subtitle="Payments received"
            />
          </div>
          <div className="animate-slide-up [animation-delay:150ms]">
            <KpiCard
              title="Outstanding"
              value={formatCurrency(kpis.outstanding.toNumber())}
              icon={<TrendingUp className="w-5 h-5" />}
              color="gold"
              subtitle="Yet to be collected"
            />
          </div>
          <div className="animate-slide-up [animation-delay:225ms]">
            <KpiCard
              title="Overdue"
              value={kpis.overdueCount.toString()}
              unit="invoices"
              icon={<AlertCircle className="w-5 h-5" />}
              color="red"
              subtitle="Require attention"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Invoices</CardTitle>
            <Link href="/admin/invoices" className="text-xs text-brand-gold hover:underline font-medium">
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No invoices yet</p>
            ) : (
              <div className="space-y-3">
                {recentInvoices.map((inv) => {
                  const total = inv.lineItems.reduce(
                    (s, li) => s + Number(li.lineTotal),
                    0
                  );
                  return (
                    <Link
                      key={inv.id}
                      href={`/admin/invoices/${inv.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-brand-blue">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-xs text-gray-500">{inv.unit.unitRef}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-brand-blue">
                          {formatCurrency(total)}
                        </p>
                        <InvoiceStatusBadge status={inv.status} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Overdue Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueInvoices.length === 0 ? (
              <div className="flex items-center gap-2 text-green-600 text-sm py-6 justify-center">
                <CheckCircle2 className="w-5 h-5" />
                No overdue invoices
              </div>
            ) : (
              <div className="space-y-3">
                {overdueInvoices.map((inv) => {
                  const total = inv.lineItems.reduce(
                    (s, li) => s + Number(li.lineTotal),
                    0
                  );
                  return (
                    <Link
                      key={inv.id}
                      href={`/admin/invoices/${inv.id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-red-900">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-xs text-red-600">{inv.unit.unitRef}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-700">
                          {formatCurrency(total)}
                        </p>
                        <p className="text-xs text-red-500">
                          Due {new Date(inv.dueDate).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!currentYear && (
        <div className="mt-8 p-6 bg-brand-blue/5 border border-brand-blue/20 rounded-xl text-center">
          <Building2 className="w-12 h-12 text-brand-blue/40 mx-auto mb-3" />
          <h3 className="font-semibold text-brand-blue mb-2">Get Started</h3>
          <p className="text-gray-500 text-sm mb-4">
            Set up a financial year to start managing service charges for Westcote Place.
          </p>
          <Link
            href="/admin/years"
            className="inline-flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-blue-light transition-colors"
          >
            Create Financial Year →
          </Link>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  title,
  value,
  unit,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "gold" | "red";
  subtitle: string;
}) {
  const colorMap = {
    blue: "bg-brand-blue/10 text-brand-blue",
    green: "bg-green-100 text-green-600",
    gold: "bg-brand-gold/10 text-brand-gold-dark",
    red: "bg-red-100 text-red-600",
  };
  const textMap = {
    blue: "text-brand-blue",
    green: "text-green-700",
    gold: "text-brand-gold-dark",
    red: "text-red-700",
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>{icon}</div>
        </div>
        <div className="mt-3">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`text-2xl font-bold mt-0.5 ${textMap[color]}`}>
            {value}
            {unit && <span className="text-base font-normal ml-1 text-gray-500">{unit}</span>}
          </p>
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: any; label: string }> = {
    DRAFT: { variant: "draft", label: "Draft" },
    SENT: { variant: "sent", label: "Sent" },
    PARTIALLY_PAID: { variant: "partiallyPaid", label: "Part Paid" },
    PAID: { variant: "paid", label: "Paid" },
    OVERDUE: { variant: "overdue", label: "Overdue" },
    VOID: { variant: "void", label: "Void" },
  };
  const { variant, label } = map[status] ?? { variant: "default", label: status };
  return <Badge variant={variant}>{label}</Badge>;
}
