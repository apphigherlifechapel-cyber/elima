import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import AdminProductsManager from "@/components/admin/AdminProductsManager";
import AdminCatalogManager from "@/components/admin/AdminCatalogManager";
import type { Prisma } from "@prisma/client";

type AdminProductsPageProps = {
  searchParams?: Promise<{ edit?: string }>;
};

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const params = (await searchParams) || {};
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div className="p-8">Unauthorized</div>;
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== "ADMIN") {
    return <div className="p-8">Forbidden</div>;
  }

  type ProductRow = Prisma.ProductGetPayload<{
    include: {
      category: { select: { name: true } };
      brand: { select: { name: true } };
      images: { select: { url: true }; take: 1; orderBy: { sortOrder: "asc" } };
    };
  }>;

  const [products, categories, brands] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        images: { select: { url: true }, take: 1, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.category.findMany({
      select: { id: true, name: true, slug: true, parentId: true },
      orderBy: { name: "asc" },
    }),
    prisma.brand.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const initialEditingProduct = params.edit ? (products as ProductRow[]).find((p: ProductRow) => p.id === params.edit) || null : null;

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Catalog</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Products</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Manage product content, pricing modes, MOQ rules, categories, and brands.</p>
      </section>

      <AdminProductsManager initialProducts={products} categories={categories} brands={brands} initialEditingProduct={initialEditingProduct} />
      <AdminCatalogManager initialCategories={categories} initialBrands={brands} />
    </div>
  );
}
