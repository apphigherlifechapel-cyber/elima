import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatCedis } from "@/lib/utils/currency";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

type CategoryProduct = Prisma.ProductGetPayload<{
  include: {
    images: true;
    brand: true;
  };
}>;

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });

  if (!category) return notFound();

  const products = await prisma.product.findMany({
    where: { isAvailable: true, categoryId: category.id },
    include: { images: true, brand: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <div className="glass rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--primary-strong)]">Category</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">{category.name}</h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{products.length} premium products available.</p>
            </div>
            <Link href="/shop" className="btn-secondary rounded-full px-4 py-2 text-xs font-black">
              Back to Shop
            </Link>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="glass mt-6 rounded-2xl p-8 text-center">
            <p className="text-base font-black text-[var(--foreground)]">No available products in this category yet.</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Check back soon or browse all categories.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product: CategoryProduct) => (
              <Link key={product.id} href={`/product/${product.slug}`} className="soft-card group rounded-2xl p-3 sm:p-4">
                <div className="relative mb-3 h-52 w-full overflow-hidden rounded-xl bg-[var(--surface-2)]">
                  {product.images?.[0]?.url ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.images[0].altText ?? product.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">No image</div>
                  )}
                  {product.isWholesale ? (
                    <span className="absolute left-2 top-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--primary-strong)]">
                      Wholesale
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{product.brand?.name ?? "Unbranded"}</p>
                  <h3 className="line-clamp-2 text-base font-black text-[var(--foreground)]">{product.title}</h3>
                  <p className="text-lg font-black text-[var(--foreground)]">{formatCedis(Number(product.retailPrice || 0))}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


