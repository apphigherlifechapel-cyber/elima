import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_DEFAULT_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL || "http://localhost:3000/checkout/success";

export async function initializePaystackPayment(
  email: string,
  amount: number,
  reference: string,
  metadata?: Record<string, unknown>,
  callbackUrl?: string
) {
  const response = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email,
      amount,
      reference,
      callback_url: callbackUrl || PAYSTACK_DEFAULT_CALLBACK_URL,
      metadata,
    },
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
  );
  return response.data;
}

export async function verifyPaystackPayment(reference: string) {
  const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  });
  return response.data;
}
