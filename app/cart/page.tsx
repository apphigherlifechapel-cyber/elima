import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { redirect } from "next/navigation";

export default async function CartPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Cart</h1>
        <p>User not found. <Link href="/login" className="text-blue-600 hover:underline">Sign in again</Link></p>
      </div>
    );
  }

  const cart = await prisma.cart.findFirst({
    where: { userId: user.id },
    include: {
      items: { include: { product: true, variant: true } },
    },
  });

  if (!cart || cart.items.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Cart</h1>
        <p className="mt-2 text-zinc-600">Your cart is empty.</p>
        <Link href="/shop" className="mt-4 inline-block text-blue-600 hover:underline">Continue shopping</Link>
      </div>
    );
  }

  const total = cart.items.reduce((acc: number, item: { quantity: number; unitPrice: number }) => acc + item.quantity * item.unitPrice, 0);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Your Cart</h1>
      <div className="space-y-3">
        {cart.items.map((item: { id: string; product: { title: string }; variant?: { sku?: string } | null; quantity: number; unitPrice: number }) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
            <div>
              <p className="font-semibold">{item.product.title}</p>
              {item.variant && <p className="text-xs text-zinc-500">SKU: {item.variant.sku}</p>}
              <p className="mt-1 text-sm text-zinc-600">Qty: {item.quantity} × ₦{item.unitPrice.toFixed(2)}</p>
            </div>
            <p className="font-bold text-zinc-900">₦{(item.unitPrice * item.quantity).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Order total</span>
          <span className="text-xl font-bold text-zinc-900">₦{total.toFixed(2)}</span>
        </div>
        <Link
          href="/checkout"
          className="mt-4 block w-full rounded-lg bg-blue-600 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
        >
          Proceed to Checkout
        </Link>
        <Link href="/shop" className="mt-2 block text-center text-sm text-zinc-500 hover:underline">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
