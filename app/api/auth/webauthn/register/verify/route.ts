import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { verifyRegistration } from "@/lib/auth/webauthn";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get("webauthn_registration_challenge")?.value;

    if (!expectedChallenge) {
      return NextResponse.json({ error: "Registration challenge expired or not found" }, { status: 400 });
    }

    const verification = await verifyRegistration(session.user.id, body, expectedChallenge);
    
    // Clear challenge cookie
    cookieStore.delete("webauthn_registration_challenge");

    if (verification.verified) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Registration verification failed" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
