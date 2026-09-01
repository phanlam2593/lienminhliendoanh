import { useRef, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { uploadImage, ACCEPT } from "@/lib/upload";
import { toast } from "sonner";

interface WallPost {
  id: string;
  content: string | null;
  type: "text" | "image";
  image_url: string | null;
  created_at: string;
}

interface Props {
  onPosted: (post: WallPost) => void;
}

// Đăng bài NGAY trên tường cá nhân (bảng wall_posts riêng) — KHÔNG đăng lên Cộng đồng.
export function WallComposer({ onPosted }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [posting, setPosting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const pickFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearFile = () => {
    setFile(null);
    setPreview("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const post = async () => {
    if (!content.trim() && !file) return;
    setPosting(true);
    try {
      let image_url: string | null = null;
      if (file) image_url = await uploadImage(file, "wall", user.id);
      const { data, error } = await supabase
        .from("wall_posts")
        .insert({
          user_id: user.id,
          content: content.trim() || null,
          type: image_url ? "image" : "text",
          image_url,
        })
        .select("id, content, type, image_url, created_at")
        .single();
      if (error) throw error;
      onPosted(data as WallPost);
      setContent("");
      clearFile();
      toast.success(t("wall.postSuccess"));
    } catch (e: any) {
      toast.error(e.message || t("common.error"));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-3 shadow-sm space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, 1000))}
        placeholder={t("wall.composerPlaceholder")}
        rows={2}
        className="w-full px-3 py-2 rounded-lg border bg-background text-sm resize-none"
      />
      {preview && (
        <div className="relative inline-block">
          <img src={preview} alt="" className="max-h-40 rounded-xl" />
          <button
            type="button"
            onClick={clearFile}
            aria-label={t("common.delete")}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/60 text-white grid place-items-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center text-muted-foreground"
          aria-label={t("wall.addImage")}
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFile(f);
            e.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          onClick={post}
          disabled={posting || (!content.trim() && !file)}
          className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
        >
          {posting ? t("wall.posting") : t("wall.post")}
        </button>
      </div>
    </div>
  );
}
