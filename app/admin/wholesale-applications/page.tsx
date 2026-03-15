import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import WholesaleActionButtons from "@/components/admin/WholesaleActionButtons";
import { User, WholesaleApplication } from "@prisma/client";

type WholesaleApplicationRow = WholesaleApplication & {
  user: Pick<User, "id" | "email" | "name">;
};

function tone(status: string) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "PENDING") return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "REJECTED") return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-[var(--surface-2)] text-[var(--muted-foreground)] border-[var(--border-soft)]";
}

export default async function AdminWholesaleApplicationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div className="p-8">Unauthorized</div>;
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== "ADMIN") {
    return <div className="p-8">Forbidden</div>;
  }

  const applications: WholesaleApplicationRow[] = await prisma.wholesaleApplication.findMany({
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Wholesale Onboarding</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Applications</h1>
      </section>

      <section className="soft-card overflow-x-auto rounded-2xl p-4 sm:p-5">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2">Applicant</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Website</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Submitted</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app: WholesaleApplicationRow) => (
              <tr key={app.id} className="border-t border-[var(--border-soft)] align-top">
                <td className="px-3 py-3">{app.user.email}</td>
                <td className="px-3 py-3 font-semibold">{app.companyName}</td>
                <td className="px-3 py-3">{app.website || "-"}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone(app.status)}`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-[var(--muted-foreground)]">{new Date(app.submittedAt).toLocaleString()}</td>
                <td className="px-3 py-3">
                  <WholesaleActionButtons userId={app.userId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
