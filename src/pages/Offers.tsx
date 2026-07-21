import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Offer } from "@/lib/types";

interface OfferWithBiz extends Offer {
  business?: { id: string; name: string; cover_url: string | null } | null;
}

const PAGE_SIZE = 20;

export default function Offers() {
  const [list, setList] = useState<OfferWithBiz[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async (pageNum: number, append: boolean) => {
    setLoadingMore(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count } = await supabase
      .from("offers")
      .select("*, business:businesses(id, name, cover_url)", { count: "exact" })
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(from, to);
    setTotal(count ?? 0);
    const newRows = (data ?? []) as OfferWithBiz[];
    setList((prev) => (append ? [...prev, ...newRows] : newRows));
    setHasMore(newRows.length === PAGE_SIZE);
    setLoadingMore(false);
    setLoading(false);
  };

  useEffect(() => {
    void load(0, false);
  }, []);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    void load(next, true);
  };

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-extrabold">Ưu đãi{total > 0 ? ` (${total})` : ""}</h1>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <OfferSkeleton key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <Tag className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm text-muted-foreground">Chưa có ưu đãi nào</p>
          <Link
            to="/kham-pha"
            className="inline-block px-4 py-2 rounded-full bg-gradient-brand text-primary-foreground text-sm font-semibold"
          >
            Khám phá doanh nghiệp
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((o) => (
            <Link
              key={o.id}
              to={`/dn/${o.business?.id}`}
              className="block p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-950/30 dark:to-sky-950/30 border border-emerald-100 dark:border-emerald-900 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-brand text-white grid place-items-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{o.title}</div>
                  {o.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{o.description}</div>
                  )}
                  <div className="text-xs text-primary font-semibold mt-1">{o.business?.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Đã có {o.claim_count ?? 0} người nhận ưu đãi này
                  </div>
                </div>
                {o.code && (
                  <div className="text-xs font-mono font-bold bg-card px-2 py-1 rounded border border-dashed">
                    {o.code}
                  </div>
                )}
              </div>
            </Link>
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2 rounded-lg border text-sm font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              {loadingMore ? "Đang tải…" : `Tải thêm (còn ${total - list.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function OfferSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-card border shadow-sm animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}
