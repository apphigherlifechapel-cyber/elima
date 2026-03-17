import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { ProductListingForm } from "@/components/vendor/ProductListingForm";
import Link from "next/link";

export default async function NewVendorProductPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { vendor: true }
  });

  if (!user?.vendor || !user.vendor.isVerified) redirect("/vendor/dashboard");

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <div className="min-h-screen bg-zinc-50/30">
      <div className="page-container py-24">
        <div className="mb-12">
          <Link href="/vendor/dashboard" className="text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>
            Dashboard
          </Link>
        </div>
        <ProductListingForm categories={categories} />
      </div>
    </div>
  );
}
