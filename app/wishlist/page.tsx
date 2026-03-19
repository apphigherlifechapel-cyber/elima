import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import Image from "next/image";
import Link from "next/link";

export default async function WishlistPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/login");

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          product: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } },
          variant: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const items = wishlist?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Wishlist</h1>
        <Link href="/shop" className="text-sm text-blue-600 hover:underline">Browse products</Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center shadow-sm">
          <p className="text-lg text-zinc-500">Your wishlist is empty.</p>
          <Link href="/shop" className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item: any) => {
            const product = item.product;
            const image = product.images[0];
            return (
              <div key={item.id} className="flex flex-col rounded-xl border bg-white shadow-sm overflow-hidden">
                <Link href={`/product/${product.slug}`} className="relative block h-44 bg-zinc-100">
                  {image ? (
                    <Image src={image.url} alt={image.altText ?? product.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-400 text-sm">No image</div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <Link href={`/product/${product.slug}`} className="font-semibold hover:text-blue-600">
                    {product.title}
                  </Link>
                  {item.variant && <p className="text-xs text-zinc-500 mt-0.5">Variant: {item.variant.sku}</p>}
                  <p className="mt-1 text-sm font-bold text-zinc-900">₦{product.retailPrice.toFixed(2)}</p>
                  <div className="mt-3 flex gap-2">
                    <WishlistRemoveButton itemId={item.id} />
                    <Link
                      href={`/product/${product.slug}`}
                      className="flex-1 rounded-lg border px-3 py-1.5 text-center text-xs font-semibold hover:bg-zinc-50"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Small inline client component for the remove button
function WishlistRemoveButton({ itemId }: { itemId: string }) {
  // We use a form action approach since this is a server component file
  return (
    <form
      action={async () => {
        "use server";
        await prisma.wishlistItem.delete({ where: { id: itemId } });
      }}
    >
      <button
        type="submit"
        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
      >
        Remove
      </button>
    </form>
  );
}
