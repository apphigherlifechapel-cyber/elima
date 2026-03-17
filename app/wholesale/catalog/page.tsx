import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Image from "next/image";
import { formatCedis } from "@/lib/utils/currency";

export default async function WholesaleCatalog() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const products = await prisma.product.findMany({
    where: { isWholesale: true, isAvailable: true },
    include: { images: { take: 1 } }
  });

  return (
    <div className="bg-zinc-50/30 min-h-screen">
      <div className="page-container py-12">
        <header className="mb-12">
           <h1 className="text-3xl font-black text-zinc-900">Bulk Catalog</h1>
           <p className="text-zinc-500 font-bold mt-2">Exclusive wholesale pricing for your business.</p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <div key={product.id} className="group overflow-hidden rounded-3xl border border-zinc-100 bg-white p-4 shadow-sm transition-all hover:shadow-xl">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100">
                {product.images[0] && (
                  <Image
                    src={product.images[0].url}
                    alt={product.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                )}
                <div className="absolute top-3 left-3">
                   <span className="rounded-full bg-zinc-900/80 px-3 py-1 text-[10px] font-black uppercase text-white backdrop-blur">
                     Min: {product.moq} units
                   </span>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-black text-zinc-900">{product.title}</h3>
                <div className="mt-2 flex items-baseline justify-between">
                   <p className="text-lg font-black text-emerald-600">{formatCedis(product.wholesalePrice)}</p>
                   <p className="text-xs font-bold text-zinc-400 line-through">{formatCedis(product.retailPrice)}</p>
                </div>
                
                <button className="btn-primary mt-6 w-full rounded-2xl py-3 text-xs font-black uppercase tracking-widest">
                  Configure Bulk Order
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
