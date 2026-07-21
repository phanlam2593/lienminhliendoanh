import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X, ImagePlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload";
import { StoredImage } from "./StoredImage";
import { useLanguage } from "@/lib/i18n";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  sort_order: number;
}

const MAX_PHOTOS = 8;

export function BusinessPhotoManager({ businessId }: { businessId: string }) {
  const { t } = useLanguage();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("business_photos")
      .select("id, url, caption, sort_order")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setPhotos((data ?? []) as Photo[]);
  };

  useEffect(() => {
    void load();
  }, [businessId]);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(t("gallery.maxPhotos", { n: MAX_PHOTOS }));
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      toast.info(t("gallery.onlyUploaded", { n: remaining, max: MAX_PHOTOS }));
    }
    setUploading(true);
    setProgress({ done: 0, total: list.length });
    let baseOrder = photos.length;
    for (let i = 0; i < list.length; i++) {
      try {
        const path = await uploadImage(list[i], "covers");
        const { error } = await supabase.from("business_photos").insert({
          business_id: businessId,
          url: path,
          sort_order: baseOrder + i,
        });
        if (error) throw error;
      } catch (e: any) {
        toast.error(e.message || t("gallery.uploadFail"));
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setUploading(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    await load();
    toast.success(t("gallery.updated"));
  };

  const removePhoto = async (id: string) => {
    if (!confirm(t("gallery.confirmDeletePhoto"))) return;
    const { error } = await supabase.from("business_photos").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPhotos((ps) => ps.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold">{t("gallery.title")}</div>
        <div className="text-[11px] text-muted-foreground">
          {photos.length}/{MAX_PHOTOS}
        </div>
      </div>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
              <StoredImage path={p.url} alt={p.caption || ""} className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(p.id)}
                aria-label={t("gallery.deletePhoto")}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white grid place-items-center hover:bg-destructive"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <label
        className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 border-dashed text-xs font-semibold cursor-pointer ${uploading || photos.length >= MAX_PHOTOS ? "opacity-60 pointer-events-none" : "hover:border-primary hover:text-primary"}`}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("gallery.uploading", { done: progress?.done ?? 0, total: progress?.total ?? 0 })}
          </>
        ) : (
          <>
            <ImagePlus className="w-4 h-4" />
            {photos.length >= MAX_PHOTOS ? t("gallery.maxReached") : t("gallery.uploadMultiple")}
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading || photos.length >= MAX_PHOTOS}
          onChange={(e) => void onFiles(e.target.files)}
        />
      </label>
    </div>
  );
}
