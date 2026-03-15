import nodemailer from "nodemailer";
import { formatCedis } from "@/lib/utils/currency";

const emailPort = Number(process.env.EMAIL_PORT || 587);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.mailtrap.io",
  port: emailPort,
  secure: emailPort === 465,
  auth:
    process.env.EMAIL_USER && process.env.EMAIL_PASS
      ? {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        }
      : undefined,
});

export async function sendOrderReceipt({
  to,
  userName,
  orderId,
  total,
  items,
}: {
  to: string;
  userName: string;
  orderId: string;
  total: number;
  items: Array<{ title: string; qty: number; unitPrice: number }>;
}) {
  const itemList = items.map((item) => `- ${item.title} x ${item.qty} @ ${formatCedis(item.unitPrice)}`).join("\n");

  const html = `<p>Hi ${userName},</p>
<p>Thank you for your order <strong>${orderId}</strong>.</p>
<p>Order details</p>
<pre>${itemList}</pre>
<p>Total: ${formatCedis(total)}</p>
<p>We will notify you when your order ships.</p>`;

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || "no-reply@elima.com",
    to,
    subject: `Order ${orderId} received`,
    text: `Hi ${userName},\n\nYour order ${orderId} has been received. Total: ${formatCedis(total)}\n\n${itemList}`,
    html,
  });
}
