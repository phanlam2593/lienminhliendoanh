import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Flag, Lightbulb, Building2, Send } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/time";
import { toast } from "sonner";
import { LightboxImage } from "@/components/ImageLightbox";
import type { Report, ReportReply, Suggestion, ReportStatus, SuggestionStatus } from "@/lib/types";

const REPORT_STATUS_LABEL: Record<ReportStatus, { label: string; cls: string }> = {
  pending: { label: "Chờ xử lý", cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/30" },
  replied: { label: "Đã phản hồi", cls: "bg-primary/10 text-primary" },
  resolved: { label: "Đã xử lý", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30" },
  closed: { label: "Đã đóng", cls: "bg-muted text-muted-foreground" },
};
const SUGGESTION_STATUS_LABEL: Record<SuggestionStatus, { label: string; cls: string }> = {
  pending: { label: "Chờ duyệt", cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/30" },
  approved: { label: "Đã duyệt", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30" },
  rejected: { label: "Bị từ chối", cls: "bg-red-50 text-red-700 dark:bg-red-950/30" },
};

function ReportCard({
  r,
  replies,
  canReply,
  onReplied,
}: {
  r: Report & { target_name?: string };
  replies: ReportReply[];
  canReply?: boolean;
  onReplied: () => void;
}) {
  const { user } = useAuth();
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
    <div className="bg-card rounded-xl p-3 space-y-1.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate">{r.target_name || "Nội dung đã xoá"}</span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${REPORT_STATUS_LABEL[r.status].cls}`}
        >
          {REPORT_STATUS_LABEL[r.status].label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{r.description}</p>
      {r.photo_url && (
        <div className="h-32 rounded-lg overflow-hidden bg-muted">
          <LightboxImage path={r.photo_url} alt="Ảnh báo cáo" className="w-full h-full object-cover" />
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</p>
      {replies.length > 0 && (
        <div className="pt-1.5 mt-1.5 border-t space-y-1.5">
          {replies.map((rr) => (
            <div key={rr.id} className="bg-accent rounded-lg p-2 text-xs">
              {rr.body}
              <div className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(rr.created_at)}</div>
            </div>
          ))}
        </div>
      )}
      {canReply && (
        <div className="flex items-center gap-1.5 pt-1">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Phản hồi khách hàng…"
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
  );
}

export default function MyReports() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"reports" | "suggestions" | "business">("reports");
  const [reports, setReports] = useState<(Report & { target_name?: string })[]>([]);
  const [bizReports, setBizReports] = useState<(Report & { target_name?: string })[]>([]);
  const [replies, setReplies] = useState<Record<string, ReportReply[]>>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [myBizIds, setMyBizIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user?.id]);

  const load = async () => {
    setLoading(true);
    const [{ data: rp }, { data: sg }, { data: myBiz }] = await Promise.all([
      supabase.from("reports").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("suggestions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("businesses").select("id").eq("owner_id", user!.id),
    ]);
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
    const targetBizIds = allReports.filter((r) => r.target_type === "business").map((r) => r.target_id);
    const offerIds = allReports.filter((r) => r.target_type === "offer").map((r) => r.target_id);
    const [{ data: biz }, { data: offs }] = await Promise.all([
      targetBizIds.length
        ? supabase.from("businesses").select("id, name").in("id", targetBizIds)
        : Promise.resolve({ data: [] as any[] }),
      offerIds.length
        ? supabase.from("offers").select("id, title").in("id", offerIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const bizMap = new Map((biz ?? []).map((b: any) => [b.id, b.name]));
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
      const grouped: Record<string, ReportReply[]> = {};
      (rep ?? []).forEach((rr: any) => {
        (grouped[rr.report_id] ??= []).push(rr);
      });
      setReplies(grouped);
    }

    setSuggestions((sg as Suggestion[]) ?? []);
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
        <h1 className="font-bold text-lg">Báo cáo & Góp ý của tôi</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTab("reports")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${tab === "reports" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          <Flag className="w-3.5 h-3.5 inline mr-1" /> Báo cáo ({reports.length})
        </button>
        <button
          onClick={() => setTab("suggestions")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold ${tab === "suggestions" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          <Lightbulb className="w-3.5 h-3.5 inline mr-1" /> Góp ý ({suggestions.length})
        </button>
        {myBizIds.length > 0 && (
          <button
            onClick={() => setTab("business")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${tab === "business" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <Building2 className="w-3.5 h-3.5 inline mr-1" /> Về DN của tôi ({bizReports.length})
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Đang tải…</p>
      ) : tab === "reports" ? (
        reports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Bạn chưa gửi báo cáo nào</p>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <ReportCard key={r.id} r={r} replies={replies[r.id] ?? []} onReplied={load} />
            ))}
          </div>
        )
      ) : tab === "business" ? (
        bizReports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Chưa có báo cáo nào về doanh nghiệp của bạn</p>
        ) : (
          <div className="space-y-2">
            {bizReports.map((r) => (
              <ReportCard key={r.id} r={r} replies={replies[r.id] ?? []} canReply onReplied={load} />
            ))}
          </div>
        )
      ) : suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Bạn chưa gửi góp ý nào</p>
      ) : (
        <div className="space-y-2">
          {suggestions.map((s) => (
            <div key={s.id} className="bg-card rounded-xl p-3 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold truncate">{s.business_name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${SUGGESTION_STATUS_LABEL[s.status].cls}`}
                >
                  {SUGGESTION_STATUS_LABEL[s.status].label}
                </span>
              </div>
              {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              <p className="text-[10px] text-muted-foreground">{timeAgo(s.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
