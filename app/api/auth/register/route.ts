import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimitAsync, getClientIp } from "@/lib/utils/rate-limit";
import { apiJson, createApiContext, logApiError } from "@/lib/utils/api-observability";

export async function POST(req: NextRequest) {
  const ctx = createApiContext(req, "/api/auth/register");
  const ip = getClientIp(req.headers);
  const rate = await checkRateLimitAsync(`auth-register:${ip}`, 20, 60_000);
  if (!rate.allowed) {
    return apiJson(ctx, { error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return apiJson(ctx, { error: "Email and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return apiJson(ctx, { error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiJson(ctx, { error: "Email already in use" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name: name || null, email, password: hashed },
    });

    return apiJson(ctx, { id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (error) {
    logApiError(ctx, "Registration failed", error);
    return apiJson(ctx, { error: "Registration failed" }, { status: 500 });
  }
}

