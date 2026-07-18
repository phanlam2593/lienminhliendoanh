import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/Avatar";

interface Regular {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  visits: number;
  lastVisit: string | null;
}

// Danh sách này giờ tự động: mỗi lần khách claim ưu đãi tại quán, trigger DB
// (auto_regular_on_claim) tự thêm/tăng visit_count ở đây — không cần đánh dấu tay nữa.
export function BusinessRegularsPanel({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<Regular[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: regulars } = await supabase
        .from("business_regulars")
        .select("member_id, visit_count, last_visit_at")
        .eq("business_id", businessId)
        .order("visit_count", { ascending: false });

      const ids = (regulars ?? []).map((r: any) => r.member_id);
      if (ids.length === 0) {
        setRows([]);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", ids);
      const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      setRows(
        (regulars ?? []).map((r: any) => ({
          id: r.member_id,
          full_name: profMap.get(r.member_id)?.full_name ?? null,
          username: profMap.get(r.member_id)?.username ?? null,
          avatar_url: profMap.get(r.member_id)?.avatar_url ?? null,
          visits: r.visit_count,
          lastVisit: r.last_visit_at,
        })),
      );
    } catch (e: any) {
      toast.error(e.message || "Không tải được danh sách khách");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [businessId]);

  const removeRegular = async (memberId: string) => {
    const { error } = await supabase
      .from("business_regulars")
      .delete()
      .eq("business_id", businessId)
      .eq("member_id", memberId);
    if (error) return toast.error(error.message);
    void load();
  };

  if (loading) return <div className="text-xs text-muted-foreground py-2">Đang tải danh sách khách…</div>;

  return (
    <div className="border-t pt-3 space-y-2">
      <div className="text-xs font-semibold text-muted-foreground">
        Khách quen — chỉ bạn thấy danh sách này. Tự động ghi nhận mỗi khi khách claim ưu đãi.
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-2">
          Chưa có khách quen nào. Danh sách sẽ tự xuất hiện khi khách bắt đầu claim ưu đãi tại quán.
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
                    {r.visits} lượt ghé
                    {r.lastVisit ? ` · gần nhất ${new Date(r.lastVisit).toLocaleDateString("vi-VN")}` : ""}
                  </div>
                </div>
              </Link>
              <button
                onClick={() => removeRegular(r.id)}
                className="h-8 px-2.5 rounded-lg text-[11px] font-semibold shrink-0 border text-muted-foreground"
              >
                Bỏ khỏi danh sách
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
