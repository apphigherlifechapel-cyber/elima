"use client";

import { useEffect, useRef, useState } from "react";
import { formatCedis } from "@/lib/utils/currency";
import Link from "next/link";

type AdminProduct = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  categoryId?: string;
  brandId?: string | null;
  wholesalePrice?: number;
  moq?: number;
  packSize?: number;
  isRetail?: boolean;
  isWholesale?: boolean;
  retailPrice: number;
  stockTotal: number;
  isAvailable: boolean;
  category: { name: string };
  brand?: { name: string } | null;
  images?: Array<{ url: string }>;
};

type CategoryOption = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
};

type BrandOption = {
  id: string;
  name: string;
  slug?: string;
};

type AdminProductsManagerProps = {
  initialProducts: AdminProduct[];
  categories: CategoryOption[];
  brands: BrandOption[];
  initialEditingProduct?: AdminProduct | null;
};

const initialForm = {
  title: "",
  slug: "",
  categoryId: "",
  brandId: "",
  description: "",
  retailPrice: "0",
  wholesalePrice: "0",
  moq: "1",
  stockTotal: "0",
  packSize: "1",
  imageUrl: "",
  isRetail: true,
  isWholesale: false,
  isAvailable: true,
};

export default function AdminProductsManager({ initialProducts, categories, brands, initialEditingProduct = null }: AdminProductsManagerProps) {
  const [products, setProducts] = useState(initialProducts);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!initialEditingProduct) return;
    startEdit(initialEditingProduct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEditingProduct?.id]);

  async function refreshProducts() {
    const res = await fetch("/api/products");
    const data = await res.json();
    if (res.ok) setProducts(data.products || []);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Image upload failed");
        return;
      }
      setForm((f) => ({ ...f, imageUrl: data.url || "" }));
      setMessage("Image uploaded.");
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: form.title,
          slug: form.slug,
          categoryId: form.categoryId,
          brandId: form.brandId || null,
          description: form.description,
          retailPrice: Number(form.retailPrice),
          wholesalePrice: Number(form.wholesalePrice),
          moq: Number(form.moq),
          stockTotal: Number(form.stockTotal),
          packSize: Number(form.packSize),
          imageUrl: form.imageUrl || undefined,
          isRetail: form.isRetail,
          isWholesale: form.isWholesale,
          isAvailable: form.isAvailable,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create product");
      } else {
        setMessage("Product created.");
        setForm(initialForm);
        await refreshProducts();
      }
    } catch {
      setError("Network error while creating product");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(product: AdminProduct) {
    setEditingId(product.id);
    setForm({
      title: product.title || "",
      slug: product.slug || "",
      categoryId: product.categoryId || "",
      brandId: product.brandId || "",
      description: product.description || "",
      retailPrice: String(product.retailPrice ?? 0),
      wholesalePrice: String(product.wholesalePrice ?? product.retailPrice ?? 0),
      moq: String(product.moq ?? 1),
      stockTotal: String(product.stockTotal ?? 0),
      packSize: String(product.packSize ?? 1),
      imageUrl: product.images?.[0]?.url || "",
      isRetail: product.isRetail ?? true,
      isWholesale: product.isWholesale ?? false,
      isAvailable: product.isAvailable ?? true,
    });
    setError(null);
    setMessage(`Editing product: ${product.title}`);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setError(null);
    setMessage(null);
  }

  async function updateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          id: editingId,
          title: form.title,
          slug: form.slug,
          categoryId: form.categoryId,
          brandId: form.brandId || null,
          description: form.description,
          retailPrice: Number(form.retailPrice),
          wholesalePrice: Number(form.wholesalePrice),
          moq: Number(form.moq),
          stockTotal: Number(form.stockTotal),
          packSize: Number(form.packSize),
          imageUrl: form.imageUrl,
          isRetail: form.isRetail,
          isWholesale: form.isWholesale,
          isAvailable: form.isAvailable,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update product");
      } else {
        setMessage("Product updated.");
        cancelEdit();
        await refreshProducts();
      }
    } catch {
      setError("Network error while updating product");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(id: string) {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete product");
      } else {
        setMessage("Product deleted.");
        await refreshProducts();
      }
    } catch {
      setError("Network error while deleting product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form ref={formRef} onSubmit={editingId ? updateProduct : createProduct} className="soft-card rounded-2xl p-5">
        <h2 className="text-lg font-black">{editingId ? "Edit Product" : "Create Product"}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required />
          <select className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} required>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" value={form.brandId} onChange={(e) => setForm((f) => ({ ...f, brandId: e.target.value }))}>
            <option value="">No brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Image URL (optional)" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />
          <input type="file" accept="image/*" className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Retail price" type="number" min={0} step="0.01" value={form.retailPrice} onChange={(e) => setForm((f) => ({ ...f, retailPrice: e.target.value }))} />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Wholesale price" type="number" min={0} step="0.01" value={form.wholesalePrice} onChange={(e) => setForm((f) => ({ ...f, wholesalePrice: e.target.value }))} />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="MOQ" type="number" min={1} value={form.moq} onChange={(e) => setForm((f) => ({ ...f, moq: e.target.value }))} />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Stock total" type="number" min={0} value={form.stockTotal} onChange={(e) => setForm((f) => ({ ...f, stockTotal: e.target.value }))} />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Pack size" type="number" min={1} value={form.packSize} onChange={(e) => setForm((f) => ({ ...f, packSize: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isRetail} onChange={(e) => setForm((f) => ({ ...f, isRetail: e.target.checked }))} />Retail</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isWholesale} onChange={(e) => setForm((f) => ({ ...f, isWholesale: e.target.checked }))} />Wholesale</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))} />Available</label>
        </div>
        <textarea className="mt-3 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" rows={4} placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
        <div className="mt-3 flex items-center gap-3">
          <button disabled={loading} className="btn-primary disabled:opacity-60">{loading ? "Saving..." : editingId ? "Update Product" : "Create Product"}</button>
          {uploading ? <span className="text-xs text-[var(--muted-foreground)]">Uploading image...</span> : null}
          {editingId ? <button type="button" onClick={cancelEdit} className="btn-secondary">Cancel</button> : null}
        </div>
      </form>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <div className="soft-card rounded-2xl p-5">
        <h2 className="text-lg font-black">Products</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              <tr>
                <th className="px-2 py-2">Title</th>
                <th className="px-2 py-2">Slug</th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Brand</th>
                <th className="px-2 py-2">Retail</th>
                <th className="px-2 py-2">Wholesale</th>
                <th className="px-2 py-2">Stock</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-[var(--border-soft)]">
                  <td className="px-2 py-3 font-semibold">{product.title}</td>
                  <td className="px-2 py-3">{product.slug}</td>
                  <td className="px-2 py-3">{product.category?.name || "-"}</td>
                  <td className="px-2 py-3">{product.brand?.name || "-"}</td>
                  <td className="px-2 py-3">{formatCedis(product.retailPrice)}</td>
                  <td className="px-2 py-3">{formatCedis(product.wholesalePrice ?? product.retailPrice)}</td>
                  <td className="px-2 py-3">{product.stockTotal}</td>
                  <td className="px-2 py-3">{product.isAvailable ? "Live" : "Hidden"}</td>
                  <td className="px-2 py-3">
                    <Link href={`/admin/products?edit=${product.id}`} className="btn-secondary mr-2 text-xs">Edit</Link>
                    <button type="button" onClick={() => deleteProduct(product.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
