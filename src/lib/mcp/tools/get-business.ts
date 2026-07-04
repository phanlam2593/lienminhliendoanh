import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "get_business",
  title: "Chi tiết doanh nghiệp",
  description: "Lấy thông tin chi tiết của một doanh nghiệp đã duyệt theo ID.",
  inputSchema: {
    id: z.string().uuid().describe("ID doanh nghiệp"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }) => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("businesses")
      .select(
        "id, name, type, description, hours_open, hours_close, phone, address, facebook_url, website_url, cover_url, tiktok_url, instagram_url, youtube_url, is_featured, points, level, created_at",
      )
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Không tìm thấy doanh nghiệp" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { business: data },
    };
  },
});
