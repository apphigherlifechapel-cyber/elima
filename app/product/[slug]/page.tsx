/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import type { ProductImage, ProductVariant } from "@prisma/client";
import Link from "next/link";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { ProductClientWrapper } from "@/components/product/ProductClientWrapper";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  
  if (!slug) return notFound();

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

  const mainImage = product.images[0]?.url || "";

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20">
      <ProductClientWrapper>
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            <Link href="/" className="hover:text-zinc-900 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-zinc-900 transition-colors">Shop</Link>
            <span>/</span>
            <Link href={`/category/${product.category?.slug}`} className="hover:text-zinc-900 transition-colors">
              {product.category?.name ?? "Uncategorised"}
            </Link>
          </nav>

          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            {/* Gallery Section */}
            <div className="space-y-4">
              <div className="aspect-[4/5] relative overflow-hidden rounded-[2.5rem] bg-white shadow-2xl shadow-zinc-200/50 group">
                {mainImage ? (
                  <Image
                    src={mainImage}
                    alt={product.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-300 font-black uppercase tracking-widest italic">No image available</div>
                )}
                
                {/* Badge Overlay */}
                <div className="absolute left-6 top-6 flex flex-col gap-2">
                  {product.isWholesale && (
                    <span className="rounded-full bg-emerald-600/90 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                      Wholesale Available
                    </span>
                  )}
                  {product.stockTotal < 5 && product.stockTotal > 0 && (
                    <span className="rounded-full bg-amber-500/90 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                      Low Stock
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {product.images.map((img: ProductImage) => (
                    <div key={img.id} className="aspect-square relative overflow-hidden rounded-2xl bg-white border border-zinc-100 hover:border-zinc-900 transition-colors cursor-pointer">
                      <Image src={img.url} alt={img.altText || product.title} fill className="object-cover p-1 rounded-2xl" unoptimized />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="flex flex-col h-full py-2">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    {product.category?.name ?? "Collection 2026"}
                  </span>
                  {product.brand && (
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
                      by {product.brand.name}
                    </span>
                  )}
                </div>
                
                <h1 className="text-4xl font-black tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl mb-6">
                  {product.title}
                </h1>

                <div className="flex items-baseline gap-4 mb-8">
                  <span className="text-4xl font-black text-zinc-900">
                    ₦{(product.retailPrice || 0).toLocaleString()}
                  </span>
                  {product.isWholesale && (
                    <span className="text-sm font-bold text-emerald-600">
                      Bulk orders from ₦{(product.wholesalePrice || 0).toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="prose prose-zinc prose-sm max-w-none mb-10">
                  <p className="text-lg leading-relaxed text-zinc-600 font-medium">
                    {product.description}
                  </p>
                </div>

                {/* Technical Specs / Variants */}
                {product.variants.length > 0 && (
                  <div className="mb-10">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4 italic">Select Specification</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((v: ProductVariant) => (
                        <button 
                          key={v.id} 
                          className="rounded-2xl border-2 border-zinc-100 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest hover:border-zinc-900 transition-all active:scale-95"
                        >
                          {v.size || v.color || v.sku}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Card */}
              <div className="sticky bottom-8 lg:static">
                <div className="rounded-[2rem] border border-zinc-100 bg-white/80 p-8 shadow-xl shadow-zinc-200/40 backdrop-blur-xl">
                  {userId ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        <span>Availability</span>
                        <span className={product.stockTotal > 0 ? "text-emerald-600" : "text-rose-600"}>
                          {product.stockTotal > 0 ? `In Stock (${product.stockTotal})` : "Out of Stock"}
                        </span>
                      </div>
                      
                      <AddToCartButton
                        userId={userId}
                        productId={product.id}
                        variantId={product.variants?.[0]?.id}
                        productTitle={product.title}
                        unitPrice={product.retailPrice}
                      />
                      
                      <p className="text-center text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                        Secure Checkout Powered by Paystack
                      </p>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <p className="text-sm font-bold text-zinc-600">
                        Sign in to access retail and wholesale pricing.
                      </p>
                      <Link 
                        href="/login" 
                        className="block w-full rounded-2xl bg-zinc-900 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-zinc-800 transition-colors"
                      >
                        Sign In to Shop
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProductClientWrapper>
    </div>
  );
}

