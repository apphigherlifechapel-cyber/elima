"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

interface AIResult {
  id: string;
  title: string;
  description: string;
  slug: string;
  retailPrice: number;
  similarity: number;
}

export function StyleConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AIResult[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/search/ai?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error("AI Search Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="group relative flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-950 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        title="Style Concierge"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
          <path d="M8 9h8m-8 4h5" />
        </svg>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
        </span>
      </button>

      {/* Concierge Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[60] bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-[70] h-full w-full max-w-lg border-l border-zinc-200 bg-white shadow-2xl"
            >
              <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-100 p-6">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-emerald-950">Style Concierge</h2>
                    <p className="text-sm text-zinc-500 font-bold">Your AI-powered fashion assistant</p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8" ref={scrollRef}>
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                        <path d="M12 8V4m0 4L8 4m4 4l4-4M8 12h8m-8 4h5" />
                      </svg>
                    </div>
                    <div className="rounded-3xl bg-emerald-50/50 p-5 text-sm font-bold leading-relaxed text-emerald-950 border border-emerald-100">
                      Hello! I'm Elima's Style Concierge. Tell me what you're looking for, or describe an occasion, and I'll find the perfect matches from our collection.
                    </div>
                  </div>

                  {results.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400 pl-2">Curated for you</p>
                      <div className="grid grid-cols-1 gap-4">
                        {results.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group relative flex gap-4 rounded-3xl border border-zinc-100 p-4 transition-all hover:border-emerald-200 hover:bg-emerald-50/30"
                          >
                            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
                              <div className="flex h-full w-full items-center justify-center text-zinc-300">
                                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex flex-col justify-between py-1">
                              <div>
                                <h4 className="text-sm font-black text-zinc-900 line-clamp-1">{item.title}</h4>
                                <p className="mt-1 text-xs font-bold text-zinc-500 line-clamp-2">{item.description}</p>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-emerald-700">₦{item.retailPrice.toLocaleString()}</span>
                                <Link
                                  href={`/product/${item.slug}`}
                                  onClick={() => setIsOpen(false)}
                                  className="text-[10px] font-black uppercase tracking-wider text-zinc-900 border-b-2 border-zinc-900"
                                >
                                  View Details
                                </Link>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className="flex gap-4 animate-pulse">
                      <div className="h-10 w-10 rounded-2xl bg-zinc-100" />
                      <div className="h-20 flex-1 rounded-3xl bg-zinc-50" />
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-6 border-t border-zinc-100 bg-zinc-50/50">
                  <form onSubmit={handleSearch} className="relative">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g. 'I need a bold emerald look for a summer wedding'"
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-4 pr-12 text-sm font-bold shadow-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={loading || !query.trim()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-linear p-2 text-emerald-600 hover:text-emerald-700 disabled:text-zinc-300 transition-colors"
                    >
                      {loading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                          <path d="M5 12h14m-7-7l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  </form>
                  <p className="mt-4 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    AI Powered by Elima Brain
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
