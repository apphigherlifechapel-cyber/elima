import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { CheckoutProcess } from "@/components/checkout/CheckoutProcess";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { formatCedis } from "@/lib/utils/currency";

type CheckoutPageProps = {
  searchParams: Promise<{ productId?: string; variantId?: string; quantity?: string; guest?: string }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  const guestProductId = params.productId ? String(params.productId) : "";
  const guestVariantId = params.variantId ? String(params.variantId) : null;
  const guestQuantity = Math.max(1, Number(params.quantity || 1));
  const guestCartMode = params.guest === "1";

  if (!session?.user?.email) {
    if (guestCartMode) {
      return (
        <div className="pb-16 pt-8 sm:pt-10">
          <div className="page-wrap">
            <section className="soft-card fade-in-up rounded-2xl p-5 sm:p-6">
              <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Guest Checkout</h1>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Complete your shipping details and payment for items in your guest cart.</p>
            </section>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="soft-card fade-in-up stagger-1 rounded-2xl p-5">
                <h2 className="text-xl font-black text-[var(--foreground)]">Guest Cart</h2>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">Items from browser storage will be submitted securely on checkout.</p>
              </div>
              <div className="fade-in-up stagger-2">
                <CheckoutProcess guestMode guestItems={[]} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!guestProductId) return notFound();

    const product = await prisma.product.findUnique({ where: { id: guestProductId } });
    if (!product) return notFound();

    const variant = guestVariantId ? await prisma.productVariant.findUnique({ where: { id: guestVariantId } }) : null;
    const unitPrice = variant ? Number(variant.retailPrice) : Number(product.retailPrice);
    const subtotal = unitPrice * guestQuantity;
    const shippingCost = 800;

    return (
      <div className="pb-16 pt-8 sm:pt-10">
        <div className="page-wrap">
          <section className="soft-card fade-in-up rounded-2xl p-5 sm:p-6">
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Guest Checkout</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Fast checkout for a single item.</p>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="soft-card fade-in-up stagger-1 rounded-2xl p-5">
              <h2 className="text-xl font-black text-[var(--foreground)]">Order Summary</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex justify-between text-[var(--muted-foreground)]">
                  <span>{product.title} x {guestQuantity}</span>
                  <span>{formatCedis(subtotal)}</span>
                </li>
              </ul>
              <p className="mt-4 text-sm font-bold text-[var(--foreground)]">Subtotal: {formatCedis(subtotal)}</p>
              <p className="mt-1 text-sm font-bold text-[var(--foreground)]">Shipping: {formatCedis(shippingCost)}</p>
              <p className="mt-1 text-lg font-black text-[var(--foreground)]">Total: {formatCedis(subtotal + shippingCost)}</p>
            </div>

            <div className="fade-in-up stagger-2">
              <CheckoutProcess guestMode guestItems={[{ productId: product.id, variantId: variant?.id || null, quantity: guestQuantity, unitPrice }]} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return notFound();

  const cart = await prisma.cart.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true, variant: true } } },
  });

  if (!cart || cart.items.length === 0) {
    return (
      <div className="pb-16 pt-8 sm:pt-10">
        <div className="page-wrap">
          <div className="glass fade-in-up rounded-3xl p-8 text-center sm:p-12">
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">Checkout</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Your cart is empty. Add products first.</p>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = cart.items.reduce((acc: number, item: { quantity: number; unitPrice: number }) => acc + item.quantity * item.unitPrice, 0);
  const shippingCost = 800;

  return (
    <div className="pb-16 pt-8 sm:pt-10">
      <div className="page-wrap">
        <section className="soft-card fade-in-up rounded-2xl p-5 sm:p-6">
          <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] sm:text-4xl">Checkout</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Secure payment and fast delivery across Ghana.</p>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="soft-card fade-in-up stagger-1 rounded-2xl p-5">
            <h2 className="text-xl font-black text-[var(--foreground)]">Order Summary</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {cart.items.map((item: { id: string; product: { title: string }; quantity: number; unitPrice: number }) => (
                <li key={item.id} className="flex justify-between text-[var(--muted-foreground)]">
                  <span>{item.product.title} x {item.quantity}</span>
                  <span>{formatCedis(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-bold text-[var(--foreground)]">Subtotal: {formatCedis(subtotal)}</p>
            <p className="mt-1 text-sm font-bold text-[var(--foreground)]">Shipping: {formatCedis(shippingCost)}</p>
            <p className="mt-1 text-lg font-black text-[var(--foreground)]">Total: {formatCedis(subtotal + shippingCost)}</p>
          </div>

          <div className="fade-in-up stagger-2">
            <CheckoutProcess />
          </div>
        </div>
      </div>
    </div>
  );
}
