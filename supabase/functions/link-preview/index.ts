const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Vai khoi IP/hostname noi bo khong cho fetch toi (chan SSRF co ban) - khong toan dien
// nhung du chan cac truong hop pho bien nhat.
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0" || h.endsWith(".local")) return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (h === "[::1]" || h === "::1") return true;
  return false;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMeta(html: string, pageUrl: string) {
  const get = (re: RegExp) => {
    const m = html.match(re);
    return m ? decodeEntities(m[1].trim()) : undefined;
  };
  const og = (name: string) =>
    get(new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]*content=["']([^"']*)["']`, "i")) ??
    get(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*property=["']og:${name}["']`, "i"));
  const twitter = (name: string) =>
    get(new RegExp(`<meta[^>]+name=["']twitter:${name}["'][^>]*content=["']([^"']*)["']`, "i")) ??
    get(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*name=["']twitter:${name}["']`, "i"));

  const title = og("title") ?? get(/<title[^>]*>([^<]*)<\/title>/i) ?? twitter("title");
  const description =
    og("description") ??
    twitter("description") ??
    get(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i);
  let image = og("image") ?? twitter("image");
  const siteName = og("site_name");

  if (image) {
    try {
      image = new URL(image, pageUrl).toString();
    } catch {
      image = undefined;
    }
  }
  return { title, description, image, siteName };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = (body?.url ?? "").toString().trim();
    if (!rawUrl) return json({ error: "Thieu url" }, 400);

    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      return json({ error: "URL khong hop le" }, 400);
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return json({ error: "Chi ho tro http/https" }, 400);
    }
    if (isBlockedHost(target.hostname)) {
      return json({ error: "Khong duoc phep" }, 400);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    let res: Response;
    try {
      res = await fetch(target.toString(), {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; LomiLinkPreview/1.0; +https://liendoanh.world) facebookexternalhit/1.1",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) return json({ error: `Fetch loi ${res.status}` }, 200);
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return json({ error: "Khong phai trang HTML" }, 200);

    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let received = 0;
      while (received < 300_000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        received += value?.length ?? 0;
      }
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
    } else {
      html = await res.text();
    }

    const meta = extractMeta(html, res.url || target.toString());
    return json({ ...meta, url: res.url || target.toString() });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? "Loi khong ro" }, 200);
  }
});
