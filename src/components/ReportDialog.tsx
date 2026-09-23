import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload";
import type { ReportTarget } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  targetType: ReportTarget;
  targetId: string;
}) {
  const { user, isApproved } = useAuth();
  const { t } = useLanguage();
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [toAdmin, setToAdmin] = useState(true);
  const [toBiz, setToBiz] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user || !isApproved) {
      toast.error(t("report.needApproved"));
      return;
    }
    if (!desc.trim()) {
      toast.error(t("report.needFields"));
      return;
    }
    setLoading(true);
    try {
      const path = file ? await uploadImage(file, "reports") : null;
      const { error } = await supabase.from("reports").insert({
        user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        description: desc,
        photo_url: path,
        send_to_admin: toAdmin,
        send_to_business: toBiz,
      });
      if (error) throw error;
      toast.success(t("report.sent"));
      onOpenChange(false);
      setDesc("");
      setFile(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("biz.report")}</DialogTitle>
        </DialogHeader>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={4}
          placeholder={t("report.descPlaceholder")}
          className="w-full px-3 py-2 rounded-lg border bg-card text-sm"
        />
        {/* 2 lựa chọn: chọn ảnh có sẵn hoặc chụp ảnh mới bằng camera */}
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            e.currentTarget.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            e.currentTarget.value = "";
          }}
        />
        {file ? (
          <div className="flex items-center gap-2 min-w-0 rounded-lg border px-2.5 py-1.5">
            <ImageIcon className="w-4 h-4 text-primary shrink-0" />
            <span className="flex-1 min-w-0 truncate text-xs">{file.name}</span>
            <button
              type="button"
              onClick={() => setFile(null)}
              aria-label={t("common.delete")}
              className="w-6 h-6 rounded-full hover:bg-accent grid place-items-center shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => libraryRef.current?.click()}
              className="flex-1 py-2 rounded-lg border border-dashed text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1.5"
            >
              <ImageIcon className="w-4 h-4" /> {t("biz.addPhoto")}
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex-1 py-2 rounded-lg border border-dashed text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1.5"
            >
              <Camera className="w-4 h-4" /> {t("chat.takePhoto")}
            </button>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground -mt-1">{t("report.photoOptional")}</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={toAdmin} onChange={(e) => setToAdmin(e.target.checked)} />{" "}
          {t("report.sendToAdmin")}
        </label>
        {targetType !== "review" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={toBiz} onChange={(e) => setToBiz(e.target.checked)} />{" "}
            {t("report.sendToBiz")}
          </label>
        )}
        <button
          disabled={loading}
          onClick={submit}
          className="w-full py-2.5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold"
        >
          {loading ? t("report.sending") : t("report.submit")}
        </button>
      </DialogContent>
    </Dialog>
  );
}
