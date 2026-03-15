import { prisma } from "@/lib/db/prisma";

export type CreditProfile = {
  userId: string;
  limit: number;
  used: number;
  termsDays: 15 | 30;
  active: boolean;
};

export async function getCreditProfile(userId: string) {
  const profile = await prisma.creditProfile.findUnique({ where: { userId } });
  if (!profile) return null;

  return {
    userId: profile.userId,
    limit: profile.limit,
    used: profile.used,
    termsDays: (profile.termsDays === 15 ? 15 : 30) as 15 | 30,
    active: profile.active,
  } as CreditProfile;
}

export async function setCreditProfile(profile: CreditProfile) {
  const saved = await prisma.creditProfile.upsert({
    where: { userId: profile.userId },
    update: {
      limit: profile.limit,
      used: profile.used,
      termsDays: profile.termsDays,
      active: profile.active,
    },
    create: {
      userId: profile.userId,
      limit: profile.limit,
      used: profile.used,
      termsDays: profile.termsDays,
      active: profile.active,
    },
  });

  return {
    userId: saved.userId,
    limit: saved.limit,
    used: saved.used,
    termsDays: (saved.termsDays === 15 ? 15 : 30) as 15 | 30,
    active: saved.active,
  } as CreditProfile;
}

export async function evaluateCreditAvailability(userId: string, amount: number) {
  const profile = await getCreditProfile(userId);
  if (!profile || !profile.active) {
    return { allowed: false, reason: "No active credit profile" };
  }
  const remaining = profile.limit - profile.used;
  if (amount > remaining) {
    return { allowed: false, reason: "Credit limit exceeded" };
  }
  return { allowed: true, reason: "Eligible", remaining };
}
