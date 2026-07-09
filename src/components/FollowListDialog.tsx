import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Search, UserCheck, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type Mode = "followers" | "following";
type Target = { kind: "user"; id: string } | { kind: "business"; id: string };

interface Row {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  isBusiness?: boolean;
  ownerId?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: Target;
  mode: Mode;
  title?: string;
}

const PAGE_SIZE = 30;

// Reusable list of followers/following. Phân trang qua follows table (nguồn dữ liệu
// chính), sau đó tải profile/business tương ứng cho đúng trang đang xem.
export function FollowListDialog({ open, onOpenChange, target, mode, title }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // Set of profile ids that the current viewer is following (member-follow)
  const [myFollowing, setMyFollowing] = useState<Set<string>>(new Set());
  const [myFollowingBiz, setMyFollowingBiz] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setQ("");
    setPage(0);
    void load(0, false);
    void loadMine();
  }, [open, target.kind, target.id, mode]);

  const load = async (pageNum: number, append: boolean) => {
    setLoadingMore(true);
    if (!append) setLoading(true);
    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      // Build follow query based on mode + target
      let followQuery = supabase
        .from("follows")
        .select("follower_id, followee_user_id, followee_business_id", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (mode === "followers") {
        if (target.kind === "user") followQuery = followQuery.eq("followee_user_id", target.id);
        else followQuery = followQuery.eq("followee_business_id", target.id);
      } else {
        // following: only meaningful for user target
        followQuery = followQuery.eq("follower_id", target.id);
      }
      const { data: follows, count, error } = await followQuery;
      if (error) throw error;
      setTotal(count ?? 0);

      let newRows: Row[] = [];
      if (mode === "following") {
        const userIds = (follows ?? []).map((f: any) => f.followee_user_id).filter((x: any): x is string => !!x);
        const bizIds = (follows ?? []).map((f: any) => f.followee_business_id).filter((x: any): x is string => !!x);

        const [{ data: profs }, { data: bizList }] = await Promise.all([
          userIds.length
            ? supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", userIds)
            : Promise.resolve({ data: [] } as any),
          bizIds.length
            ? supabase.from("businesses").select("id, name, cover_url, owner_id").in("id", bizIds)
            : Promise.resolve({ data: [] } as any),
        ]);

        const userRows = (profs ?? []) as Row[];
        const bizRows = ((bizList ?? []) as any[]).map((b) => ({
          id: b.id,
          full_name: b.name,
          username: null,
          avatar_url: b.cover_url,
          isBusiness: true,
          ownerId: b.owner_id,
        }));
        newRows = [...userRows, ...bizRows] as Row[];
      } else {
        const ids = (follows ?? []).map((f: any) => f.follower_id).filter((x: any): x is string => !!x);
        if (ids.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .in("id", ids);
          newRows = (profs ?? []) as Row[];
        }
      }
      setRows((prev) => (append ? [...prev, ...newRows] : newRows));
      setHasMore((follows ?? []).length === PAGE_SIZE);
    } catch (e: any) {
      toast.error(e.message || "Không tải được danh sách");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMine = async () => {
    // Load viewer's own following set to show Follow/Unfollow state
    if (!user) {
      setMyFollowing(new Set());
      setMyFollowingBiz(new Set());
      return;
    }
    const [{ data: mineUsers }, { data: mineBiz }] = await Promise.all([
      supabase
        .from("follows")
        .select("followee_user_id")
        .eq("follower_id", user.id)
        .not("followee_user_id", "is", null),
      supabase
        .from("follows")
        .select("followee_business_id")
        .eq("follower_id", user.id)
        .not("followee_business_id", "is", null),
    ]);
    setMyFollowing(new Set((mineUsers ?? []).map((r: any) => r.followee_user_id)));
    setMyFollowingBiz(new Set((mineBiz ?? []).map((r: any) => r.followee_business_id)));
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    void load(next, true);
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) => (r.full_name || "").toLowerCase().includes(s) || (r.username || "").toLowerCase().includes(s),
    );
  }, [rows, q]);

  const toggleFollow = async (row: Row) => {
    if (!user) return;
    if (row.isBusiness) {
      const isFollowing = myFollowingBiz.has(row.id);
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("followee_business_id", row.id);
        if (error) return toast.error(error.message);
        setMyFollowingBiz((s) => {
          const n = new Set(s);
          n.delete(row.id);
          return n;
        });
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: user.id, followee_business_id: row.id });
        if (error) return toast.error(error.message);
        setMyFollowingBiz((s) => new Set(s).add(row.id));
      }
      return;
    }
    const isFollowing = myFollowing.has(row.id);
    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followee_user_id", row.id);
      if (error) return toast.error(error.message);
      setMyFollowing((s) => {
        const n = new Set(s);
        n.delete(row.id);
        return n;
      });
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, followee_user_id: row.id });
      if (error) return toast.error(error.message);
      setMyFollowing((s) => new Set(s).add(row.id));
    }
  };

  const heading = title ?? (mode === "followers" ? "Người theo dõi" : "Đang theo dõi");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>
            {heading} {total > 0 ? `(${total})` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm trong danh sách đã tải…"
              className="w-full pl-8 pr-3 py-2 rounded-lg border bg-background text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Đang tải…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {rows.length === 0 ? "Chưa có ai" : "Không tìm thấy"}
            </div>
          ) : (
            <>
              <ul className="space-y-1">
                {filtered.map((r) => {
                  const isMe = !r.isBusiness && user?.id === r.id;
                  const isFollowing = r.isBusiness ? myFollowingBiz.has(r.id) : myFollowing.has(r.id);
                  return (
                    <li key={r.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                      <Link
                        to={r.isBusiness ? `/dn/${r.id}` : `/ho-so/${r.id}`}
                        onClick={() => onOpenChange(false)}
                        className="flex items-center gap-2 flex-1 min-w-0"
                      >
                        <Avatar path={r.avatar_url} name={r.full_name || r.username} size={36} />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{r.full_name || r.username || "Ẩn danh"}</div>
                        </div>
                      </Link>
                      {!isMe && user && (
                        <>
                          <button
                            onClick={() => toggleFollow(r)}
                            aria-label={isFollowing ? "Bỏ theo dõi" : "Theo dõi"}
                            className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 ${
                              isFollowing ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground"
                            }`}
                          >
                            {isFollowing ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                {mode === "following" ? "Bỏ theo dõi" : "Đang theo dõi"}
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5" />
                                {mode === "followers" ? "Theo dõi lại" : "Theo dõi"}
                              </>
                            )}
                          </button>
                          {!r.isBusiness && (
                            <Link
                              to={`/tin-nhan/${r.id}`}
                              onClick={() => onOpenChange(false)}
                              aria-label="Nhắn tin"
                              className="h-8 w-8 rounded-lg border grid place-items-center"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Link>
                          )}
                          {r.isBusiness && r.ownerId && r.ownerId !== user?.id && (
                            <Link
                              to={`/tin-nhan/${r.ownerId}`}
                              onClick={() => onOpenChange(false)}
                              aria-label="Nhắn tin chủ DN"
                              className="h-8 w-8 rounded-lg border grid place-items-center"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Link>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
              {hasMore && !q.trim() && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-2 mt-1 rounded-lg border text-sm font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  {loadingMore ? "Đang tải…" : `Tải thêm (còn ${total - rows.length})`}
                </button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
