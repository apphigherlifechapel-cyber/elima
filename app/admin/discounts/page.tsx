import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import DiscountManager from "@/components/admin/DiscountManager";

export default async function AdminDiscountsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div className="p-8">Unauthorized</div>;
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== "ADMIN") {
    return <div className="p-8">Forbidden</div>;
  }

  const discounts = await prisma.discount.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Campaigns</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Discounts</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Create and control promotional discount rules for retail and wholesale flows.</p>
      </section>
      <DiscountManager initialDiscounts={discounts} />
    </div>
  );
}
