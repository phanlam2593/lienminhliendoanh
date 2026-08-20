import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useCall } from "@/lib/call";
import { timeAgo } from "@/lib/time";
import { StoredImage } from "@/components/StoredImage";

interface CallRow {
  id: string;
  caller_id: string;
  callee_id: string;
  status: "answered" | "missed" | "declined" | "busy";
  duration_seconds: number | null;
  created_at: string;
}

interface OtherPerson {
  id: string;
  full_name: string | null;
  username: string;
  avatar_url: string | null;
}

const PAGE_SIZE = 30;

function MiniAvatar({ url, name }: { url: string | null; name: string | null }) {
  if (url) {
    return (
      <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
        <StoredImage path={url} alt={name || "avatar"} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-brand text-white grid place-items-center text-sm font-bold flex-shrink-0">
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function formatDuration(sec: number | null): string {
  if (!sec || sec <= 0) return "";
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

export default function CallHistory() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { startCall } = useCall();
  const nav = useNavigate();

  const [rows, setRows] = useState<CallRow[]>([]);
  const [people, setPeople] = useState<Map<string, OtherPerson>>(new Map());
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = async (pageNum: number, append: boolean) => {
    if (!user) return;
    setLoadingMore(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count } = await supabase
      .from("calls")
      .select("id, caller_id, callee_id, status, duration_seconds, created_at", { count: "exact" })
      .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .range(from, to);
    setTotal(count ?? 0);
    const newRows = (data ?? []) as CallRow[];

    const otherIds = [
      ...new Set(newRows.map((r) => (r.caller_id === user.id ? r.callee_id : r.caller_id))),
    ].filter((id) => !people.has(id));
    if (otherIds.length) {
      const { data: profs } = await supabase
        .from("profiles_public")
        .select("id, full_name, username, avatar_url")
        .in("id", otherIds);
      setPeople((prev) => {
        const next = new Map(prev);
        (profs ?? []).forEach((p: any) => next.set(p.id, p));
        return next;
      });
    }

    setRows((prev) => (append ? [...prev, ...newRows] : newRows));
    setHasMore(newRows.length === PAGE_SIZE);
    setLoadingMore(false);
    setInitialLoading(false);
  };

  useEffect(() => {
    setPage(0);
    void load(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    void load(next, true);
  };

  const statusLabel = (r: CallRow, isOutgoing: boolean) => {
    if (r.status === "answered") return formatDuration(r.duration_seconds) || t("callHistory.answered");
    if (r.status === "declined") return isOutgoing ? t("callHistory.declinedByThem") : t("callHistory.youDeclined");
    if (r.status === "busy") return t("callHistory.busy");
    return t("callHistory.missed");
  };

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-extrabold">{t("callHistory.title")}</h1>

      {initialLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-card border animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t("callHistory.empty")}</p>
      ) : (
        <div className="bg-card rounded-xl border divide-y divide-border overflow-hidden">
          {rows.map((r) => {
            const isOutgoing = r.caller_id === user?.id;
            const otherId = isOutgoing ? r.callee_id : r.caller_id;
            const other = people.get(otherId);
            const isMissedForMe = !isOutgoing && (r.status === "missed" || r.status === "busy");
            return (
              <button
                key={r.id}
                onClick={() => nav(`/tin-nhan/${otherId}`)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent transition"
              >
                <MiniAvatar url={other?.avatar_url ?? null} name={other?.full_name ?? other?.username ?? null} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold truncate ${isMissedForMe ? "text-destructive" : ""}`}>
                    {other?.full_name || other?.username || "…"}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {isOutgoing ? (
                      <PhoneOutgoing className="w-3 h-3 flex-shrink-0" />
                    ) : isMissedForMe ? (
                      <PhoneMissed className="w-3 h-3 flex-shrink-0 text-destructive" />
                    ) : (
                      <PhoneIncoming className="w-3 h-3 flex-shrink-0" />
                    )}
                    <span className="truncate">{statusLabel(r, isOutgoing)}</span>
                    <span>·</span>
                    <span className="flex-shrink-0">{timeAgo(r.created_at)}</span>
                  </div>
                </div>
                {other && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      startCall({ id: other.id, full_name: other.full_name, avatar_url: other.avatar_url });
                    }}
                    className="w-9 h-9 rounded-full bg-primary/10 text-primary grid place-items-center flex-shrink-0"
                    aria-label={t("call.startCall")}
                  >
                    <Phone className="w-4 h-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-2 rounded-lg border text-sm font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          {loadingMore ? t("common.loading") : t("common.loadMoreRemaining", { n: total - rows.length })}
        </button>
      )}
    </div>
  );
}
