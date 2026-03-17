import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";

export default async function WholesalePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/wholesale");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { wholesaleApplication: true }
  });

  if (!user || user.accountType !== "WHOLESALE" || user.wholesaleStatus !== "APPROVED") {
    return (
      <div className="page-container py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">Wholesale Access Restricted</h1>
          <p className="mt-6 text-lg text-zinc-600">
            This portal is exclusively for our approved B2B partners. If you are a retailer, please apply for a wholesale account.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/account" className="btn-primary rounded-full px-8 py-3 text-sm font-bold">
              Check Application Status
            </Link>
            <Link href="/" className="text-sm font-black uppercase tracking-widest text-zinc-900">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50">
      <div className="page-container py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-zinc-900">Elima B2B Portal</h1>
            <p className="mt-2 text-zinc-500 font-bold uppercase tracking-widest text-xs">Exclusively for {user.wholesaleApplication?.companyName}</p>
          </div>
          <div className="flex gap-4">
             <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Available Credit</p>
                <p className="text-lg font-black text-emerald-600">GH₵ 15,000.00</p>
             </div>
          </div>
        </header>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="lg:col-span-2 grid gap-6 sm:grid-cols-2">
            <Link href="/wholesale/catalog" className="group flex flex-col justify-between rounded-3xl border border-zinc-100 bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white transition-transform group-hover:scale-110">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-black text-zinc-900">Bulk Catalog</h3>
                <p className="mt-2 text-sm text-zinc-500 font-bold">Browse specialized B2B pricing and pack sizes.</p>
              </div>
              <div className="mt-8 flex items-center text-xs font-black uppercase tracking-widest text-zinc-900">
                Shop Now <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="ml-2 h-3 w-3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </Link>

            <Link href="/wholesale/orders" className="group flex flex-col justify-between rounded-3xl border border-zinc-100 bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 transition-transform group-hover:scale-110">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="mt-6 text-xl font-black text-zinc-900">B2B Order History</h3>
                <p className="mt-2 text-sm text-zinc-500 font-bold">Track bulk shipments and download invoices.</p>
              </div>
              <div className="mt-8 flex items-center text-xs font-black uppercase tracking-widest text-zinc-900">
                 View History <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="ml-2 h-3 w-3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </Link>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            <div className="rounded-3xl bg-zinc-900 p-8 text-white shadow-xl">
              <h3 className="text-lg font-black tracking-tight">Partner Perks</h3>
              <ul className="mt-6 space-y-4 text-sm font-bold text-zinc-400">
                <li className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4 text-emerald-400"><path d="M20 6L9 17l-5-5"/></svg>
                  Priority Global Support
                </li>
                <li className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4 text-emerald-400"><path d="M20 6L9 17l-5-5"/></svg>
                  Custom Branding Options
                </li>
                <li className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4 text-emerald-400"><path d="M20 6L9 17l-5-5"/></svg>
                  Net-30 Payment Terms
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
