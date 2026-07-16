const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GIPHY_API_KEY");
    if (!apiKey) return json({ error: "Chưa cấu hình GIPHY_API_KEY" }, 500);

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();

    // Không có từ khoá → hiện GIF đang thịnh hành (trending)
    const endpoint = q
      ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=24&rating=pg-13&lang=vi`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=pg-13`;

    const res = await fetch(endpoint);
    if (!res.ok) return json({ error: "Giphy API lỗi" }, res.status);
    const data = await res.json();

    // Chỉ trả về đúng trường cần thiết — không lộ toàn bộ payload Giphy (giảm băng thông,
    // ẩn bớt chi tiết nội bộ không cần cho frontend)
    const results = (data.data ?? []).map((g: any) => ({
      id: g.id,
      preview: g.images?.fixed_height_small?.url ?? g.images?.fixed_height?.url,
      full: g.images?.fixed_height?.url ?? g.images?.original?.url,
      title: g.title || "GIF",
    }));

    return json({ results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
