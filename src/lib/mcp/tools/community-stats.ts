import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "community_stats",
  title: "Thống kê cộng đồng",
  description: "Trả về số lượng thành viên, doanh nghiệp và ưu đãi đang hoạt động của Liên Minh Liên Doanh.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const [m, b, o] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("offers").select("*", { count: "exact", head: true }).eq("status", "active"),
    ]);
    const stats = { members: m.count ?? 0, businesses: b.count ?? 0, offers: o.count ?? 0 };
    return {
      content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
      structuredContent: stats,
    };
  },
});
