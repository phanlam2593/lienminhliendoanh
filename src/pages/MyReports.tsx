import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Flag, Building2, Send, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/time";
import { toast } from "sonner";
import { LightboxImage } from "@/components/ImageLightbox";
import { Avatar } from "@/components/Avatar";
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
  roleLabel: "admin" | "owner" | null; // dịch tại nơi hiển thị qua t()
}

function ReportCard({
  r,
  replies,
  canReply,
  onReplied,
}: {
  r: Report & { target_name?: string };
  replies: EnrichedReply[];
  canReply?: boolean;
  onReplied: () => void;
}) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

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

  return (
    <div className="bg-card rounded-xl overflow-hidden shadow-sm">
      <button onClick={() => setOpen((o) => !o)} className="w-full p-3 text-left space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold truncate">{r.target_name || t("reports.contentDeleted")}</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${REPORT_STATUS_CLS[r.status]}`}
          >
            {t(REPORT_STATUS_KEY[r.status])}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {open ? r.description : `${r.description?.slice(0, 60)}${(r.description?.length ?? 0) > 60 ? "…" : ""}`} ·{" "}
          {timeAgo(r.created_at, lang)}
          {replies.length > 0 && ` · ${t("reports.repliesCount", { n: replies.length })}`}
        </p>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {r.photo_url && (
            <div className="h-32 rounded-lg overflow-hidden bg-muted">
              <LightboxImage path={r.photo_url} alt={t("reports.reportImage")} className="w-full h-full object-cover" />
            </div>
          )}
          {replies.length > 0 && (
            <div className="pt-1.5 mt-1.5 border-t space-y-2">
              {replies.map((rr) => (
                <div key={rr.id} className="flex items-start gap-2">
                  <Avatar path={rr.avatar_url} name={rr.full_name} size={26} />
                  <div className="flex-1 min-w-0 bg-accent rounded-lg p-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-0.5">
                      <span className="truncate">{rr.full_name}</span>
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
                    <div className="text-xs whitespace-pre-line break-words">{rr.body}</div>
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
                placeholder={t("reports.replyPlaceholder")}
                className="flex-1 px-2.5 py-1.5 rounded-lg border bg-background text-xs"
              />
              <button
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
    </div>
  );
}

export default function MyReports() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<"reports" | "business">("reports");
  const [reports, setReports] = useState<(Report & { target_name?: string })[]>([]);
  const [bizReports, setBizReports] = useState<(Report & { target_name?: string })[]>([]);
  const [replies, setReplies] = useState<Record<string, EnrichedReply[]>>({});
  const [myBizIds, setMyBizIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user?.id]);

  const load = async () => {
    setLoading(true);
    const [{ data: rp }, { data: myBiz }, { data: adminRows }] = await Promise.all([
      supabase.from("reports").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("businesses").select("id").eq("owner_id", user!.id),
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
      : { data: [] as Report[] };

    const allReports = [...reportRows, ...((bizReportRows as Report[]) ?? [])];
    const targetBizIds = [...new Set(allReports.filter((r) => r.target_type === "business").map((r) => r.target_id))];
    const offerIds = [...new Set(allReports.filter((r) => r.target_type === "offer").map((r) => r.target_id))];
    const [{ data: biz }, { data: offs }] = await Promise.all([
      targetBizIds.length
        ? supabase.from("businesses").select("id, name, owner_id").in("id", targetBizIds)
        : Promise.resolve({ data: [] as any[] }),
      offerIds.length
        ? supabase.from("offers").select("id, title").in("id", offerIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const bizMap = new Map((biz ?? []).map((b: any) => [b.id, b.name]));
    const bizOwnerMap = new Map((biz ?? []).map((b: any) => [b.id, b.owner_id]));
    const offMap = new Map((offs ?? []).map((o: any) => [o.id, o.title]));
    const withNames = (rows: Report[]) =>
      rows.map((r) => ({
        ...r,
        target_name: r.target_type === "business" ? bizMap.get(r.target_id) : offMap.get(r.target_id),
      }));
    setReports(withNames(reportRows));
    setBizReports(withNames((bizReportRows as Report[]) ?? []));

    if (allReports.length) {
      const { data: rep } = await supabase
        .from("report_replies")
        .select("*")
        .in(
          "report_id",
          allReports.map((r) => r.id),
        )
        .order("created_at", { ascending: true });
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
          onClick={() => setTab("reports")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${tab === "reports" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          <Flag className="w-3.5 h-3.5 inline mr-1" /> {t("reports.sent")} ({reports.length})
        </button>
        {myBizIds.length > 0 && (
          <button
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
            <ReportCard key={r.id} r={r} replies={replies[r.id] ?? []} canReply onReplied={load} />
          ))}
        </div>
      )}
    </div>
  );
}
