import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";

interface Candidate {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  visits: number;
  lastVisit: string | null;
  isRegular: boolean;
}

export function BusinessRegularsPanel({ businessId }: { businessId: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: claims }, { data: regulars }] = await Promise.all([
        supabase
          .from("offer_claims")
          .select("user_id, claimed_at, offers!inner(business_id)")
          .eq("offers.business_id", businessId),
        supabase
          .from("business_regulars")
          .select("member_id, visit_count, last_visit_at")
          .eq("business_id", businessId),
      ]);

      const regularMap = new Map((regulars ?? []).map((r: any) => [r.member_id, r]));
      const byUser = new Map<string, { visits: number; lastVisit: string | null }>();
      for (const c of claims ?? []) {
        const cur = byUser.get(c.user_id) ?? { visits: 0, lastVisit: null };
        cur.visits += 1;
        if (!cur.lastVisit || c.claimed_at > cur.lastVisit) cur.lastVisit = c.claimed_at;
        byUser.set(c.user_id, cur);
      }
      // Gộp cả khách đã đánh dấu tay dù chưa claim ưu đãi nào
      for (const uid of regularMap.keys()) {
        if (!byUser.has(uid)) byUser.set(uid, { visits: 0, lastVisit: null });
      }
      const userIds = [...byUser.keys()];
      if (userIds.length === 0) {
        setRows([]);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", userIds);

      const result: Candidate[] = (profiles ?? [])
        .map((p: any) => {
          const v = byUser.get(p.id)!;
          const reg = regularMap.get(p.id) as any;
          return {
            id: p.id,
            full_name: p.full_name,
            username: p.username,
            avatar_url: p.avatar_url,
            visits: reg?.visit_count ?? v.visits,
            lastVisit: reg?.last_visit_at ?? v.lastVisit,
            isRegular: regularMap.has(p.id),
          };
        })
        .sort((a, b) => b.visits - a.visits);
      setRows(result);
    } catch (e: any) {
      toast.error(e.message || "Không tải được danh sách khách");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [businessId]);

  const toggleRegular = async (row: Candidate) => {
    if (!user) return;
    if (row.isRegular) {
      const { error } = await supabase
        .from("business_regulars")
        .delete()
        .eq("business_id", businessId)
        .eq("member_id", row.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("business_regulars").upsert({
        business_id: businessId,
        member_id: row.id,
        visit_count: row.visits,
        last_visit_at: row.lastVisit,
        marked_by: user.id,
      });
      if (error) return toast.error(error.message);
    }
    void load();
  };

  if (loading) return <div className="text-xs text-muted-foreground py-2">Đang tải danh sách khách…</div>;

  return (
    <div className="border-t pt-3 space-y-2">
      <div className="text-xs font-semibold text-muted-foreground">Khách quen — chỉ bạn thấy danh sách này</div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-2">
          Chưa có khách nào claim ưu đãi tại đây. Danh sách sẽ tự xuất hiện khi khách bắt đầu ghé quán.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-accent/50">
              <Link to={`/ho-so/${r.id}`} className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar path={r.avatar_url} name={r.full_name || r.username} size={32} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{r.full_name || r.username || "Ẩn danh"}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {r.visits} lượt claim
                    {r.lastVisit ? ` · gần nhất ${new Date(r.lastVisit).toLocaleDateString("vi-VN")}` : ""}
                  </div>
                </div>
              </Link>
              <button
                onClick={() => toggleRegular(r)}
                className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold shrink-0 ${
                  r.isRegular ? "bg-primary/10 text-primary" : "border"
                }`}
              >
                {r.isRegular ? "Đã đánh dấu" : "Đánh dấu khách quen"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
