import { useState, useEffect } from "react";
import { Link2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// --- Xu ly link trong tin nhan: tu bam duoc, tu nhung video Youtube, tu lay preview website
// (giong FB) --- Dung chung cho Tin nhan VA Cong dong, tach ra day de khong lap code.

export function linkifyContent(text: string) {
  const re = /(https?:\/\/[^\s]+)/g;
  const nodes: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index));
    const raw = m[0];
    const url = raw.replace(/[),.!?]+$/, "");
    const trail = raw.slice(url.length);
    nodes.push(
      <a
        key={`lnk-${key++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="underline break-all"
      >
        {url}
      </a>,
    );
    if (trail) nodes.push(trail);
    lastIndex = m.index + raw.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : text;
}

export function extractFirstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s]+/);
  if (!m) return null;
  return m[0].replace(/[),.!?]+$/, "");
}

export function getYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
    }
  } catch {
    /* khong phai URL hop le */
  }
  return null;
}

export function YoutubeEmbed({ videoId }: { videoId: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative w-64 aspect-video rounded-xl overflow-hidden bg-muted">
      {playing ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="w-full h-full relative block">
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="YouTube"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <span className="absolute inset-0 grid place-items-center bg-black/25">
            <span className="w-12 h-12 rounded-full bg-white/90 grid place-items-center">
              <Play className="w-6 h-6 ml-0.5" fill="black" stroke="black" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

export type LinkMetaData = { title?: string; description?: string; image?: string; siteName?: string; url: string };
export const linkPreviewCache = new Map<string, LinkMetaData | null>();

export function LinkPreviewCard({ url }: { url: string }) {
  const [meta, setMeta] = useState<LinkMetaData | null | undefined>(() => linkPreviewCache.get(url));

  useEffect(() => {
    if (linkPreviewCache.has(url)) {
      setMeta(linkPreviewCache.get(url) ?? null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("link-preview", { body: { url } });
      if (cancelled) return;
      const ok = !error && data && !data.error && (data.title || data.image);
      const result: LinkMetaData | null = ok ? (data as LinkMetaData) : null;
      linkPreviewCache.set(url, result);
      setMeta(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!meta) return null;

  let domain = "";
  try {
    domain = new URL(meta.url || url).hostname.replace(/^www\./, "");
  } catch {
    domain = url;
  }

  return (
    <a
      href={meta.url || url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-2 w-64 rounded-xl border bg-card overflow-hidden hover:opacity-90"
    >
      {meta.image ? (
        <img src={meta.image} alt="" className="w-14 h-14 object-cover shrink-0" loading="lazy" />
      ) : (
        <div className="w-14 h-14 shrink-0 bg-muted grid place-items-center">
          <Link2 className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 py-1.5 pr-2">
        {meta.title && <div className="text-xs font-semibold line-clamp-2">{meta.title}</div>}
        <div className="text-[10px] text-muted-foreground truncate mt-0.5">{domain}</div>
      </div>
    </a>
  );
}

export function ChatLinkPreview({ text }: { text: string }) {
  const url = extractFirstUrl(text);
  if (!url) return null;
  const ytId = getYoutubeId(url);
  if (ytId) return <YoutubeEmbed videoId={ytId} />;
  return <LinkPreviewCard url={url} />;
}
