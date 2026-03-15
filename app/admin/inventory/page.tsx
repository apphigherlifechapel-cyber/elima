import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { Category, Product } from "@prisma/client";
import InventoryAdjustButton from "@/components/admin/InventoryAdjustButton";

type AdminInventoryRow = Product & {
  category: Pick<Category, "name">;
};

export default async function AdminInventoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div className="p-8">Unauthorized</div>;
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || !["ADMIN", "STAFF"].includes(admin.role)) {
    return <div className="p-8">Forbidden</div>;
  }

  const products: AdminInventoryRow[] = await prisma.product.findMany({
    orderBy: [{ stockTotal: "asc" }, { updatedAt: "desc" }],
    take: 200,
    include: { category: { select: { name: true } } },
  });

  const lowStockCount = products.filter((p) => Math.max(0, p.stockTotal - p.stockReserved) <= Math.max(10, p.moq)).length;

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Inventory</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Stock Health</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Track total, reserved, and available quantities in real time.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Products Scanned</p>
            <p className="text-xl font-black">{products.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Low Stock Alerts</p>
            <p className="text-xl font-black text-amber-700">{lowStockCount}</p>
          </div>
        </div>
      </section>

      <section className="soft-card overflow-x-auto rounded-2xl p-4 sm:p-5">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Reserved</th>
              <th className="px-3 py-2">Available</th>
              <th className="px-3 py-2">MOQ</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const available = Math.max(0, product.stockTotal - product.stockReserved);
              const low = available <= Math.max(10, product.moq);
              return (
                <tr key={product.id} className={`border-t border-[var(--border-soft)] ${low ? "bg-amber-50/70" : ""}`}>
                  <td className="px-3 py-3 font-semibold">{product.title}</td>
                  <td className="px-3 py-3">{product.category.name}</td>
                  <td className="px-3 py-3">{product.stockTotal}</td>
                  <td className="px-3 py-3">{product.stockReserved}</td>
                  <td className="px-3 py-3 font-semibold">{available}</td>
                  <td className="px-3 py-3">{product.moq}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${product.isAvailable ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200"}`}>
                      {product.isAvailable ? "Available" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-[var(--muted-foreground)]">{new Date(product.updatedAt).toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <InventoryAdjustButton productId={product.id} stockTotal={product.stockTotal} stockReserved={product.stockReserved} isAvailable={product.isAvailable} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
