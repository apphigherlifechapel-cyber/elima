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
  let featuredProducts: FeaturedProduct[] = [];
  let categories: any[] = [];
  let wholesaleCount = 0;
  let retailCount = 0;
  let recs = { personalized: [], trending: [], segment: "GUEST" as const };

  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const user = session?.user?.email ? await prisma.user.findUnique({ where: { email: session.user.email } }) : null;
    const recFlag = await prisma.setting.findUnique({ where: { key: "recommendations_enabled" } });
    const recommendationsEnabled = recFlag?.value !== "false";

    const data = await Promise.all([
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
      recommendationsEnabled ? getRecommendationsForUser(user?.id, { take: 4 }).catch(() => ({ personalized: [], trending: [], segment: "GUEST" as const })) : Promise.resolve({ personalized: [], trending: [], segment: "GUEST" as const }),
    ]);

    featuredProducts = data[0] as FeaturedProduct[];
    categories = data[1];
    wholesaleCount = data[2];
    retailCount = data[3];
    recs = data[4] as any;
  } catch (error) {
    console.error("HomePage Data Load Error:", error);
  }

  return (
    <div className="pb-32 overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-6 sm:pt-10">
        <div className="page-container">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-zinc-200/50 shadow-2xl">
            <div className="absolute inset-0">
              <Image src={editorial.hero} alt="Elima flagship fashion collection" fill className="object-cover scale-105" priority unoptimized />
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-emerald-950/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/40 to-transparent" />
            </div>

            <div className="relative z-10 grid min-h-[500px] items-center gap-12 p-8 sm:min-h-[600px] sm:p-16 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="slide-up">
                <div className="mb-6 flex items-center gap-2">
                  <span className="h-[1px] w-8 bg-emerald-400" />
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400">
                    Elima Global Commerce
                  </p>
                </div>
                <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
                  Redefining <br className="hidden sm:block" />
                  <span className="text-emerald-400">African Premium</span> <br className="hidden sm:block" />
                  Retail Standards.
                </h1>
                <p className="mt-8 max-w-xl text-lg leading-relaxed text-zinc-100/90 sm:text-xl">
                  Discover curated fashion, accessories, and beauty essentials with enterprise-level buying workflows and a world-class storefront.
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                  <Link href="/shop" className="btn-primary px-8 py-4 text-[13px] font-black uppercase tracking-widest">
                    Shop Collection
                  </Link>
                  <Link href="/wholesale" className="btn-secondary bg-white/10 text-white border-white/20 backdrop-blur px-8 py-4 text-[13px] font-black uppercase tracking-widest hover:bg-white/20">
                    Wholesale
                  </Link>
                </div>
              </div>

              <div className="hidden lg:block slide-up animate-float" style={{ animationDelay: "0.2s" }}>
                <div className="glass-card rounded-[2.5rem] p-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900 mb-6 drop-shadow-sm">Catalog Snapshot</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { val: `${featuredProducts.length}+`, label: "Featured" },
                      { val: `${categories.length}+`, label: "Categories" },
                      { val: retailCount, label: "Retail" },
                      { val: wholesaleCount, label: "Wholesale" },
                    ].map((stat, i) => (
                      <div key={i} className="rounded-2xl bg-zinc-50/50 border border-zinc-100 p-4">
                        <p className="text-2xl font-black text-emerald-950">{stat.val}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                  <Link href="/apply-wholesale" className="btn-secondary mt-6 w-full py-3 text-[11px] font-black uppercase">
                    Apply for Wholesale Access
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars - Optimized for mobile scrolling */}
      <section className="mt-16">
        <div className="page-container h-full">
           <div className="relative -mx-5 px-5 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible">
            <div className="flex gap-4 sm:grid sm:grid-cols-3 pb-8 sm:pb-0">
              {valuePillars.map((pillar) => (
                <article key={pillar.title} className="glass-card hover-lift min-w-[300px] rounded-[2rem] p-8 sm:min-w-0">
                  <h2 className="text-xl font-black tracking-tight text-emerald-950">{pillar.title}</h2>
                  <p className="mt-4 text-[15px] leading-relaxed text-zinc-600 font-medium">{pillar.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recommendations */}
      {recs.personalized.length > 0 ? (
        <section className="mt-24">
          <div className="page-container">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-2">For You</p>
                <h2 className="text-4xl font-black tracking-tight text-emerald-950 sm:text-5xl">Personalized Picks</h2>
              </div>
              <Link href="/shop" className="text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-emerald-700 transition-colors">
                View All Recommendations →
              </Link>
            </div>
            <RecommendationGrid items={recs.personalized} context="home" />
          </div>
        </section>
      ) : null}

      {/* Split Editorial */}
      <section className="mt-24">
        <div className="page-container">
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              { img: editorial.split, label: "Retail Excellence", title: "Merchandising quality designed for global markets." },
              { img: editorial.wholesale, label: "B2B Growth", title: "Wholesale account flows built for speed and scale." },
            ].map((item, i) => (
              <div key={i} className="group relative h-[450px] overflow-hidden rounded-[2.5rem] border border-zinc-200/50">
                <Image src={item.img} alt={item.label} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">{item.label}</p>
                  <h3 className="max-w-md text-3xl font-black tracking-tight text-white leading-tight">
                    {item.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="mt-24">
        <div className="page-container text-emerald-950">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-2">New Arrivals</p>
              <h2 className="text-4xl font-black tracking-tight sm:text-5xl">Top Picks Right Now</h2>
            </div>
            <Link href="/shop" className="text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-emerald-700 transition-colors">
              Explore Full Catalog →
            </Link>
          </div>

          <div className="relative -mx-5 px-5 overflow-x-auto no-scrollbar sm:mx-0 sm:px-0 sm:overflow-visible">
            <div className="flex gap-4 pb-12 sm:grid sm:grid-cols-2 xl:grid-cols-4 sm:pb-0">
              {featuredProducts.map((product: FeaturedProduct) => (
                <article key={product.id} className="glass-card hover-lift min-w-[280px] rounded-[2.5rem] p-4 sm:min-w-0">
                  <Link href={`/product/${product.slug}`} className="group block">
                    <div className="relative mb-5 aspect-[4/5] overflow-hidden rounded-[2rem] bg-zinc-100 shadow-inner">
                      {product.images?.[0]?.url ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.images[0].altText ?? product.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-zinc-400">No image</div>
                      )}

                      <div className="absolute left-3 top-3 flex gap-2">
                        {product.isWholesale && (
                          <span className="rounded-full bg-emerald-950/90 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur">
                            Wholesale
                          </span>
                        )}
                        <span className="rounded-full bg-white/90 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-900 backdrop-blur shadow-sm">
                          {product.category?.name}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">
                        {product.brand?.name ?? "Premium Portfolio"}
                      </p>
                      <h3 className="line-clamp-2 text-xl font-black tracking-tight group-hover:text-emerald-700 transition-colors">
                        {product.title}
                      </h3>
                      <div className="pt-3 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-2xl font-black text-emerald-900">{formatCedis(Number(product.retailPrice || 0))}</p>
                          {product.isWholesale && (
                            <p className="text-[10px] font-bold text-emerald-600 italic">Bulk rates available</p>
                          )}
                        </div>
                        <div className="rounded-full bg-zinc-100 p-3 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 transform group-hover:rotate-45 shadow-sm group-hover:shadow-md">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Wholesale CTA */}
      <section className="mt-32">
        <div className="page-container">
          <div className="glass-card premium-shadow rounded-[3rem] p-10 sm:p-20 text-center lg:text-left">
            <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-4">Ready to Scale?</p>
                <h2 className="text-4xl font-black tracking-tight text-emerald-950 sm:text-6xl">
                  Build Your Business With Elima Wholesale
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600">
                  Access volume pricing, quote processing, and account workflows engineered for serious retail operators and bulk buyers.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 lg:justify-end">
                <Link href="/apply-wholesale" className="btn-primary px-10 py-5 text-[14px] font-black uppercase tracking-widest">
                  Apply Now
                </Link>
                <Link href="/request-quote" className="btn-secondary px-10 py-5 text-[14px] font-black uppercase tracking-widest">
                  Get a Quote
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
