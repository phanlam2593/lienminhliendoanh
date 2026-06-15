import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { ReportReply, ReportStatus } from "@/lib/types";
import { Avatar } from "./Avatar";

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "Chờ xử lý",
  replied: "Đã phản hồi",
  resolved: "Đã xử lý",
  closed: "Đã đóng",
};
const STATUS_CLASS: Record<ReportStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  replied: "bg-sky-100 text-sky-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-muted text-foreground",
};

export function ReportStatusBadge({ s }: { s: ReportStatus }) {
  return <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_CLASS[s]}`}>{STATUS_LABEL[s]}</span>;
}

export function ReportRepliesPanel({
  reportId,
  canChangeStatus,
  currentStatus,
  onStatusChange,
}: {
  reportId: string;
  canChangeStatus?: boolean;
  currentStatus: ReportStatus;
  onStatusChange?: (s: ReportStatus) => void;
}) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<(ReportReply & { author?: { full_name: string; avatar_url: string | null } | null })[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("report_replies").select("*").eq("report_id", reportId).order("created_at");
    const rows = (data ?? []) as ReportReply[];
    const uids = [...new Set(rows.map(r => r.author_id))];
    let pm = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", uids);
      (profs ?? []).forEach((p: any) => pm.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));
    }
    setReplies(rows.map(r => ({ ...r, author: pm.get(r.author_id) ?? null })));
  };
  useEffect(() => { void load(); }, [reportId]);

  const send = async () => {
    if (!user || !body.trim()) return;
    setSending(true);
    const { error } = await supabase.from("report_replies").insert({ report_id: reportId, author_id: user.id, body: body.trim() });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setBody("");
    toast.success("Đã gửi phản hồi");
    void load();
    // server trigger may auto-bump to 'replied'
    if (currentStatus === "pending") onStatusChange?.("replied");
  };

  const updateStatus = async (s: ReportStatus) => {
    const { error } = await supabase.from("reports").update({
      status: s,
      resolved: s === "resolved" || s === "closed",
    }).eq("id", reportId);
    if (error) { toast.error(error.message); return; }
    onStatusChange?.(s);
  };

  return (
    <div className="space-y-2 mt-2">
      {replies.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {replies.map(r => (
            <div key={r.id} className="flex items-start gap-2 p-2 bg-accent rounded-lg">
              <Avatar path={r.author?.avatar_url} name={r.author?.full_name} size={24} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold">{r.author?.full_name || "Người dùng"}<span className="text-muted-foreground font-normal ml-1">{new Date(r.created_at).toLocaleString("vi-VN")}</span></div>
                <div className="text-xs whitespace-pre-line break-words">{r.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Nhập phản hồi…"
          className="flex-1 px-3 py-1.5 rounded-lg border bg-background text-xs"
        />
        <button onClick={send} disabled={sending || !body.trim()} className="px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 disabled:opacity-50">
          <Send className="w-3 h-3" /> Gửi
        </button>
      </div>

      {canChangeStatus && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground font-semibold">Trạng thái:</span>
          {(["pending", "replied", "resolved", "closed"] as ReportStatus[]).map(s => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${s === currentStatus ? STATUS_CLASS[s] + " border-transparent" : "bg-card text-muted-foreground border-border"}`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
