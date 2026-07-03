import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoredImage } from "./StoredImage";

interface Photo { path: string; caption: string | null }

export function BusinessGallery({ businessId, coverPath }: { businessId: string; coverPath: string | null }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [idx, setIdx] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("business_photos")
        .select("url, caption, sort_order")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      setPhotos((data ?? []).map((p: any) => ({ path: p.url, caption: p.caption })));
    })();
  }, [businessId]);

  if (photos.length === 0) return null;

  const all: Photo[] = [{ path: coverPath || "", caption: null }, ...photos].filter(p => p.path);
  const thumbs = all.slice(0, 5);

  const close = () => setIdx(null);
  const prev = () => setIdx(i => (i === null ? null : (i - 1 + all.length) % all.length));
  const next = () => setIdx(i => (i === null ? null : (i + 1) % all.length));

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        {thumbs.map((p, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted snap-start ring-1 ring-border hover:ring-primary transition"
            aria-label={`Ảnh ${i + 1}`}
          >
            <StoredImage path={p.path} alt={p.caption || ""} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {idx !== null && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" onClick={close}>
          <button
            onClick={(e) => { e.stopPropagation(); close(); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white grid place-items-center hover:bg-white/20"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
          {all.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white grid place-items-center hover:bg-white/20"
                aria-label="Trước"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white grid place-items-center hover:bg-white/20"
                aria-label="Sau"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          <div className="max-w-full max-h-full p-6 flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <StoredImage path={all[idx].path} alt={all[idx].caption || ""} className="max-w-[90vw] max-h-[75vh] object-contain" />
            {all[idx].caption && (
              <div className="text-white/90 text-sm text-center max-w-lg">{all[idx].caption}</div>
            )}
            <div className="text-white/60 text-xs">{idx + 1} / {all.length}</div>
          </div>
        </div>
      )}
    </>
  );
}
