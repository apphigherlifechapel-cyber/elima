"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Category { id: string; name: string }

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [stockTotal, setStockTotal] = useState("0");
  const [moq, setMoq] = useState("1");
  const [imageUrl, setImageUrl] = useState("");
  const [isWholesale, setIsWholesale] = useState(false);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCategories(data);
    }).catch(() => {});
  }, []);

  // Auto-generate slug from title
  function handleTitleChange(val: string) {
    setTitle(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          categoryId,
          description,
          retailPrice: Number(retailPrice),
          wholesalePrice: wholesalePrice ? Number(wholesalePrice) : Number(retailPrice),
          stockTotal: Number(stockTotal),
          moq: Number(moq),
          isWholesale,
          imageUrl: imageUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create product");
      } else {
        router.push("/admin/products");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Product</h1>
        <Link href="/admin/products" className="text-sm text-blue-600 hover:underline">← Back</Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Title *</label>
            <input value={title} onChange={e => handleTitleChange(e.target.value)} required
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Slug *</label>
            <input value={slug} onChange={e => setSlug(e.target.value)} required
              className="w-full rounded-lg border px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Category *</label>
          {categories.length > 0 ? (
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="">Select category…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <input value={categoryId} onChange={e => setCategoryId(e.target.value)} placeholder="Category ID" required
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Description *</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} required
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Retail Price (₦) *</label>
            <input type="number" min="0" step="0.01" value={retailPrice} onChange={e => setRetailPrice(e.target.value)} required
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Wholesale Price (₦)</label>
            <input type="number" min="0" step="0.01" value={wholesalePrice} onChange={e => setWholesalePrice(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Stock</label>
            <input type="number" min="0" value={stockTotal} onChange={e => setStockTotal(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">MOQ (Min. Order Qty)</label>
            <input type="number" min="1" value={moq} onChange={e => setMoq(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Image URL</label>
            <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isWholesale} onChange={e => setIsWholesale(e.target.checked)} className="h-4 w-4 rounded" />
          Available for Wholesale
        </label>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? "Creating…" : "Create Product"}
        </button>
      </form>
    </div>
  );
}
