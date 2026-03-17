"use client";

import { useState } from "react";
import { registerBiometrics } from "@/lib/auth/biometric.client";
import { motion } from "framer-motion";

export function BiometricSettings() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleRegister = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await registerBiometrics();
      setMessage({ type: "success", text: "Biometric login registered successfully!" });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to register biometrics" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-zinc-900">Biometric Authentication</h3>
          <p className="mt-1 text-sm font-bold text-zinc-500">
            Use FaceID or TouchID for faster, secure checkout.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-400">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path d="M7 11V7a5 5 0 0110 0v4" />
            <rect x="3" y="11" width="18" height="11" rx="2" />
          </svg>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={handleRegister}
          disabled={loading}
          className="btn-primary flex items-center gap-3 px-6 py-3 text-xs font-black uppercase tracking-widest disabled:opacity-50"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
              <path d="M12 22v-4M8 22v-4M16 22v-4M7 11v4c0 2.761 2.239 5 5 5s5-2.239 5-5v-4" />
              <path d="M12 2a5 5 0 00-5 5v4h10V7a5 5 0 00-5-5z" />
            </svg>
          )}
          {loading ? "Registering..." : "Enable Biometrics"}
        </button>

        {message && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 text-xs font-bold ${
              message.type === "success" ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {message.text}
          </motion.p>
        )}
      </div>

      <div className="mt-6 border-t border-zinc-50 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          Security Note: Your biometric data never leaves your device.
        </p>
      </div>
    </div>
  );
}
