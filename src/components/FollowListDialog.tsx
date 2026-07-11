import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Search, UserCheck, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
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

// Dùng follows_view (đã gộp sẵn tên follower/followee, cả người lẫn DN) để tìm kiếm
// hỏi thẳng DB kết hợp phân trang — không cần tự tra tên riêng nữa.
export function FollowListDialog({ open, onOpenChange, target, mode, title }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [myFollowing, setMyFollowing] = useState<Set<string>>(new Set());
  const [myFollowingBiz, setMyFollowingBiz] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setQ("");
    setDebouncedQ("");
    setPage(0);
    void load(0, false, "");
    void loadMine();
  }, [open, target.kind, target.id, mode]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(0);
      void load(0, false, q.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const load = async (pageNum: number, append: boolean, searchTerm: string) => {
    setLoadingMore(true);
    if (!append) setLoading(true);
    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from("follows_view")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (mode === "followers") {
        if (target.kind === "user") query = query.eq("followee_user_id", target.id);
        else query = query.eq("followee_business_id", target.id);
        if (searchTerm) query = query.or(`follower_name.ilike.%${searchTerm}%,follower_username.ilike.%${searchTerm}%`);
      } else {
        query = query.eq("follower_id", target.id);
        if (searchTerm) query = query.ilike("followee_name", `%${searchTerm}%`);
      }
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      setTotal(count ?? 0);

      const newRows: Row[] = (data ?? []).map((f: any) =>
        mode === "followers"
          ? {
              id: f.follower_id,
              full_name: f.follower_name,
              username: f.follower_username,
              avatar_url: f.follower_avatar,
            }
          : {
              id: f.followee_user_id ?? f.followee_business_id,
              full_name: f.followee_name,
              username: f.followee_username,
              avatar_url: f.followee_avatar,
              isBusiness: !f.followee_user_id,
              ownerId: f.followee_business_owner_id,
            },
      );
      setRows((prev) => (append ? [...prev, ...newRows] : newRows));
      setHasMore((data ?? []).length === PAGE_SIZE);
    } catch (e: any) {
      toast.error(e.message || "Không tải được danh sách");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMine = async () => {
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
    void load(next, true, debouncedQ);
  };

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