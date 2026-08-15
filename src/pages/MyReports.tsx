import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Flag,
  Building2,
  Send,
  Shield,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/time";
import { toast } from "sonner";
import { LightboxImage } from "@/components/ImageLightbox";
import { Avatar } from "@/components/Avatar";
import { ProfileQuickView } from "@/components/ProfileQuickView";
import { useLanguage } from "@/lib/i18n";
import type { Report, ReportStatus } from "@/lib/types";

const REPORT_STATUS_CLS: Record<ReportStatus, string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/30",
  replied: "bg-primary/10 text-primary",
  resolved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30",
  closed: "bg-muted text-muted-foreground",
};
const REPORT_STATUS_KEY: Record<ReportStatus, string> = {
  pending: "reports.statusPending",
  replied: "reports.statusReplied",
  resolved: "reports.statusResolved",
  closed: "reports.statusClosed",
};

interface EnrichedReply {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  full_name: string;
  avatar_url: string | null;
  roleLabel: "admin" | "owner" | null;
}

type ReportRow = Report & { target_name?: string; target_href?: string | null };

function ReportCard({
  r,
  replies,
  canReply,
  onReplied,
  isOwnerOfTarget,
  reporterInfo,
}: {
  r: ReportRow;
  replies: EnrichedReply[];
  canReply?: boolean;
  onReplied: () => void;
  isOwnerOfTarget?: boolean;
  reporterInfo?: { full_name: string; avatar_url: string | null } | null;
}) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDesc, setEditDesc] = useState(r.description ?? "");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState("");
  const [quickUser, setQuickUser] = useState<string | null>(null);

  const isMine = user?.id === r.user_id;
  const canEditReport = isMine && r.status === "pending";
  const canDelete =
    (isMine && (r.status === "pending" || r.status === "resolved" || r.status === "closed")) ||
    (isOwnerOfTarget && (r.status === "resolved" || r.status === "closed"));

  const send = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    const { error } = await supabase
      .from("report_replies")
      .insert({ report_id: r.id, author_id: user.id, body: text.trim() });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    onReplied();
  };

  const saveEdit = async () => {
    const { error } = await supabase.from("reports").update({ description: editDesc.trim() }).eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditOpen(false);
    onReplied();
  };

  const deleteReport = async () => {
    if (!confirm("Xóa báo cáo này?")) return;
    const { error } = await supabase.from("reports").delete().eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onReplied();
  };

  const saveReplyEdit = async (replyId: string) => {
    const { error } = await supabase.from("report_replies").update({ body: editReplyText.trim() }).eq("id", replyId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingReplyId(null);
    onReplied();
  };

  const deleteReply = async (replyId: string) => {
    if (!confirm("Xóa phản hồi này?")) return;
    const { error } = await supabase.from("report_replies").delete().eq("id", replyId);
    if (error) {
      toast.error(error.message);
      return;
    }
    onReplied();
  };

  const markOwnerResolved = async () => {
    const { error } = await supabase
      .from("reports")
      .update({ owner_confirmed_resolved: true, reporter_satisfied: null })
      .eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã đánh dấu — đang chờ người báo cáo xác nhận");
    onReplied();
  };

  const confirmSatisfied = async (satisfied: boolean) => {
    const { error } = await supabase
      .from("reports")
      .update(
        satisfied
          ? { reporter_satisfied: true, status: "resolved" as ReportStatus, resolved: true }
          : { reporter_satisfied: false },
      )
      .eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(satisfied ? "Đã chốt xong — cảm ơn bạn!" : "Đã báo admin hỗ trợ thêm");
    onReplied();
  };

  // Gộp mọi trạng thái (đã giải quyết / đang tranh chấp / chờ xác nhận / nút đánh dấu)
  // vào MỘT khối duy nhất, hiện ngay dưới đầu thẻ — tránh rải rác nhiều banner như trước.
  const renderStatusArea = () => {
    if (r.status === "resolved") {
      return (
        <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Đã giải quyết xong
        </div>
      );
    }
    if (r.reporter_satisfied === false) {
      return (
        <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 space-y-1.5">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400">⏳ Đang chờ admin hỗ trợ xử lý thêm</p>
          {isOwnerOfTarget && (
            <button
              type="button"
              onClick={markOwnerResolved}
              className="text-[11px] px-2.5 py-1 rounded-full bg-card border font-semibold"
            >
              Đã xử lý thêm — đánh dấu lại
            </button>
          )}
        </div>
      );
    }
    if (isMine && r.owner_confirmed_resolved && r.reporter_satisfied === null) {
      return (
        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 space-y-1.5">
          <p className="text-xs font-semibold">
            Chủ doanh nghiệp cho biết đã xử lý xong. Bạn có hài lòng với cách giải quyết này không?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => confirmSatisfied(true)}
              className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1"
            >
              <ThumbsUp className="w-3.5 h-3.5" /> Hài lòng
            </button>
            <button
              type="button"
              onClick={() => confirmSatisfied(false)}
              className="flex-1 py-1.5 rounded-lg bg-muted text-xs font-semibold inline-flex items-center justify-center gap-1"
            >
              <ThumbsDown className="w-3.5 h-3.5" /> Chưa hài lòng
            </button>
          </div>
        </div>
      );
    }
    if (isOwnerOfTarget) {
      if (r.owner_confirmed_resolved && r.reporter_satisfied === null) {
        return (
          <p className="text-[11px] text-muted-foreground italic">
            Đã đánh dấu xử lý xong — đang chờ người báo cáo xác nhận…
          </p>
        );
      }
      return (
        <button
          type="button"
          onClick={markOwnerResolved}
          className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold inline-flex items-center gap-1 w-fit"
        >
          <CheckCircle2 className="w-3 h-3" /> Đánh dấu đã xử lý xong
        </button>
      );
    }
    return null;
  };

  return (
    <div className="bg-card rounded-xl overflow-hidden shadow-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full p-3 text-left space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold truncate">
            {r.target_href ? (
              <span
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  nav(r.target_href!);
                }}
                className="hover:text-primary hover:underline"
              >
                {r.target_name || t("reports.contentDeleted")}
              </span>
            ) : (
              r.target_name || t("reports.contentDeleted")
            )}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${REPORT_STATUS_CLS[r.status]}`}
          >
            {t(REPORT_STATUS_KEY[r.status])}
          </span>
        </div>
        {!editOpen && (
          <p className="text-xs text-muted-foreground truncate">
            {open ? r.description : `${r.description?.slice(0, 60)}${(r.description?.length ?? 0) > 60 ? "…" : ""}`} ·{" "}
            {timeAgo(r.created_at, lang)}
            {replies.length > 0 && ` · ${t("reports.repliesCount", { n: replies.length })}`}
          </p>
        )}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {reporterInfo && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/50">
              <button type="button" onClick={() => setQuickUser(r.user_id)} className="shrink-0">
                <Avatar path={reporterInfo.avatar_url} name={reporterInfo.full_name} size={32} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-muted-foreground">Người báo cáo</div>
                <button
                  type="button"
                  onClick={() => setQuickUser(r.user_id)}
                  className="text-xs font-semibold hover:text-primary hover:underline truncate block text-left"
                >
                  {reporterInfo.full_name}
                </button>
              </div>
              <Link
                to={`/tin-nhan/${r.user_id}`}
                aria-label="Nhắn tin"
                className="w-8 h-8 rounded-full border grid place-items-center shrink-0 hover:bg-card"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {renderStatusArea()}

          {editOpen ? (
            <div className="space-y-1.5">
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
                className="w-full px-2 py-1.5 rounded border bg-background text-xs"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  className="flex-1 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 py-1.5 rounded border text-xs"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            (canEditReport || canDelete) && (
              <div className="flex gap-2">
                {canEditReport && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditDesc(r.description ?? "");
                      setEditOpen(true);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded bg-muted font-semibold"
                  >
                    Sửa
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={deleteReport}
                    className="text-[11px] px-2.5 py-1 rounded bg-muted text-destructive font-semibold"
                  >
                    Xóa
                  </button>
                )}
              </div>
            )
          )}

          {r.photo_url && (
            <div className="h-32 rounded-lg overflow-hidden bg-muted">
              <LightboxImage path={r.photo_url} alt={t("reports.reportImage")} className="w-full h-full object-cover" />
            </div>
          )}

          {replies.length > 0 && (
            <div className="pt-1.5 mt-1.5 border-t space-y-2">
              {replies.map((rr) => (
                <div key={rr.id} className="flex items-start gap-2">
                  <button type="button" onClick={() => setQuickUser(rr.author_id)} className="shrink-0">
                    <Avatar path={rr.avatar_url} name={rr.full_name} size={26} />
                  </button>
                  <div className="flex-1 min-w-0 bg-accent rounded-lg p-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-0.5">
                      <button
                        type="button"
                        onClick={() => setQuickUser(rr.author_id)}
                        className="truncate hover:text-primary hover:underline"
                      >
                        {rr.full_name}
                      </button>
                      {rr.roleLabel && (
                        <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                          {rr.roleLabel === "admin" && <Shield className="w-2.5 h-2.5" />}
                          {rr.roleLabel === "admin" ? t("reports.roleAdmin") : t("reports.roleBusinessOwner")}
                        </span>
                      )}
                      <span className="text-muted-foreground font-normal ml-auto shrink-0">
                        {timeAgo(rr.created_at, lang)}
                      </span>
                    </div>
                    {editingReplyId === rr.id ? (
                      <div className="space-y-1">
                        <textarea
                          value={editReplyText}
                          onChange={(e) => setEditReplyText(e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 rounded border bg-background text-xs"
                        />
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => saveReplyEdit(rr.id)}
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
                        <div className="text-xs whitespace-pre-line break-words">{rr.body}</div>
                        {rr.author_id === user?.id && (
                          <div className="flex gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReplyId(rr.id);
                                setEditReplyText(rr.body);
                              }}
                              className="text-[10px] font-semibold text-muted-foreground"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteReply(rr.id)}
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
              ))}
            </div>
          )}

          {canReply && (
            <div className="flex items-center gap-1.5 pt-1">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={t("reports.replyPlaceholder")}
                className="flex-1 px-2.5 py-1.5 rounded-lg border bg-background text-xs"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || !text.trim()}
                className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0 disabled:opacity-50"
                aria-label="Gửi phản hồi"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
      <ProfileQuickView userId={quickUser} open={!!quickUser} onOpenChange={(v) => !v && setQuickUser(null)} />
    </div>
  );
}

export default function MyReports() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<"reports" | "business">("reports");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [bizReports, setBizReports] = useState<ReportRow[]>([]);
  const [replies, setReplies] = useState<Record<string, EnrichedReply[]>>({});
  const [reporters, setReporters] = useState<Map<string, { full_name: string; avatar_url: string | null }>>(new Map());
  const [myBizIds, setMyBizIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user?.id]);

  const load = async () => {
    setLoading(true);
    const [{ data: rp }, { data: myBiz }, { data: adminRows }] = await Promise.all([
      supabase
        .from("reports")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .range(0, 4999),
      supabase.from("businesses").select("id").eq("owner_id", user!.id).range(0, 4999),
      supabase.rpc("get_admin_user_ids"),
    ]);
    const adminIds = new Set((adminRows ?? []).map((r: any) => r.user_id));
    const reportRows = (rp as Report[]) ?? [];
    const bizIds = (myBiz ?? []).map((b: any) => b.id);
    setMyBizIds(bizIds);

    const { data: bizReportRows } = bizIds.length
      ? await supabase
          .from("reports")
          .select("*")
          .eq("target_type", "business")
          .in("target_id", bizIds)
          .order("created_at", { ascending: false })
          .range(0, 4999)
      : { data: [] as Report[] };

    const allReports = [...reportRows, ...((bizReportRows as Report[]) ?? [])];
    const targetBizIds = [...new Set(allReports.filter((r) => r.target_type === "business").map((r) => r.target_id))];
    const offerIds = [...new Set(allReports.filter((r) => r.target_type === "offer").map((r) => r.target_id))];
    const reviewIds = [...new Set(allReports.filter((r) => r.target_type === "review").map((r) => r.target_id))];

    const [{ data: biz }, { data: offs }, { data: revs }] = await Promise.all([
      targetBizIds.length
        ? supabase.from("businesses").select("id, name, owner_id").in("id", targetBizIds)
        : Promise.resolve({ data: [] as any[] }),
      offerIds.length
        ? supabase.from("offers").select("id, title, business_id").in("id", offerIds)
        : Promise.resolve({ data: [] as any[] }),
      reviewIds.length
        ? supabase.from("reviews").select("id, business_id, rating").in("id", reviewIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    // Review/offer cũng thuộc về 1 doanh nghiệp — nạp thêm tên DN cho những id chưa có trong `biz`.
    const relatedBizIds = [
      ...new Set([...(revs ?? []).map((r: any) => r.business_id), ...(offs ?? []).map((o: any) => o.business_id)]),
    ].filter((id) => !targetBizIds.includes(id));
    const { data: extraBiz } = relatedBizIds.length
      ? await supabase.from("businesses").select("id, name, owner_id").in("id", relatedBizIds)
      : { data: [] as any[] };

    const allBiz = [...(biz ?? []), ...(extraBiz ?? [])];
    const bizMap = new Map(allBiz.map((b: any) => [b.id, b.name]));
    const bizOwnerMap = new Map(allBiz.map((b: any) => [b.id, b.owner_id]));
    const offMap = new Map((offs ?? []).map((o: any) => [o.id, o]));
    const revMap = new Map((revs ?? []).map((r: any) => [r.id, r]));

    const withNames = (rows: Report[]): ReportRow[] =>
      rows.map((r) => {
        if (r.target_type === "business") {
          return { ...r, target_name: bizMap.get(r.target_id), target_href: `/dn/${r.target_id}` };
        }
        if (r.target_type === "offer") {
          const o = offMap.get(r.target_id);
          return { ...r, target_name: o?.title, target_href: o?.business_id ? `/dn/${o.business_id}` : null };
        }
        if (r.target_type === "review") {
          const rv = revMap.get(r.target_id);
          const bizName = rv ? bizMap.get(rv.business_id) : null;
          return {
            ...r,
            target_name: bizName ? `Đánh giá ${rv.rating}★ tại ${bizName}` : "Đánh giá",
            target_href: rv?.business_id ? `/dn/${rv.business_id}` : null,
          };
        }
        return r;
      });

    const reportsWithNames = withNames(reportRows);
    const bizReportsWithNames = withNames((bizReportRows as Report[]) ?? []);
    setReports(reportsWithNames);
    setBizReports(bizReportsWithNames);

    // Tên + avatar người báo cáo — chỉ cần cho tab "Về doanh nghiệp của tôi" để chủ doanh
    // nghiệp biết ai đã báo cáo.
    const reporterIds = [...new Set(bizReportsWithNames.map((r) => r.user_id))];
    const reporterMap = new Map<string, { full_name: string; avatar_url: string | null }>();
    if (reporterIds.length) {
      const { data: reporterProfs } = await supabase
        .from("profiles_public")
        .select("id, full_name, avatar_url")
        .in("id", reporterIds);
      (reporterProfs ?? []).forEach((p: any) =>
        reporterMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }),
      );
    }
    setReporters(reporterMap);

    if (allReports.length) {
      const { data: rep } = await supabase
        .from("report_replies")
        .select("*")
        .in(
          "report_id",
          allReports.map((r) => r.id),
        )
        .order("created_at", { ascending: true })
        .range(0, 4999);
      const replyRows = rep ?? [];
      const authorIds = [...new Set(replyRows.map((rr: any) => rr.author_id))];
      let profMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      if (authorIds.length) {
        const { data: profs } = await supabase
          .from("profiles_public")
          .select("id, full_name, avatar_url")
          .in("id", authorIds);
        (profs ?? []).forEach((p: any) => profMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));
      }
      const reportById = new Map(allReports.map((r) => [r.id, r]));
      const grouped: Record<string, EnrichedReply[]> = {};
      replyRows.forEach((rr: any) => {
        const prof = profMap.get(rr.author_id);
        const report = reportById.get(rr.report_id);
        let roleLabel: "admin" | "owner" | null = null;
        if (adminIds.has(rr.author_id)) roleLabel = "admin";
        else if (report?.target_type === "business" && bizOwnerMap.get(report.target_id) === rr.author_id)
          roleLabel = "owner";
        (grouped[rr.report_id] ??= []).push({
          id: rr.id,
          body: rr.body,
          created_at: rr.created_at,
          author_id: rr.author_id,
          full_name: prof?.full_name || t("messages.unknownUser"),
          avatar_url: prof?.avatar_url ?? null,
          roleLabel,
        });
      });
      setReplies(grouped);
    }

    setLoading(false);
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Link
          to="/ho-so"
          className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center"
          aria-label="Quay lại"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-lg">{t("reports.pageTitle")}</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setTab("reports")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${tab === "reports" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          <Flag className="w-3.5 h-3.5 inline mr-1" /> {t("reports.sent")} ({reports.length})
        </button>
        {myBizIds.length > 0 && (
          <button
            type="button"
            onClick={() => setTab("business")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${tab === "business" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <Building2 className="w-3.5 h-3.5 inline mr-1" /> {t("reports.aboutMyBusiness")} ({bizReports.length})
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t("common.loading")}</p>
      ) : tab === "reports" ? (
        reports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t("reports.noSentReports")}</p>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <ReportCard key={r.id} r={r} replies={replies[r.id] ?? []} canReply onReplied={load} />
            ))}
          </div>
        )
      ) : bizReports.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t("reports.noBusinessReports")}</p>
      ) : (
        <div className="space-y-2">
          {bizReports.map((r) => (
            <ReportCard
              key={r.id}
              r={r}
              replies={replies[r.id] ?? []}
              canReply
              isOwnerOfTarget
              reporterInfo={reporters.get(r.user_id) ?? null}
              onReplied={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
