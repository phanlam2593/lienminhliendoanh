import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}

interface FriendRow {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export function FriendsDialog({ open, onOpenChange, userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<FriendRow[]>([]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, userId]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: following }, { data: followers }] = await Promise.all([
        supabase
          .from("follows")
          .select("followee_user_id")
          .eq("follower_id", userId)
          .not("followee_user_id", "is", null),
        supabase.from("follows").select("follower_id").eq("followee_user_id", userId),
      ]);
      const followingIds = new Set((following ?? []).map((r: any) => r.followee_user_id));
      const mutualIds = (followers ?? [])
        .map((r: any) => r.follower_id)
        .filter((id: string) => followingIds.has(id));
      if (mutualIds.length === 0) {
        setFriends([]);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", mutualIds);
      setFriends((profiles ?? []) as FriendRow[]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Bạn bè {friends.length > 0 ? `(${friends.length})` : ""}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Đang tải…</div>
          ) : friends.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Chưa có bạn bè nào. Bạn bè xuất hiện khi hai người theo dõi lẫn nhau.
            </div>
          ) : (
            <ul className="space-y-1">
              {friends.map((f) => (
                <li key={f.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                  <Link
                    to={`/ho-so/${f.id}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <Avatar path={f.avatar_url} name={f.full_name || f.username} size={36} />
                    <div className="min-w-0 text-sm font-semibold truncate">
                      {f.full_name || f.username || "Ẩn danh"}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
