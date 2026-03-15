"use client";

import { useState } from "react";

type BannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  link: string | null;
  active: boolean;
  priority: number;
};

type BannersManagerProps = {
  initialBanners: BannerRow[];
};

const initialForm = {
  title: "",
  subtitle: "",
  imageUrl: "",
  link: "",
  priority: "0",
  active: true,
};

export default function BannersManager({ initialBanners }: BannersManagerProps) {
  const [banners, setBanners] = useState(initialBanners);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/banners");
    const data = await res.json();
    if (res.ok) setBanners(data.banners || []);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);
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
      } else {
        setForm((f) => ({ ...f, imageUrl: data.url || "" }));
        setMessage("Banner image uploaded.");
      }
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  function startEdit(banner: BannerRow) {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      imageUrl: banner.imageUrl,
      link: banner.link || "",
      priority: String(banner.priority),
      active: banner.active,
    });
    setError(null);
    setMessage(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  async function submitBanner(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        action: editingId ? "update" : "create",
        id: editingId,
        title: form.title,
        subtitle: form.subtitle || null,
        imageUrl: form.imageUrl,
        link: form.link || null,
        priority: Number(form.priority),
        active: form.active,
      };

      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save banner");
      } else {
        setMessage(editingId ? "Banner updated." : "Banner created.");
        resetForm();
        await refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function toggleBanner(id: string) {
    const res = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to toggle banner");
      return;
    }
    setMessage("Banner status updated.");
    await refresh();
  }

  async function deleteBanner(id: string) {
    const res = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to delete banner");
      return;
    }
    setMessage("Banner deleted.");
    await refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submitBanner} className="soft-card rounded-2xl p-5">
        <h2 className="text-lg font-black">{editingId ? "Edit Banner" : "Create Banner"}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Subtitle (optional)" value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} required />
          <input type="file" accept="image/*" className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" placeholder="Link (optional)" value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} />
          <input className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm" type="number" placeholder="Priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            Active
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button disabled={loading} className="btn-primary disabled:opacity-60">
            {loading ? "Saving..." : editingId ? "Update Banner" : "Create Banner"}
          </button>
          {uploading ? <span className="text-xs text-[var(--muted-foreground)]">Uploading image...</span> : null}
          {editingId ? (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <div className="soft-card rounded-2xl p-5">
        <h2 className="text-lg font-black">Banners</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              <tr>
                <th className="px-2 py-2">Title</th>
                <th className="px-2 py-2">Image</th>
                <th className="px-2 py-2">Link</th>
                <th className="px-2 py-2">Priority</th>
                <th className="px-2 py-2">Active</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((banner) => (
                <tr key={banner.id} className="border-t border-[var(--border-soft)]">
                  <td className="px-2 py-3">{banner.title}</td>
                  <td className="px-2 py-3">
                    <a href={banner.imageUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--primary)] hover:underline">
                      View
                    </a>
                  </td>
                  <td className="px-2 py-3">{banner.link || "-"}</td>
                  <td className="px-2 py-3">{banner.priority}</td>
                  <td className="px-2 py-3">{banner.active ? "Yes" : "No"}</td>
                  <td className="px-2 py-3">
                    <button onClick={() => startEdit(banner)} className="btn-secondary mr-2 text-xs">Edit</button>
                    <button onClick={() => toggleBanner(banner.id)} className="btn-secondary mr-2 text-xs">Toggle</button>
                    <button onClick={() => deleteBanner(banner.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete</button>
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
