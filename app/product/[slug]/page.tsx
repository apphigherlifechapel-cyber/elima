import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import type { ProductImage, ProductVariant } from "@prisma/client";
import Link from "next/link";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  
  if (!slug) return notFound();

  // Try finding the product. Using findFirst with case-insensitivity just in case
  const product = await prisma.product.findFirst({
    where: { 
      slug: {
        equals: slug,
        mode: 'insensitive'
      }
    },
    include: { images: true, variants: true, brand: true, category: true },
  });

  if (!product) {
    console.error(`Product not found for slug: ${slug}`);
    return notFound();
  }

  const session = await getServerSession(authOptions);
  let userId: string | null = null;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
    userId = user?.id ?? null;
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex justify-between">
        <div>
          <p className="text-sm text-zinc-500">{product.category?.name ?? "Uncategorised"}</p>
          <h1 className="text-3xl font-bold">{product.title}</h1>
          {product.brand && <p className="mt-1 text-sm text-zinc-500">by {product.brand.name}</p>}
        </div>
        <Link href="/shop" className="text-sm text-blue-600 hover:underline">← Back to Shop</Link>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
        <div className="space-y-3">
          {product.images.length > 0 ? (
            product.images.map((img: ProductImage) => (
              <Image
                key={img.id}
                src={img.url}
                alt={img.altText ?? product.title}
                width={800}
                height={450}
                className="h-72 w-full rounded-xl object-cover"
                unoptimized
              />
            ))
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">No image</div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <p className="text-zinc-700">{product.description}</p>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold">₦{(product.retailPrice || 0).toFixed(2)}</p>
            {product.isWholesale && (
              <p className="mt-1 text-sm text-green-700">Wholesale: ₦{(product.wholesalePrice || 0).toFixed(2)}</p>
            )}
            <p className="mt-2 text-sm text-zinc-500">MOQ: {product.moq} | In stock: {product.stockTotal}</p>
          </div>

          {product.variants.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">Variants</h3>
              <ul className="space-y-1">
                {product.variants.map((v: ProductVariant) => (
                  <li key={v.id} className="rounded-lg border px-3 py-2 text-sm">
                    {v.sku} {v.size && `(${v.size})`} {v.color && `· ${v.color}`} — ₦{v.retailPrice.toFixed(2)} · stock: {v.stock}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            {userId ? (
              <>
                <h3 className="mb-3 font-semibold">Add to Cart</h3>
                <AddToCartButton
                  userId={userId}
                  productId={product.id}
                  variantId={product.variants?.[0]?.id}
                />
              </>
            ) : (
              <p className="text-sm text-zinc-600">
                <Link href="/login" className="font-medium text-blue-600 hover:underline">Sign in</Link> to add to cart.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
