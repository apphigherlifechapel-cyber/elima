import Image from "next/image";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatCedis } from "@/lib/utils/currency";

export const dynamic = "force-dynamic";
import { getRecommendationsForUser } from "@/lib/recommendations";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import RecommendationGrid from "@/components/shop/RecommendationGrid";

const editorial = {
  hero: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2200&q=90",
  split: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1700&q=90",
  wholesale: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1700&q=90",
};

const valuePillars = [
  {
    title: "Retail + Wholesale Architecture",
    desc: "One platform for D2C shoppers and B2B buyers with approvals, MOQ controls, and quote conversion workflows.",
  },
  {
    title: "Operationally Reliable Checkout",
    desc: "Server-side verified payments and clear fulfillment lifecycle handling for production-grade order integrity.",
  },
  {
    title: "Merchandising Built to Convert",
    desc: "Premium product presentation, category storytelling, and high-intent collection pathways.",
  },
];

type FeaturedProduct = Prisma.ProductGetPayload<{
  include: {
    images: true;
    brand: true;
    category: true;
  };
}>;

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user?.email ? await prisma.user.findUnique({ where: { email: session.user.email } }) : null;
  const recFlag = await prisma.setting.findUnique({ where: { key: "recommendations_enabled" } });
  const recommendationsEnabled = recFlag?.value !== "false";

  const [featuredProducts, categories, wholesaleCount, retailCount, recs] = await Promise.all([
    prisma.product.findMany({
      where: { isAvailable: true },
      include: { images: true, brand: true, category: true },
      take: 8,
      orderBy: [{ stockTotal: "desc" }, { createdAt: "desc" }],
    }),
    prisma.category.findMany({
      where: { products: { some: { isAvailable: true } } },
      select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
      orderBy: { name: "asc" },
      take: 6,
    }),
    prisma.product.count({ where: { isAvailable: true, isWholesale: true } }),
    prisma.product.count({ where: { isAvailable: true, isRetail: true, isWholesale: false } }),
    recommendationsEnabled ? getRecommendationsForUser(user?.id, { take: 4 }) : Promise.resolve({ personalized: [], trending: [], segment: "GUEST" as const }),
  ]);

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden pt-8 sm:pt-10">
        <div className="page-wrap">
          <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border-soft)]">
            <Image src={editorial.hero} alt="Elima flagship fashion collection" fill className="object-cover" priority unoptimized />
            <div className="absolute inset-0 bg-gradient-to-r from-black/84 via-black/58 to-black/24" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_22%,rgba(245,158,11,0.26),transparent_36%)]" />

            <div className="relative z-10 grid min-h-[560px] items-end gap-8 p-6 sm:p-10 lg:grid-cols-[1.25fr_0.75fr] lg:p-12">
              <div>
                <p className="inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white backdrop-blur">
                  Elima Global Commerce
                </p>
                <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Premium Commerce Experience for Retail and Wholesale Growth.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
                  Discover curated fashion, accessories, and beauty essentials with enterprise-level buying workflows and a world-class storefront experience.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/shop" className="rounded-2xl bg-white px-6 py-3 text-sm font-black text-zinc-900 transition hover:bg-white/90">
                    Explore Shop
                  </Link>
                  <Link href="/wholesale" className="rounded-2xl border border-white/40 bg-white/10 px-6 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/20">
                    Wholesale Portal
                  </Link>
                </div>
              </div>

              <div className="glass rounded-3xl p-5 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--foreground)]">Catalog Snapshot</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-3">
                    <p className="text-xl font-black text-[var(--foreground)]">{featuredProducts.length}+</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-700">Featured SKUs</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-3">
                    <p className="text-xl font-black text-[var(--foreground)]">{categories.length}+</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-700">Active Categories</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-3">
                    <p className="text-xl font-black text-[var(--foreground)]">{retailCount}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-700">Retail Products</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-3">
                    <p className="text-xl font-black text-[var(--foreground)]">{wholesaleCount}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-700">Wholesale SKUs</p>
                  </div>
                </div>
                <Link href="/apply-wholesale" className="btn-secondary mt-4 w-full rounded-xl py-2 text-center text-xs font-black">
                  Apply for Wholesale Access
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-wrap mt-12">
        <div className="grid gap-4 md:grid-cols-3">
          {valuePillars.map((pillar) => (
            <article key={pillar.title} className="soft-card rounded-3xl p-5 sm:p-6">
              <h2 className="text-lg font-black tracking-tight text-[var(--foreground)]">{pillar.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700">{pillar.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {recs.personalized.length > 0 ? (
        <section className="page-wrap mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--primary-strong)]">For You</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Personalized Picks</h2>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Segment: {recs.segment.replace("_", " ")}</p>
            </div>
            <Link href="/shop" className="btn-secondary rounded-full px-4 py-2 text-xs font-black">
              Continue Shopping
            </Link>
          </div>
          <RecommendationGrid items={recs.personalized} context="home" />
        </section>
      ) : null}

      <section className="page-wrap mt-12">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--border-soft)]">
            <Image src={editorial.split} alt="Luxury retail editorial grid" fill className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/35 to-black/15" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/80">Retail Excellence</p>
              <h3 className="mt-2 max-w-xl text-2xl font-black tracking-tight text-white sm:text-3xl">
                Merchandising quality designed to compete in global ecommerce markets.
              </h3>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-[var(--border-soft)]">
            <Image src={editorial.wholesale} alt="Wholesale-ready warehouse operations" fill className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/78 via-black/35 to-black/12" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/80">B2B Growth</p>
              <h3 className="mt-2 max-w-xl text-2xl font-black tracking-tight text-white sm:text-3xl">
                Wholesale account flows built for speed, clarity, and scale.
              </h3>
            </div>
          </div>
        </div>
      </section>

      <section className="page-wrap mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--primary-strong)]">Featured Products</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Top Picks Right Now</h2>
          </div>
          <Link href="/shop" className="btn-secondary rounded-full px-4 py-2 text-xs font-black">
            View Full Catalog
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featuredProducts.map((product: FeaturedProduct) => (
            <article key={product.id} className="soft-card rounded-2xl p-3 sm:p-4">
              <Link href={`/product/${product.slug}`} className="group block">
                <div className="relative mb-3 h-52 overflow-hidden rounded-xl bg-[var(--surface-2)]">
                  {product.images?.[0]?.url ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.images[0].altText ?? product.title}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">No image</div>
                  )}

                  <div className="absolute left-2 top-2 flex gap-1.5">
                    {product.isWholesale ? (
                      <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--primary-strong)]">
                        Wholesale
                      </span>
                    ) : (
                      <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--foreground)]">
                        Retail
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  {product.brand?.name ?? "Unbranded"} • {product.category?.name}
                </p>
                <h3 className="mt-1 line-clamp-2 text-base font-black text-[var(--foreground)]">{product.title}</h3>
                <p className="mt-2 text-lg font-black text-[var(--foreground)]">{formatCedis(Number(product.retailPrice || 0))}</p>
                {product.isWholesale ? (
                  <p className="text-xs text-[var(--muted-foreground)]">Wholesale from {formatCedis(Number(product.wholesalePrice || 0))}</p>
                ) : null}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="page-wrap mt-12">
        <div className="glass rounded-3xl p-6 sm:p-8 lg:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--primary-strong)]">Ready to Scale?</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">
                Build Your Business With Elima Wholesale
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-700 sm:text-base">
                Access volume pricing, quote processing, and account workflows engineered for serious retail operators and bulk buyers.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/apply-wholesale" className="btn-primary rounded-2xl px-6 py-3 text-sm font-black">
                Apply for Wholesale
              </Link>
              <Link href="/request-quote" className="btn-secondary rounded-2xl px-6 py-3 text-sm font-black">
                Request a Quote
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
