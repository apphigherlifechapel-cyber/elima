import { prisma } from "@/lib/db/prisma";
import { ReturnRequestStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type ReturnRequest = {
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "COMPLETED";
  createdAt: string;
};

export async function createReturnRequest(input: Omit<ReturnRequest, "id" | "status" | "createdAt">) {
  const request = await prisma.returnRequest.create({
    data: {
      orderId: input.orderId,
      userId: input.userId,
      reason: input.reason,
      status: ReturnRequestStatus.SUBMITTED,
    },
  });

  return {
    id: request.id,
    orderId: request.orderId,
    userId: request.userId,
    reason: request.reason,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
  } as ReturnRequest;
}

export async function listReturnRequests(userId?: string) {
  const requests = await prisma.returnRequest.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "desc" },
  });

  type ReturnRequestRow = Prisma.ReturnRequestGetPayload<Record<string, never>>;

  return requests.map((request: ReturnRequestRow) => ({
    id: request.id,
    orderId: request.orderId,
    userId: request.userId,
    reason: request.reason,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
  })) as ReturnRequest[];
}

export async function updateReturnRequestStatus(id: string, status: ReturnRequest["status"]) {
  const updated = await prisma.returnRequest.update({
    where: { id },
    data: { status: status as ReturnRequestStatus },
  }).catch(() => null);

  if (!updated) return null;

  return {
    id: updated.id,
    orderId: updated.orderId,
    userId: updated.userId,
    reason: updated.reason,
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
  } as ReturnRequest;
}
