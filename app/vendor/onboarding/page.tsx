import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { VendorRegistrationForm } from "@/components/vendor/VendorRegistrationForm";
import Link from "next/link";

export default async function VendorOnboardingPage() {
  const session = await getServerSession(authOptions);
  
  const user = session?.user?.email 
    ? await prisma.user.findUnique({ 
        where: { email: session.user.email },
        include: { vendorApplications: { orderBy: { createdAt: 'desc' }, take: 1 } } 
      })
    : null;

  const currentApp = user?.vendorApplications[0];

  return (
    <div className="min-h-screen bg-zinc-50/30">
      <div className="page-container py-24">
        <div className="mx-auto max-w-xl">
          <header className="text-center mb-12">
            <Link href="/" className="inline-block mb-8 text-xs font-black uppercase tracking-tighter filter grayscale hover:grayscale-0 transition-all">
              Elima <span className="text-emerald-600">Store</span>
            </Link>
          </header>

          {currentApp?.status === "PENDING" ? (
             <div className="rounded-3xl bg-white p-12 text-center border border-zinc-100 shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 mb-6">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-8 w-8">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-zinc-900">Application Under Review</h2>
                <p className="mt-4 text-zinc-500 font-bold leading-relaxed">
                   We've received your application for **{currentApp.companyName}**. Our curators are currently reviewing your store details. 
                </p>
                <div className="mt-8 pt-8 border-t border-zinc-50">
                   <Link href="/account" className="text-sm font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700">
                     Check Account Settings
                   </Link>
                </div>
             </div>
          ) : (
            <VendorRegistrationForm />
          )}
        </div>
      </div>
    </div>
  );
}
