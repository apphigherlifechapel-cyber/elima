import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { formatCedis } from "@/lib/utils/currency";
import ProductReviews from "@/components/product/ProductReviews";
import ProductPurchasePanel from "@/components/product/ProductPurchasePanel";
import type { ProductImage, ProductVariant } from "@prisma/client";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import { trackEvent } from "@/lib/analytics.events";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  if (!slug) return notFound();

  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: true, variants: true, brand: true, category: true },
  });
  if (!product) return notFound();

  const session = await getServerSession(authOptions);
  const user = session?.user?.email ? await prisma.user.findUnique({ where: { email: session.user.email } }) : null;

  await trackEvent({
    name: "product_view",
    userId: user?.id,
    metadata: {
      productId: product.id,
      slug: product.slug,
      isWholesale: product.isWholesale,
      retailPrice: Number(product.retailPrice || 0),
    },
  });

  const canReview = Boolean(
    user &&
      (await prisma.orderItem.count({
        where: { productId: product.id, order: { userId: user.id, status: "PAID" } },
      })) > 0
  );

  return (
    <div className="pb-20 pt-8 sm:pt-10">
      <div className="page-wrap">
        <section className="glass rounded-3xl p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            <Link href="/" className="hover:text-[var(--foreground)]">Home</Link>
            <span>•</span>
            <Link href="/shop" className="hover:text-[var(--foreground)]">Shop</Link>
            <span>•</span>
            <Link href={`/category/${product.category?.slug}`} className="hover:text-[var(--foreground)]">
              {product.category?.name || "Category"}
            </Link>
          </div>

          <div className="mt-4 grid gap-8 lg:grid-cols-[1.06fr_0.94fr]">
            <ProductImageGallery
              title={product.title}
              images={product.images.map((img: ProductImage) => ({
                id: img.id,
                url: img.url,
                altText: img.altText,
              }))}
            />

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--primary-strong)]">
                {product.brand?.name ?? "Elima Studio"}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">{product.title}</h1>
              <p className="mt-3 text-sm leading-relaxed text-zinc-700 sm:text-base">{product.description}</p>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-wide">
                {product.isWholesale ? (
                  <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1 text-[var(--primary-strong)]">
                    Wholesale Enabled
                  </span>
                ) : (
                  <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1 text-[var(--foreground)]">
                    Retail Product
                  </span>
                )}
                <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1 text-[var(--foreground)]">
                  {product.stockTotal > 0 ? `${product.stockTotal} in stock` : "Out of stock"}
                </span>
              </div>

              <div className="mt-5">
                <p className="text-3xl font-black text-[var(--foreground)]">{formatCedis(Number(product.retailPrice || 0))}</p>
                {product.isWholesale ? (
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Wholesale from {formatCedis(Number(product.wholesalePrice || 0))} • MOQ {product.moq}
                  </p>
                ) : null}
              </div>

              <div className="mt-6">
                <ProductPurchasePanel
                  userId={user?.id}
                  productId={product.id}
                  productTitle={product.title}
                  productStock={product.stockTotal}
                  defaultRetailPrice={Number(product.retailPrice || 0)}
                  variants={product.variants.map((v: ProductVariant) => ({
                    id: v.id,
                    sku: v.sku,
                    size: v.size,
                    color: v.color,
                    stock: v.stock,
                    retailPrice: v.retailPrice,
                  }))}
                  isWholesale={product.isWholesale}
                  moq={product.moq}
                />
              </div>

              {!user ? (
                <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-foreground)]">
                  You are in guest mode. Sign in for account-linked cart, wishlist sync, and faster checkout.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <ProductReviews productId={product.id} canReview={canReview} />
        </section>
      </div>
    </div>
  );
}

