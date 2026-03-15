"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface CheckoutSuccessClientProps {
  reference: string;
  orderId: string;
}

export default function CheckoutSuccessClient({ reference, orderId }: CheckoutSuccessClientProps) {
  const hasQueryParams = Boolean(reference && orderId);
  const [status, setStatus] = useState(hasQueryParams ? "verifying" : "error");
  const [message, setMessage] = useState(
    hasQueryParams ? "Verifying your payment, please wait..." : "Missing reference or orderId in callback URL."
  );

  useEffect(() => {
    if (!hasQueryParams) {
      return;
    }

    async function verify() {
      try {
        const res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference, orderId }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          setStatus("error");
          setMessage(data.error || "Payment verification failed.");
          return;
        }

        setStatus(data.order?.status === "PAID" ? "success" : "pending");
        setMessage(`Payment ${data.order?.status || "not confirmed"}.`);
      } catch (err) {
        setStatus("error");
        setMessage((err as Error).message ?? "Network error during verification.");
      }
    }

    verify();
  }, [reference, orderId, hasQueryParams]);

  return (
    <div className="page-wrap py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="glass fade-in-up rounded-3xl p-6 sm:p-8">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Checkout Status</h1>

          <div className="mt-4 grid gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3 text-sm">
            <p>Reference: <strong>{reference || "N/A"}</strong></p>
            <p>Order ID: <strong>{orderId || "N/A"}</strong></p>
          </div>

          <p className="mt-5 text-base font-semibold sm:text-lg">
            {status === "verifying" && "Verifying your payment..."}
            {status === "pending" && "Payment pending, we will update your order soon."}
            {status === "success" && "Payment confirmed! Thank you for your order."}
            {status === "error" && `Error: ${message}`}
          </p>

          {status !== "error" ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">{message}</p> : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/" className="btn-primary">Return to Home</Link>
            <Link href="/account" className="btn-secondary">View My Account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
