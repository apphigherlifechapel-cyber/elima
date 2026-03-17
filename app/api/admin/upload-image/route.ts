import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimitAsync, getClientIp } from "@/lib/utils/rate-limit";
import { isCloudinaryConfigured, uploadImageBuffer } from "@/lib/utils/cloudinary";
import { apiJson, createApiContext, logApiError, withUserContext } from "@/lib/utils/api-observability";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized", status: 401 as const };

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== "ADMIN") return { error: "Forbidden", status: 403 as const };
  return { user };
}

export async function POST(req: NextRequest) {
  const baseCtx = createApiContext(req, "/api/admin/upload-image");
  const ip = getClientIp(req.headers);
  const rate = await checkRateLimitAsync(`admin-upload-image:${ip}`, 30, 60_000);
  if (!rate.allowed) {
    return apiJson(baseCtx, { error: "Too many upload attempts. Try again shortly." }, { status: 429 });
  }

  try {
    const auth = await requireAdmin();
    if ("error" in auth) return apiJson(baseCtx, { error: auth.error }, { status: auth.status });
    const ctx = withUserContext(baseCtx, auth.user.id);

    if (!isCloudinaryConfigured()) {
      return apiJson(ctx, { error: "Cloudinary is not configured" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return apiJson(ctx, { error: "file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return apiJson(ctx, { error: "Only image uploads are allowed" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return apiJson(ctx, { error: "Image must be <= 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploaded = await uploadImageBuffer(buffer, `${Date.now()}-${file.name}`);

    await prisma.adminAuditLog.create({
      data: {
        userId: auth.user.id,
        action: "MEDIA_UPLOAD",
        entity: "ProductImage",
        entityId: uploaded.secure_url,
        changes: JSON.stringify({ fileName: file.name, size: file.size }),
      },
    });

    return apiJson(ctx, { url: uploaded.secure_url });
  } catch (error) {
    logApiError(baseCtx, "Failed to upload image", error);
    return apiJson(baseCtx, { error: "Image upload failed" }, { status: 500 });
  }
}
