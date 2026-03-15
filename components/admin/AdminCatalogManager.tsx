"use client";

import { useEffect, useState } from "react";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

type BrandOption = {
  id: string;
  name: string;
  slug: string;
};

type AdminCatalogManagerProps = {
  initialCategories: CategoryOption[];
  initialBrands: BrandOption[];
  onCatalogChange?: (payload: { categories: CategoryOption[]; brands: BrandOption[] }) => void;
};

export default function AdminCatalogManager({ initialCategories, initialBrands, onCatalogChange }: AdminCatalogManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [brands, setBrands] = useState(initialBrands);
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    onCatalogChange?.({ categories, brands });
  }, [brands, categories, onCatalogChange]);

  async function refresh() {
    const res = await fetch("/api/admin/catalog");
    const data = await res.json();
    if (res.ok) {
      setCategories(data.categories || []);
      setBrands(data.brands || []);
    }
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createCategory",
        name: categoryName,
        slug: categorySlug || undefined,
        parentId: parentId || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create category");
      return;
    }
    setCategoryName("");
    setCategorySlug("");
    setParentId("");
    setMessage("Category created.");
    await refresh();
  }

  async function deleteCategory(id: string) {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteCategory", id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to delete category");
      return;
    }
    setMessage("Category deleted.");
    await refresh();
  }

  async function createBrand(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createBrand",
        name: brandName,
        slug: brandSlug || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create brand");
      return;
    }
    setBrandName("");
    setBrandSlug("");
    setMessage("Brand created.");
    await refresh();
  }

  async function deleteBrand(id: string) {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteBrand", id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to delete brand");
      return;
    }
    setMessage("Brand deleted.");
    await refresh();
  }

  return (
    <div className="soft-card space-y-6 rounded-2xl p-5">
      <h2 className="text-lg font-black">Categories & Brands</h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <form onSubmit={createCategory} className="space-y-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <h3 className="font-bold">Create Category</h3>
            <input className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Category name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required />
            <input className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Slug (optional)" value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} />
            <select className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">No parent</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button className="btn-primary text-xs">Create Category</button>
          </form>

          <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Slug</th>
                  <th className="px-2 py-2">Parent</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-t border-[var(--border-soft)]">
                    <td className="px-2 py-2">{category.name}</td>
                    <td className="px-2 py-2">{category.slug}</td>
                    <td className="px-2 py-2">{categories.find((c) => c.id === category.parentId)?.name || "-"}</td>
                    <td className="px-2 py-2">
                      <button onClick={() => deleteCategory(category.id)} className="rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <form onSubmit={createBrand} className="space-y-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <h3 className="font-bold">Create Brand</h3>
            <input className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Brand name" value={brandName} onChange={(e) => setBrandName(e.target.value)} required />
            <input className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Slug (optional)" value={brandSlug} onChange={(e) => setBrandSlug(e.target.value)} />
            <button className="btn-primary text-xs">Create Brand</button>
          </form>

          <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-[var(--border-soft)] bg-[var(--surface)]">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Slug</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => (
                  <tr key={brand.id} className="border-t border-[var(--border-soft)]">
                    <td className="px-2 py-2">{brand.name}</td>
                    <td className="px-2 py-2">{brand.slug}</td>
                    <td className="px-2 py-2">
                      <button onClick={() => deleteBrand(brand.id)} className="rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </div>
  );
}
