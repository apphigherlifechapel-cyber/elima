"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export function VendorRegistrationForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      companyName: formData.get("companyName"),
      storeDescription: formData.get("storeDescription"),
      taxId: formData.get("taxId"),
    };

    try {
      const res = await fetch("/api/vendor/register", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to submit application");

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl bg-emerald-50 p-8 text-center border border-emerald-100"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-8 w-8">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-emerald-950">Application Received!</h2>
        <p className="mt-4 text-emerald-700 font-bold">
          Our team is reviewing your vendor application. We'll notify you via email once your store is ready to go live.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-100 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-black text-zinc-900 mb-2">Become an Elima Vendor</h2>
      <p className="text-zinc-500 font-bold mb-8 italic">Join the 2026 Finest Marketplace</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Company/Store Name</label>
          <input
            name="companyName"
            required
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-3 font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
            placeholder="e.g. Luxury Silks Ltd"
          />
        </div>

        <div>
           <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Store Description</label>
           <textarea
             name="storeDescription"
             required
             rows={4}
             className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-3 font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none resize-none"
             placeholder="Tell us about the products you wish to sell..."
           />
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Tax ID / Business Reg (Optional)</label>
          <input
            name="taxId"
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-3 font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
            placeholder="TIN or Reg Number"
          />
        </div>

        {error && (
          <p className="text-sm font-bold text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
        >
          {loading ? "Submitting..." : "Apply to Sell"}
        </button>
      </form>
    </div>
  );
}
