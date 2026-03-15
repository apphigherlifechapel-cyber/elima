import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import CartViewClient from "@/components/cart/CartViewClient";
import GuestCartLoader from "@/components/cart/GuestCartLoader";
import { CartItem, Product, ProductVariant } from "@prisma/client";

export default async function CartPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return <GuestCartLoader />;
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return <GuestCartLoader />;

  const cart = await prisma.cart.findFirst({
    where: { userId: user.id },
    include: {
      items: { include: { product: true, variant: true } },
    },
  });

  if (!cart || cart.items.length === 0) {
    return (
      <div className="pb-16 pt-8 sm:pt-10">
        <div className="page-wrap">
          <div className="glass rounded-3xl p-8 text-center sm:p-12">
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Your Cart is Empty</h1>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">Add products to your cart to begin checkout.</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/shop" className="btn-primary rounded-full px-5 py-2.5 text-sm font-bold">
                Continue Shopping
              </Link>
              <Link href="/login" className="btn-secondary rounded-full px-5 py-2.5 text-sm font-bold">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CartViewClient
      mode="auth"
      items={cart.items.map((item: CartItem & { product: Product; variant: ProductVariant | null }) => ({
        id: item.id,
        product: { id: item.product.id, title: item.product.title },
        variant: item.variant ? { id: item.variant.id } : null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))}
    />
  );
}

