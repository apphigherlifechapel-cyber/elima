import { NextRequest } from "next/server";
import { chooseWarehouse, listWarehouses } from "@/lib/warehouse-routing";
import { apiJson, createApiContext, logApiError } from "@/lib/utils/api-observability";

export async function GET(req: NextRequest) {
  const ctx = createApiContext(req, "/api/advanced/warehouse-routing");
  try {
    const state = String(req.nextUrl.searchParams.get("state") || "");
    if (!state) {
      return apiJson(ctx, { warehouses: listWarehouses() });
    }
    return apiJson(ctx, { warehouse: chooseWarehouse(state), warehouses: listWarehouses() });
  } catch (error) {
    logApiError(ctx, "Failed to compute warehouse routing", error);
    return apiJson(ctx, { error: "Failed to route warehouse" }, { status: 500 });
  }
}
