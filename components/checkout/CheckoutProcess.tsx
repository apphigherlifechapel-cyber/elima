"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCedis } from "@/lib/utils/currency";
import { LogisticsService, ShippingRate } from "@/lib/logistics/service";

type CheckoutProcessProps = {
  initialShippingMethod?: "standard" | "express";
  guestMode?: boolean;
  guestEmail?: string;
  guestItems?: Array<{ productId: string; variantId?: string | null; quantity: number; unitPrice: number }>;
};

async function emitEvent(payload: { name: string; userId?: string; metadata?: Record<string, unknown> }) {
  try {
    await fetch("/api/advanced/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking analytics
  }
}

export function CheckoutProcess({ initialShippingMethod = "standard", guestMode = false, guestEmail = "", guestItems = [] }: CheckoutProcessProps) {
  const [guestItemsState, setGuestItemsState] = useState<Array<{ productId: string; variantId?: string | null; quantity: number; unitPrice: number }>>(guestItems);
  const [guestEmailState, setGuestEmailState] = useState(guestEmail);
  const [line1, setLine1] = useState("123 Main St");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("Accra");
  const [stateVal, setStateVal] = useState("Greater Accra");
  const [country, setCountry] = useState("Ghana");
  const [postalCode, setPostalCode] = useState("GA-123-4567");
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">(initialShippingMethod);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [availableRates, setAvailableRates] = useState<ShippingRate[]>([]);

  useEffect(() => {
    async function fetchRates() {
       const rates = await LogisticsService.getRates({ country, city, postalCode }, 500); // Default weight
       setAvailableRates(rates);
    }
    fetchRates();
  }, [country, city, postalCode]);

  useEffect(() => {
    if (!guestMode || guestItems.length > 0) return;
    const raw = localStorage.getItem("guest_cart_items");
    if (raw) {
      const parsed = JSON.parse(raw) as Array<{ productId: string; variantId?: string | null; quantity: number; unitPrice: number }>;
      setGuestItemsState(parsed);
    }
  }, [guestMode, guestItems]);

  const guestSubtotal = useMemo(() => {
    if (!guestMode) return 0;
    return guestItemsState.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [guestItemsState, guestMode]);

  const shippingCost = shippingMethod === "express" ? 1500 : 800;

  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    if (guestMode) return;
    fetch("/api/auth/webauthn/authenticators/status")
      .then(res => res.json())
      .then(data => setHasBiometrics(!!data.hasAuthenticators))
      .catch(() => {});
  }, [guestMode]);

  async function handleBiometricCheckout() {
    setLoading(true);
    setError(null);
    try {
      const { authenticateBiometrics } = await import("@/lib/auth/biometric.client");
      await authenticateBiometrics();
      await placeOrder(); // Proceed to order placement after biometric verification
    } catch (err: any) {
      setError(err.message || "Biometric authentication failed");
      setLoading(false);
    }
  }

  async function placeOrder() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!line1 || !city || !stateVal || !country || !postalCode) {
      setError("Please complete all required shipping fields.");
      setLoading(false);
      return;
    }
    if (guestMode && !guestEmailState) {
      setError("Guest email is required.");
      setLoading(false);
      return;
    }
    if (guestMode && (!guestItemsState || guestItemsState.length === 0)) {
      setError("Guest cart is empty.");
      setLoading(false);
      return;
    }

    try {
      const itemCount = guestMode
        ? guestItemsState.reduce((sum, item) => sum + item.quantity, 0)
        : undefined;

      await emitEvent({
        name: "begin_checkout",
        metadata: {
          guestMode,
          shippingMethod,
          country,
          state: stateVal,
          itemCount,
        },
      });

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress: { line1, line2, city, state: stateVal, country, postalCode },
          shippingMethod,
          ...(guestMode ? { guestEmail: guestEmailState, guestItems: guestItemsState } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        if (data?.risk?.decision === "REVIEW") {
          setError("Checkout flagged for review. Please contact support to proceed.");
        } else {
          setError(data.error ?? "Could not initialize checkout");
        }
        setLoading(false);
        return;
      }

      if (data.payment?.data?.authorization_url) {
        setSuccess("Redirecting to Paystack...");
        if (guestMode) {
          localStorage.removeItem("guest_cart_items");
        }
        window.location.href = data.payment.data.authorization_url;
        return;
      }

      setError("Payment gateway did not return a redirect URL");
    } catch (err) {
      setError((err as Error)?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass fade-in-up mt-4 rounded-2xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-black text-[var(--foreground)] sm:text-lg">Shipping Details</h3>
        <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          Secure Checkout
        </span>
      </div>

      <div className="mt-3 grid gap-3">
        {guestMode ? (
          <input
            value={guestEmailState}
            onChange={(e) => setGuestEmailState(e.target.value)}
            type="email"
            placeholder="Email for order updates"
            className="input-premium w-full"
          />
        ) : null}
        <input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Address line 1" className="input-premium w-full" />
        <input value={line2} onChange={(e) => setLine2(e.target.value)} placeholder="Address line 2 (optional)" className="input-premium w-full" />
        <div className="grid gap-3 md:grid-cols-2">
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="input-premium w-full" />
          <input value={stateVal} onChange={(e) => setStateVal(e.target.value)} placeholder="Region / State" className="input-premium w-full" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="input-premium w-full" />
          <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postal Code" className="input-premium w-full" />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Shipping Method</label>
          <select value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value as any)} className="input-premium mt-1 w-full">
            {availableRates.map(rate => (
              <option key={rate.service} value={rate.service.toLowerCase().replace(/\s+/g, "_")}>
                {rate.carrier} {rate.service} ({formatCedis(rate.rate)}) — {rate.estimatedDays} days
              </option>
            ))}
          </select>
        </div>
      </div>

      {guestMode ? (
        <div className="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3 text-xs">
          <div className="flex items-center justify-between text-[var(--muted-foreground)]">
            <span>Guest cart subtotal</span>
            <span>{formatCedis(guestSubtotal)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[var(--muted-foreground)]">
            <span>Shipping</span>
            <span>{formatCedis(shippingCost)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[var(--border-soft)] pt-2 font-bold text-[var(--foreground)]">
            <span>Estimated total</span>
            <span>{formatCedis(guestSubtotal + shippingCost)}</span>
          </div>
        </div>
      ) : null}

      {hasBiometrics && (
        <button
          type="button"
          onClick={handleBiometricCheckout}
          disabled={loading}
          className="btn-primary mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-950 px-4 py-3 text-sm font-black text-white shadow-xl hover:bg-emerald-900 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
            <path d="M12 22v-4M8 22v-4M16 22v-4M7 11v4c0 2.761 2.239 5 5 5s5-2.239 5-5v-4" />
            <path d="M12 2a5 5 0 00-5 5v4h10V7a5 5 0 00-5-5z" />
          </svg>
          {loading ? "Verifying..." : "One-Tap Biometric Checkout"}
        </button>
      )}

      <button
        type="button"
        onClick={placeOrder}
        disabled={loading}
        className="btn-primary mt-5 w-full rounded-full px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Processing..." : "Pay with Paystack"}
      </button>

      {error ? <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">You will be redirected to Paystack to complete payment and then returned to the success page.</p>
    </div>
  );
}

