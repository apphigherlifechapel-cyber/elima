"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
}

export function ProductListingForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/vendor/products", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to list product");
      }

      router.push("/vendor/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto rounded-3xl bg-white p-10 border border-zinc-100 shadow-sm">
      <div>
        <h2 className="text-2xl font-black text-zinc-900">List New Product</h2>
        <p className="mt-1 text-sm text-zinc-400 font-bold">Submit your creation to the market.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Product Title</label>
          <input
            name="title"
            required
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-4 font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all text-sm"
            placeholder="e.g. Handcrafted Kente Silk Scarf"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Description</label>
          <textarea
            name="description"
            required
            rows={5}
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-4 font-bold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all text-sm resize-none"
            placeholder="Describe the materials, craftsmanship, and story..."
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
           <div>
             <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Category</label>
             <select
               name="categoryId"
               required
               className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-4 font-bold outline-none focus:border-emerald-500 transition-all text-sm appearance-none"
             >
               <option value="">Select Category</option>
               {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
           </div>
           <div>
             <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Initial Stock</label>
             <input
               name="stockTotal"
               type="number"
               required
               min="0"
               className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-4 font-bold outline-none focus:border-emerald-500 transition-all text-sm"
               placeholder="Total units available"
             />
           </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
           <div>
             <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Retail Price (₦)</label>
             <input
               name="retailPrice"
               type="number"
               required
               min="0"
               className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-4 font-bold outline-none focus:border-emerald-500 transition-all text-sm"
               placeholder="Price for single items"
             />
           </div>
           <div>
             <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Wholesale Price (₦)</label>
             <input
               name="wholesalePrice"
               type="number"
               required
               min="0"
               className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-4 font-bold outline-none focus:border-emerald-500 transition-all text-sm"
               placeholder="Price for bulk orders"
             />
           </div>
        </div>
      </div>

      {error && (
        <p className="text-sm font-bold text-red-500 bg-red-50 p-4 rounded-2xl border border-red-100">{error}</p>
      )}

      <div className="pt-4">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full rounded-2xl py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20"
        >
          {loading ? "Syncing to Elima..." : "Publish to Marketplace"}
        </button>
      </div>
    </form>
  );
}
