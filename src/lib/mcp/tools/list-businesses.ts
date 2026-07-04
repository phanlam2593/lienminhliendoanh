import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const BUSINESS_TYPES = ["food", "service", "stay", "travel", "creator", "freelance", "broker", "other"] as const;

export default defineTool({
  name: "list_businesses",
  title: "Danh sách doanh nghiệp",
  description:
    "Trả về danh sách doanh nghiệp đã được duyệt trong cộng đồng Liên Minh Liên Doanh. Có thể lọc theo loại hình.",
  inputSchema: {
    type: z.enum(BUSINESS_TYPES).optional().describe("Loại hình doanh nghiệp (tùy chọn)"),
    search: z.string().optional().describe("Từ khóa tìm trong tên doanh nghiệp (tùy chọn)"),
    limit: z.number().int().min(1).max(50).default(20).describe("Số lượng tối đa"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ type, search, limit }) => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = supabase
      .from("businesses")
      .select("id, name, type, description, address, phone, website, points, is_featured")
      .eq("status", "approved")
      .order("is_featured", { ascending: false })
      .order("points", { ascending: false })
      .limit(limit);
    if (type) q = q.eq("type", type);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { businesses: data ?? [] },
    };
  },
});
