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
      <div className="relative min-h-[85vh] overflow-hidden pb-16 pt-12 sm:pt-20">
        {/* Premium Background Elements */}
        <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 translate-y-[-20%] rounded-[100%] bg-[var(--primary-strong)] opacity-[0.04] blur-[120px]" />
        
        <div className="page-wrap relative">
          <div className="mx-auto max-w-2xl text-center">
            <div className="glass fade-in-up flex flex-col items-center justify-center rounded-[2.5rem] p-10 shadow-2xl shadow-black/[0.03] sm:p-14">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[var(--foreground)] text-[var(--background)] shadow-lg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-10 w-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              
              <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-5xl">Your Cart is Empty</h1>
              <p className="mt-4 max-w-md text-base font-medium text-[var(--muted-foreground)]">It looks like you haven&apos;t added any products to your cart yet. Discover our premium collections.</p>
              
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link href="/shop" className="btn-primary rounded-full px-8 py-3.5 text-sm font-black uppercase tracking-wider shadow-lg transition-transform active:scale-95">
                  Continue Shopping
                </Link>
                <Link href="/login" className="btn-secondary rounded-full px-8 py-3.5 text-sm font-black uppercase tracking-wider shadow-md transition-transform active:scale-95">
                  Sign in
                </Link>
              </div>
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

