import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { InvoicePDF } from "@/components/shared/InvoicePDF";

interface GenerateInvoicePdfInput {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  quarter: string;
  yearLabel: string;
  unitRef: string;
  leaseholderName?: string;
  leaseholderEmail?: string;
  lineItems: {
    description: string;
    sharePercentage: number;
    annualScheduleTotal: number;
    quarterlyTotal: number;
    unitShareAmount: number;
    managementFeeAmount: number;
    lineTotal: number;
  }[];
  totalAmount: number;
}

export async function generateInvoicePdf(input: GenerateInvoicePdfInput): Promise<Buffer> {
  const element = createElement(InvoicePDF, input);
  const buffer = await renderToBuffer(element as any);
  return Buffer.from(buffer);
}
