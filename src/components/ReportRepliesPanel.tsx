import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import type { ReportReply, ReportStatus } from "@/lib/types";
import { Avatar } from "./Avatar";
import { ProfileQuickView } from "./ProfileQuickView";

const STATUS_CLASS: Record<ReportStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  replied: "bg-sky-100 text-sky-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-muted text-foreground",
};

function useStatusLabel(): Record<ReportStatus, string> {
  const { t } = useLanguage();
  return {
    pending: t("reports.statusPending"),
    replied: t("reports.statusReplied"),
    resolved: t("reports.statusResolved"),
    closed: t("reports.statusClosed"),
  };
}

export function ReportStatusBadge({ s }: { s: ReportStatus }) {
  const STATUS_LABEL = useStatusLabel();
  return (
    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_CLASS[s]}`}>
      {STATUS_LABEL[s]}
    </span>
  );
}

export function ReportRepliesPanel({
  reportId,
  canChangeStatus,
  currentStatus,
  reporterSatisfied,
  onStatusChange,
}: {
  reportId: string;
  canChangeStatus?: boolean;
  currentStatus: ReportStatus;
  reporterSatisfied?: boolean | null;
  onStatusChange?: (s: ReportStatus) => void;
}) {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const STATUS_LABEL = useStatusLabel();
  const [replies, setReplies] = useState<
    (ReportReply & { author?: { full_name: string; avatar_url: string | null } | null })[]
  >([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [quickUser, setQuickUser] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const load = async () => {
    const { data } = await supabase.from("report_replies").select("*").eq("report_id", reportId).order("created_at");
    const rows = (data ?? []) as ReportReply[];
    const uids = [...new Set(rows.map((r) => r.author_id))];
    let pm = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles_public").select("id, full_name, avatar_url").in("id", uids);
      (profs ?? []).forEach((p: any) => pm.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));
    }
    setReplies(rows.map((r) => ({ ...r, author: pm.get(r.author_id) ?? null })));
  };
  useEffect(() => {
    void load();
  }, [reportId]);

  const send = async () => {
    if (!user || !body.trim()) return;
    setSending(true);
    const { error } = await supabase
      .from("report_replies")
      .insert({ report_id: reportId, author_id: user.id, body: body.trim() });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    toast.success(t("biz.replySent"));
    void load();
    if (currentStatus === "pending") onStatusChange?.("replied");
  };

  const saveReplyEdit = async (replyId: string) => {
    const { error } = await supabase.from("report_replies").update({ body: editText.trim() }).eq("id", replyId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingReplyId(null);
    void load();
  };

  const deleteReply = async (replyId: string) => {
    if (!confirm("Xóa phản hồi này?")) return;
    const { error } = await supabase.from("report_replies").delete().eq("id", replyId);
    if (error) {
      toast.error(error.message);
      return;
    }
    void load();
  };

  const updateStatus = async (s: ReportStatus) => {
    const { error } = await supabase
      .from("reports")
      .update({
        status: s,
        resolved: s === "resolved" || s === "closed",
      })
      .eq("id", reportId);
    if (error) {
      toast.error(error.message);
      return;
    }
    onStatusChange?.(s);
  };

  return (
    <div className="space-y-2 mt-2">
      {reporterSatisfied === false && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Người báo cáo chưa hài lòng với cách xử lý — cần admin hỗ
          trợ thêm
        </div>
      )}
      {replies.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {replies.map((r) => {
            const canManage = isAdmin || r.author_id === user?.id;
            return (
              <div key={r.id} className="flex items-start gap-2 p-2 bg-accent rounded-lg">
                <button type="button" onClick={() => setQuickUser(r.author_id)} className="shrink-0">
                  <Avatar path={r.author?.avatar_url} name={r.author?.full_name} size={24} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setQuickUser(r.author_id)}
                      className="hover:text-primary hover:underline"
                    >
                      {r.author?.full_name || t("messages.unknownUser")}
                    </button>
                    <span className="text-muted-foreground font-normal ml-1">
                      {new Date(r.created_at).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  {editingReplyId === r.id ? (
                    <div className="space-y-1 mt-0.5">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 rounded border bg-background text-xs"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => saveReplyEdit(r.id)}
                          className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-semibold"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingReplyId(null)}
                          className="px-2 py-0.5 rounded border text-[10px]"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs whitespace-pre-line break-words">{r.body}</div>
                      {canManage && (
                        <div className="flex gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReplyId(r.id);
                              setEditText(r.body);
                            }}
                            className="text-[10px] font-semibold text-muted-foreground"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteReply(r.id)}
                            className="text-[10px] font-semibold text-destructive"
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-1.5">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={t("reports.replyPlaceholder")}
          className="flex-1 px-3 py-1.5 rounded-lg border bg-background text-xs"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !body.trim()}
          className="px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
        >
          <Send className="w-3 h-3" /> {t("common.send")}
        </button>
      </div>

      {canChangeStatus && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground font-semibold">{t("reports.statusLabel")}</span>
            {(["pending", "resolved", "closed"] as ReportStatus[]).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => updateStatus(s)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${s === currentStatus ? STATUS_CLASS[s] + " border-transparent" : "bg-card text-muted-foreground border-border"}`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">{t("reports.statusHint")}</p>
        </div>
      )}
      <ProfileQuickView userId={quickUser} open={!!quickUser} onOpenChange={(v) => !v && setQuickUser(null)} />
    </div>
  );
}
