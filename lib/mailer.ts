import nodemailer from "nodemailer";
import { formatCedis } from "@/lib/utils/currency";

const smtpHost = process.env.EMAIL_HOST || process.env.SMTP_HOST;
const smtpPort = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
const smtpUser = process.env.EMAIL_USER || process.env.SMTP_USER;
const smtpPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
const fromEmail = process.env.EMAIL_FROM || "no-reply@localhost";

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
});

export async function sendOrderReceipt(to: string, orderId: string, total: number) {
  try {
    await transporter.sendMail({
      from: fromEmail,
      to,
      subject: `Order ${orderId} confirmation`,
      text: `Thanks for your order ${orderId}. Your order total is ${formatCedis(total)}. We are processing it now.`,
      html: `<p>Thanks for your order <b>${orderId}</b>.</p><p>Your order total is <b>${formatCedis(total)}</b>.</p><p>We are processing it now.</p>`,
    });
  } catch (error) {
    console.error("Error sending order receipt", error);
  }
}
