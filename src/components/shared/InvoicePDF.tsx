import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1A1A1A",
    backgroundColor: "#FFFFFF",
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
  },
  header: {
    backgroundColor: "#1C3664",
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingBottom: 24,
    marginBottom: 0,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  companyName: {
    color: "#C8962E",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  companySubtitle: {
    color: "#FFFFFF",
    fontSize: 8,
    marginTop: 2,
    opacity: 0.8,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  invoiceTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  invoiceNumber: {
    color: "#C8962E",
    fontSize: 11,
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 40,
    paddingTop: 28,
  },
  twoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  col: {
    flex: 1,
  },
  colRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  sectionLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  addressLine: {
    fontSize: 10,
    color: "#1A1A1A",
    lineHeight: 1.5,
  },
  addressBold: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  detailLabel: {
    fontSize: 9,
    color: "#666666",
  },
  detailValue: {
    fontSize: 9,
    color: "#1A1A1A",
    fontWeight: "bold",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#666666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FAFAFA",
  },
  colDesc: { flex: 3 },
  colNum: { flex: 1.5, alignItems: "flex-end" },
  cellText: {
    fontSize: 9,
    color: "#374151",
  },
  cellSubText: {
    fontSize: 7,
    color: "#9CA3AF",
    marginTop: 1,
  },
  cellTextRight: {
    fontSize: 9,
    color: "#374151",
    textAlign: "right",
  },
  cellBoldBlue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1C3664",
    textAlign: "right",
  },
  totalsSection: {
    marginTop: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: "#374151",
  },
  totalValue: {
    fontSize: 10,
    color: "#374151",
    fontWeight: "bold",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1C3664",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#C8962E",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: "#9CA3AF",
  },
  paymentBox: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#C8962E",
    borderRadius: 6,
    padding: 14,
  },
  paymentTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1C3664",
    marginBottom: 8,
  },
  paymentText: {
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.6,
  },
});

function formatGBP(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

interface LineItem {
  description: string;
  sharePercentage: number | string | { toNumber(): number };
  annualScheduleTotal: number | string | { toNumber(): number };
  quarterlyTotal: number | string | { toNumber(): number };
  unitShareAmount: number | string | { toNumber(): number };
  managementFeeAmount: number | string | { toNumber(): number };
  lineTotal: number | string | { toNumber(): number };
}

interface InvoicePDFProps {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  quarter: string;
  yearLabel: string;
  unitRef: string;
  leaseholderName?: string;
  leaseholderEmail?: string;
  lineItems: LineItem[];
  totalAmount: number;
}

function toNum(v: number | string | { toNumber(): number }): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v);
  return v.toNumber();
}

export function InvoicePDF({
  invoiceNumber,
  issueDate,
  dueDate,
  quarter,
  yearLabel,
  unitRef,
  leaseholderName,
  leaseholderEmail,
  lineItems,
  totalAmount,
}: InvoicePDFProps) {
  return (
    <Document title={invoiceNumber} author="SCG People Limited">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.companyName}>SCG People Limited</Text>
              <Text style={styles.companySubtitle}>Westcote Place · Property Management</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.invoiceTitle}>INVOICE</Text>
              <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
            </View>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Billed to / invoice details */}
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Billed To</Text>
              <Text style={styles.addressBold}>{unitRef}</Text>
              <Text style={styles.addressLine}>Westcote Place</Text>
              {leaseholderName && (
                <Text style={styles.addressLine}>{leaseholderName}</Text>
              )}
              {leaseholderEmail && (
                <Text style={styles.addressLine}>{leaseholderEmail}</Text>
              )}
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Invoice Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Period</Text>
                <Text style={styles.detailValue}>{yearLabel} · {quarter}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Issue Date</Text>
                <Text style={styles.detailValue}>{formatDateStr(issueDate)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={styles.detailValue}>{formatDateStr(dueDate)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Line items table */}
          <View style={styles.tableHeader}>
            <View style={styles.colDesc}>
              <Text style={styles.tableHeaderCell}>Description</Text>
            </View>
            <View style={styles.colNum}>
              <Text style={styles.tableHeaderCell}>Annual Budget</Text>
            </View>
            <View style={styles.colNum}>
              <Text style={styles.tableHeaderCell}>Quarterly</Text>
            </View>
            <View style={styles.colNum}>
              <Text style={styles.tableHeaderCell}>Your Share</Text>
            </View>
            <View style={styles.colNum}>
              <Text style={styles.tableHeaderCell}>Mgmt Fee</Text>
            </View>
            <View style={styles.colNum}>
              <Text style={styles.tableHeaderCell}>Total</Text>
            </View>
          </View>

          {lineItems.map((li, idx) => (
            <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <View style={styles.colDesc}>
                <Text style={styles.cellText}>{li.description}</Text>
                <Text style={styles.cellSubText}>
                  Share: {Number(toNum(li.sharePercentage)).toFixed(4)}%
                </Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.cellTextRight}>
                  {formatGBP(toNum(li.annualScheduleTotal))}
                </Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.cellTextRight}>
                  {formatGBP(toNum(li.quarterlyTotal))}
                </Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.cellTextRight}>
                  {formatGBP(toNum(li.unitShareAmount))}
                </Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.cellTextRight}>
                  {formatGBP(toNum(li.managementFeeAmount))}
                </Text>
              </View>
              <View style={styles.colNum}>
                <Text style={styles.cellBoldBlue}>
                  {formatGBP(toNum(li.lineTotal))}
                </Text>
              </View>
            </View>
          ))}

          {/* Grand total */}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Due</Text>
            <Text style={styles.grandTotalValue}>{formatGBP(totalAmount)}</Text>
          </View>

          {/* Payment info */}
          <View style={styles.paymentBox}>
            <Text style={styles.paymentTitle}>Payment Instructions</Text>
            <Text style={styles.paymentText}>
              Please quote reference {invoiceNumber} when making payment.{"\n"}
              Payment is due by {formatDateStr(dueDate)}.{"\n\n"}
              For bank details and payment queries, please contact SCG People Limited.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            SCG People Limited · Westcote Place
          </Text>
          <Text style={styles.footerText}>
            {invoiceNumber} · Page 1 of 1
          </Text>
        </View>
      </Page>
    </Document>
  );
}
