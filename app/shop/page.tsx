import Image from "next/image";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatCedis } from "@/lib/utils/currency";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { ShopCardActions } from "@/components/shop/ShopCardActions";
import { ShopFiltersClient } from "@/components/shop/ShopFiltersClient";
import { runSmartSearch, type SearchProduct } from "@/lib/search.engine";
import { getRecommendationsForUser } from "@/lib/recommendations";
import RecommendationGrid from "@/components/shop/RecommendationGrid";

type ShopPageProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    sort?: string;
    page?: string;
    wholesale?: string;
    inStock?: string;
    min?: string;
    max?: string;
  }>;
};

type ShopProduct = Prisma.ProductGetPayload<{
  include: {
    images: true;
    brand: true;
    category: true;
  };
}>;

type ShopCategory = Prisma.CategoryGetPayload<{
  select: {
    id: true;
    slug: true;
    name: true;
    _count: { select: { products: true } };
  };
}>;

const PAGE_SIZE = 12;
const SHOP_HERO = "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=2200&q=90";

function buildShopUrl(params: {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  wholesale?: boolean;
  inStock?: boolean;
  min?: number;
  max?: number;
}) {
  const qp = new URLSearchParams();
  if (params.q) qp.set("q", params.q);
  if (params.category) qp.set("category", params.category);
  if (params.sort && params.sort !== "newest") qp.set("sort", params.sort);
  if ((params.page || 1) > 1) qp.set("page", String(params.page));
  if (params.wholesale) qp.set("wholesale", "1");
  if (params.inStock) qp.set("inStock", "1");
  if (typeof params.min === "number" && params.min > 0) qp.set("min", String(params.min));
  if (typeof params.max === "number" && params.max > 0) qp.set("max", String(params.max));
  const query = qp.toString();
  return `/shop${query ? `?${query}` : ""}`;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = (await searchParams) || {};
  const q = (params.q || "").trim();
  const category = (params.category || "").trim();
  const sort = (params.sort || "newest").trim();
  const page = Math.max(1, Number(params.page || "1") || 1);
  const wholesale = params.wholesale === "1";
  const inStock = params.inStock === "1";
  const min = Number(params.min || "") || 0;
  const max = Number(params.max || "") || 0;

  const baseWhere: Prisma.ProductWhereInput = {
    isAvailable: true,
    ...(wholesale ? { isWholesale: true } : {}),
    ...(inStock ? { stockTotal: { gt: 0 } } : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(min > 0 || max > 0
      ? {
          retailPrice: {
            ...(min > 0 ? { gte: min } : {}),
            ...(max > 0 ? { lte: max } : {}),
          },
        }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price-asc"
      ? { retailPrice: "asc" }
      : sort === "price-desc"
      ? { retailPrice: "desc" }
      : sort === "name"
      ? { title: "asc" }
      : { createdAt: "desc" };

  const session = await getServerSession(authOptions);
  const user = session?.user?.email ? await prisma.user.findUnique({ where: { email: session.user.email } }) : null;
  const recFlag = await prisma.setting.findUnique({ where: { key: "recommendations_enabled" } });
  const recommendationsEnabled = recFlag?.value !== "false";

  const [categories, allFilteredProducts, recs] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, slug: true, name: true, _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: baseWhere,
      include: { images: true, brand: true, category: true },
      orderBy,
      take: q ? 800 : undefined,
      skip: q ? undefined : (page - 1) * PAGE_SIZE,
      ...(q ? {} : { take: PAGE_SIZE }),
    }),
    recommendationsEnabled ? getRecommendationsForUser(user?.id, { take: 4 }) : Promise.resolve({ personalized: [], trending: [], segment: "GUEST" as const }),
  ]);

  let filteredProducts: ShopProduct[] = allFilteredProducts as ShopProduct[];

  if (q) {
    const mapped: SearchProduct[] = filteredProducts.map((product) => ({
      id: product.id,
      title: product.title,
      description: product.description,
      brandName: product.brand?.name || null,
      categoryName: product.category?.name || null,
      retailPrice: Number(product.retailPrice || 0),
      stockTotal: product.stockTotal,
      isWholesale: product.isWholesale,
      createdAt: product.createdAt,
    }));

    const ranked = runSmartSearch(q, mapped);
    const rankedIdSet = new Set(ranked.map((item) => item.id));
    filteredProducts = ranked
      .map((rankedItem) => filteredProducts.find((p) => p.id === rankedItem.id))
      .filter(Boolean) as ShopProduct[];

    filteredProducts = filteredProducts.filter((p) => rankedIdSet.has(p.id));
  }

  const totalCount = filteredProducts.length;
  const pagedProducts = q ? filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : filteredProducts;

  const wishlistItems = user
    ? await prisma.wishlistItem.findMany({
        where: { wishlist: { userId: user.id } },
        select: { productId: true },
      })
    : [];
  const wishlistSet = new Set((wishlistItems as { productId: string }[]).map((x: { productId: string }) => x.productId));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasFilters = Boolean(q || category || wholesale || inStock || min > 0 || max > 0 || sort !== "newest");

  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border-soft)]">
          <Image src={SHOP_HERO} alt="Premium fashion storefront" fill className="object-cover" priority unoptimized />
          <div className="absolute inset-0 bg-gradient-to-r from-black/84 via-black/56 to-black/24" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(15,118,110,0.3),transparent_40%)]" />
          <div className="relative z-10 min-h-[340px] p-6 sm:p-10">
            <p className="inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white backdrop-blur">
              Flagship Catalog
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">Global-Grade Shopping Experience</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">
              Discover premium products across retail and wholesale with intelligent filters, quick actions, and conversion-focused product presentation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/" className="rounded-2xl bg-white px-5 py-2.5 text-xs font-black text-zinc-900 hover:bg-white/90">
                Back Home
              </Link>
              <Link
                href={buildShopUrl({ q, category, sort, wholesale: true, inStock: true, min, max, page: 1 })}
                className="rounded-2xl border border-white/40 bg-white/10 px-5 py-2.5 text-xs font-black text-white backdrop-blur hover:bg-white/20"
              >
                Wholesale In-Stock
              </Link>
            </div>
          </div>
        </section>

        {recs.personalized.length > 0 ? (
          <section className="mt-6 glass-card rounded-[2rem] p-5 sm:p-6">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--primary-strong)]">Just For You</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-[var(--foreground)]">Recommended for Your Taste</h2>
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Segment: {recs.segment.replace("_", " ")}</p>
              </div>
              <Link href="/shop" className="btn-secondary rounded-full px-3 py-1.5 text-xs font-black">Refresh</Link>
            </div>
            <RecommendationGrid items={recs.personalized} context="shop" />
          </section>
        ) : null}

        <div className="mt-7 grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="glass-card hover-lift h-fit rounded-[2rem] p-5 sm:p-6">
            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[var(--foreground)]">Filter & Search</h2>

            <form action="/shop" className="mt-4 space-y-3">
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="sort" value={sort} />
              <input type="hidden" name="wholesale" value={wholesale ? "1" : ""} />
              <input type="hidden" name="inStock" value={inStock ? "1" : ""} />
              <input type="hidden" name="min" value={min || ""} />
              <input type="hidden" name="max" value={max || ""} />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search products, brands..."
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
              />
              <button type="submit" className="btn-primary w-full rounded-xl py-2 text-sm font-black">
                Search
              </button>
            </form>

            <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--foreground)]">Categories</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li>
                  <Link
                    href={buildShopUrl({ q, sort, page: 1, wholesale, inStock, min, max })}
                    className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${
                      !category ? "bg-[var(--surface-2)] font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <span>All Products</span>
                    <span>{totalCount}</span>
                  </Link>
                </li>
                {categories.map((cat: ShopCategory) => (
                  <li key={cat.id}>
                    <Link
                      href={buildShopUrl({ q, category: cat.slug, sort, page: 1, wholesale, inStock, min, max })}
                      className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${
                        category === cat.slug ? "bg-[var(--surface-2)] font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span>{cat._count.products}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--foreground)]">Quick Filters</p>
              <div className="mt-2 space-y-2 text-sm">
                <Link
                  href={buildShopUrl({ q, category, sort, page: 1, wholesale: !wholesale, inStock, min, max })}
                  className={`block rounded-lg px-2 py-1.5 ${wholesale ? "bg-[var(--surface-2)] font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
                >
                  Wholesale Only
                </Link>
                <Link
                  href={buildShopUrl({ q, category, sort, page: 1, wholesale, inStock: !inStock, min, max })}
                  className={`block rounded-lg px-2 py-1.5 ${inStock ? "bg-[var(--surface-2)] font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
                >
                  In Stock Only
                </Link>
              </div>
            </div>

            <div className="mt-5 border-t border-[var(--border-soft)] pt-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--foreground)]">Price Range (GHS)</p>
              <form action="/shop" className="mt-2 grid grid-cols-2 gap-2">
                <input type="hidden" name="q" value={q} />
                <input type="hidden" name="category" value={category} />
                <input type="hidden" name="sort" value={sort} />
                <input type="hidden" name="wholesale" value={wholesale ? "1" : ""} />
                <input type="hidden" name="inStock" value={inStock ? "1" : ""} />
                <input
                  name="min"
                  defaultValue={min || ""}
                  placeholder="Min"
                  className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
                <input
                  name="max"
                  defaultValue={max || ""}
                  placeholder="Max"
                  className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
                <button type="submit" className="btn-secondary col-span-2 rounded-xl py-2 text-sm font-bold">
                  Apply Price
                </button>
              </form>
            </div>

            {hasFilters ? (
              <Link href="/shop" className="btn-secondary mt-4 w-full rounded-xl py-2 text-center text-sm font-bold">
                Clear Filters
              </Link>
            ) : null}
          </aside>

          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--muted-foreground)]">
                Showing <span className="font-bold text-[var(--foreground)]">{pagedProducts.length}</span> of{" "}
                <span className="font-bold text-[var(--foreground)]">{totalCount}</span> products
              </p>

              <ShopFiltersClient
                currentSort={sort}
                sortOptions={[
                  { key: "newest", label: "Newest" },
                  { key: "price-asc", label: "Price Low-High" },
                  { key: "price-desc", label: "Price High-Low" },
                  { key: "name", label: "Name" },
                ]}
              />
            </div>

            {pagedProducts.length === 0 ? (
              <div className="glass-card rounded-[2rem] p-10 text-center">
                <p className="text-lg font-black text-[var(--foreground)]">No products match your filters.</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Try changing search criteria or clear filters.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pagedProducts.map((product: ShopProduct) => (
                  <article key={product.id} className="glass-card hover-lift relative rounded-[2rem] p-4">
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
                          {product.stockTotal <= 0 ? (
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                              Out of Stock
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                        {product.brand?.name ?? "Unbranded"} • {product.category?.name}
                      </p>
                      <h3 className="mt-1 line-clamp-2 text-base font-black text-[var(--foreground)]">{product.title}</h3>
                      <p className="mt-2 text-lg font-black text-[var(--foreground)]">{formatCedis(Number(product.retailPrice || 0))}</p>
                      {product.isWholesale ? (
                        <p className="text-xs text-[var(--muted-foreground)]">Wholesale from {formatCedis(Number(product.wholesalePrice || 0))} • MOQ {product.moq}</p>
                      ) : null}
                    </Link>

                    <ShopCardActions
                      userId={user?.id}
                      productId={product.id}
                      productTitle={product.title}
                      unitPrice={Number(product.retailPrice || 0)}
                      initialInWishlist={wishlistSet.has(product.id)}
                      disabled={product.stockTotal <= 0}
                    />
                  </article>
                ))}
              </div>
            )}

            {totalPages > 1 ? (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href={buildShopUrl({ q, category, sort, page: Math.max(page - 1, 1), wholesale, inStock, min, max })}
                  className={`btn-secondary rounded-full px-4 py-2 text-xs font-bold ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
                >
                  Previous
                </Link>
                <span className="px-3 text-sm font-bold text-[var(--foreground)]">
                  Page {page} of {totalPages}
                </span>
                <Link
                  href={buildShopUrl({ q, category, sort, page: Math.min(page + 1, totalPages), wholesale, inStock, min, max })}
                  className={`btn-secondary rounded-full px-4 py-2 text-xs font-bold ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
                >
                  Next
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
