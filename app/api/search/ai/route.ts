import { NextRequest, NextResponse } from "next/server";
import { semanticSearch } from "@/lib/ai-search";
import { createApiContext, logApi, logApiError, apiJson } from "@/lib/utils/api-observability";

export async function GET(req: NextRequest) {
  const ctx = createApiContext(req, "/api/search/ai");
  const query = req.nextUrl.searchParams.get("q");

  if (!query) {
    return apiJson(ctx, { error: "Query is required" }, { status: 400 });
  }

  try {
    logApi("info", ctx, "AI Search initiated", { query });
    const results = await semanticSearch(query);
    
    return apiJson(ctx, { results });
  } catch (error: any) {
    logApiError(ctx, "AI Search failed", error);
    return apiJson(ctx, { 
      error: error.message || "AI Search failed",
      code: "AI_SEARCH_ERROR"
    }, { status: 500 });
  }
}
