import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  return user?.role === "ADMIN" ? user : null;
}

export default async function AdminProductsPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-zinc-600">You must be an admin to view this page.</p>
        <Link href="/login" className="mt-4 inline-block text-blue-600 hover:underline">Sign in</Link>
      </div>
    );
  }

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true, brand: true, images: { take: 1 } },
    take: 100,
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-3">
          <Link href="/admin/products/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            + New Product
          </Link>
          <Link href="/admin" className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50">← Dashboard</Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Retail Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Available</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p: any) => (
              <tr key={p.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium">{p.title}</td>
                <td className="px-4 py-3 text-zinc-600">{p.category?.name ?? "—"}</td>
                <td className="px-4 py-3">₦{p.retailPrice.toFixed(2)}</td>
                <td className="px-4 py-3">{p.stockTotal}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${p.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {p.isAvailable ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/product/${p.slug}`} className="text-blue-600 hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <p className="p-6 text-center text-zinc-500">No products yet. <Link href="/admin/products/new" className="text-blue-600 hover:underline">Create one</Link></p>
        )}
      </div>
    </div>
  );
}
