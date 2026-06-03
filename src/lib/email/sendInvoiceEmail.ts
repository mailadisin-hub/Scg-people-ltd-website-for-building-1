import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvoiceEmail(params: {
  toEmail: string;
  toName: string;
  invoiceNumber: string;
  dueDate: string;
  totalAmount: string;
  unitRef: string;
  pdfBuffer: Buffer;
}): Promise<void> {
  await resend.emails.send({
    from: process.env.FROM_EMAIL ?? "invoices@westcoteplace.co.uk",
    to: params.toEmail,
    subject: `Service Charge Invoice ${params.invoiceNumber} — Westcote Place`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1C3664; padding: 24px; text-align: center;">
          <h1 style="color: #C8962E; margin: 0; font-size: 24px;">SCG People Limited</h1>
          <p style="color: #ffffff; margin: 4px 0 0; font-size: 14px;">Managing Agents — Westcote Place</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb;">
          <p style="color: #1a1a1a;">Dear ${params.toName},</p>
          <p style="color: #1a1a1a;">
            Please find attached your service charge invoice
            <strong>${params.invoiceNumber}</strong> for your property at
            <strong>${params.unitRef}, Westcote Place</strong>.
          </p>
          <div style="background: #f9fafb; border-left: 4px solid #C8962E; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 18px; color: #1C3664;">
              <strong>Amount Due: ${params.totalAmount}</strong>
            </p>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">
              Payment Due: ${params.dueDate}
            </p>
          </div>
          <p style="color: #1a1a1a;">
            Please use the invoice number <strong>${params.invoiceNumber}</strong> as your
            payment reference when making your bank transfer.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            You can also log in to the Westcote Place portal to view your invoices,
            check your account balance, and download documents.
          </p>
          <p style="color: #1a1a1a;">
            Kind regards,<br/>
            <strong>SCG People Limited</strong><br/>
            Managing Agents
          </p>
        </div>
        <div style="background: #f3f4f6; padding: 12px; text-align: center; font-size: 12px; color: #9ca3af;">
          SCG People Limited | Westcote Place
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `${params.invoiceNumber}.pdf`,
        content: params.pdfBuffer,
      },
    ],
  });
}
