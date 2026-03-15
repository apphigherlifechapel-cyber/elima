import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@elima.com";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function sendReceiptEmail(to: string, subject: string, html: string) {
  if (!SENDGRID_API_KEY) {
    console.warn("SendGrid API key missing, skipping email send");
    return;
  }

  await sgMail.send({
    to,
    from: EMAIL_FROM,
    subject,
    html,
  });
}

export function generateReceiptHtml(order: {
  id: string;
  total: number;
  status: string;
  items: Array<{ title: string; quantity: number; unitPrice: number; totalPrice: number }>;
}) {
  const rows = order.items
    .map(
      (item) =>
        `<tr><td>${item.title}</td><td>${item.quantity}</td><td>₦${item.unitPrice.toFixed(2)}</td><td>₦${item.totalPrice.toFixed(2)}</td></tr>`
    )
    .join("");

  return `
    <h2>Order Receipt - ${order.id}</h2>
    <p>Status: ${order.status}</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
      <thead>
        <tr><th>Product</th><th>Qty</th><th>Unit</th><th>Total</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p><strong>Grand Total: ₦${order.total.toFixed(2)}</strong></p>
  `;
}
