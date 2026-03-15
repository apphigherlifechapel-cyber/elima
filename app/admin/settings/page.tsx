import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import SettingsManager from "@/components/admin/SettingsManager";
import BannersManager from "@/components/admin/BannersManager";

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return <div className="p-8">Unauthorized</div>;
  }

  const admin = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!admin || admin.role !== "ADMIN") {
    return <div className="p-8">Forbidden</div>;
  }

  const [settings, banners] = await Promise.all([
    prisma.setting.findMany({ orderBy: { key: "asc" }, take: 500 }),
    prisma.banner.findMany({ orderBy: [{ priority: "asc" }, { createdAt: "desc" }], take: 200 }),
  ]);

  return (
    <div className="space-y-6">
      <section className="soft-card rounded-2xl p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Configuration</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Settings & Banners</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Manage global platform settings and homepage merchandising banners.</p>
      </section>
      <SettingsManager initialSettings={settings} />
      <BannersManager initialBanners={banners} />
    </div>
  );
}
