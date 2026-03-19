import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import Image from "next/image";

export default async function VendorProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login?callbackUrl=/vendor/products");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { vendor: true }
  });

  if (!user?.vendor || !user.vendor.isVerified) redirect("/vendor/dashboard");

  const products = await prisma.product.findMany({
    where: { vendorId: user.vendor.id },
    include: { category: true, images: { take: 1, orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="min-h-screen bg-zinc-50/30">
      <div className="page-container py-12">
        <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <Link href="/vendor/dashboard" className="text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors mb-4 inline-flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>
              Dashboard
            </Link>
            <h1 className="text-4xl font-black text-zinc-900">Manage Products</h1>
          </div>
          <Link href="/vendor/products/new" className="btn-primary rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700">
            List New Product
          </Link>
        </header>

        <div className="rounded-3xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Retail Price</th>
                  <th className="px-6 py-4">Wholesale Price</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {products.map((product: any) => {
                  const image = product.images[0];
                  return (
                    <tr key={product.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-12 w-12 rounded-xl bg-zinc-100 overflow-hidden flex-shrink-0">
                            {image ? (
                              <Image src={image.url} alt={product.title} fill className="object-cover" unoptimized />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[8px] font-bold text-zinc-400">No Img</div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900">{product.title}</p>
                            <p className="text-xs font-medium text-zinc-500">{product.category?.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black">₦{(product.retailPrice || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold text-zinc-600">
                        {product.isWholesale ? `₦${(product.wholesalePrice || 0).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-black ${product.stockTotal < 5 ? "text-amber-500" : "text-zinc-900"}`}>
                          {product.stockTotal}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                          product.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                        }`}>
                          {product.isAvailable ? "Active" : "Draft"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/product/${product.slug}`} target="_blank" className="font-bold text-emerald-600 hover:text-emerald-700 text-xs">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {products.length === 0 && (
              <div className="py-24 text-center">
                <p className="text-zinc-400 font-bold italic">You haven't listed any products yet.</p>
                <Link href="/vendor/products/new" className="mt-4 inline-block btn-secondary rounded-xl px-5 py-2 text-xs font-black uppercase tracking-widest hover:bg-zinc-100">
                  Create your first product
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
