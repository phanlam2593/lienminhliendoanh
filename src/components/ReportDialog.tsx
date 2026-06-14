import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload";
import type { ReportTarget } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export function ReportDialog({ open, onOpenChange, targetType, targetId }: {
  open: boolean; onOpenChange: (b: boolean) => void; targetType: ReportTarget; targetId: string;
}) {
  const { user, isApproved } = useAuth();
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [toAdmin, setToAdmin] = useState(true);
  const [toBiz, setToBiz] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user || !isApproved) { toast.error("Cần tài khoản đã duyệt"); return; }
    if (!desc.trim() || !file) { toast.error("Cần mô tả và ảnh"); return; }
    setLoading(true);
    try {
      const path = await uploadImage(file, "reports");
      const { error } = await supabase.from("reports").insert({
        user_id: user.id, target_type: targetType, target_id: targetId,
        description: desc, photo_url: path, send_to_admin: toAdmin, send_to_business: toBiz,
      });
      if (error) throw error;
      toast.success("Đã gửi báo cáo");
      onOpenChange(false);
      setDesc(""); setFile(null);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Báo cáo</DialogTitle></DialogHeader>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} placeholder="Mô tả vấn đề *"
          className="w-full px-3 py-2 rounded-lg border bg-card text-sm" />
        <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={toAdmin} onChange={e => setToAdmin(e.target.checked)} /> Gửi cho Admin</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={toBiz} onChange={e => setToBiz(e.target.checked)} /> Gửi cho Doanh nghiệp</label>
        <button disabled={loading} onClick={submit} className="w-full py-2.5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold">
          {loading ? "Đang gửi…" : "Gửi báo cáo"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
