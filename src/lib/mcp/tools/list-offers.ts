import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_offers",
  title: "Danh sách ưu đãi",
  description: "Trả về các ưu đãi đang hoạt động trong cộng đồng Liên Minh Liên Doanh.",
  inputSchema: {
    business_id: z.string().uuid().optional().describe("Lọc theo ID doanh nghiệp (tùy chọn)"),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ business_id, limit }) => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = supabase
      .from("offers")
      .select("id, business_id, title, description, discount, expires_at, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (business_id) q = q.eq("business_id", business_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { offers: data ?? [] },
    };
  },
});
