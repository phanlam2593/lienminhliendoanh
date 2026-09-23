import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";

interface PersonRow {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Props {
  userId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged?: () => void;
  /** Giữ lại để tương thích chỗ gọi cũ — không còn tab "Lời mời" nữa. */
  initialTab?: "friends" | "requests";
}

// "Bạn bè" giờ = 2 người THEO DÕI QUA LẠI nhau (kiểu Instagram) — bỏ hẳn cơ chế gửi/nhận
// lời mời kết bạn cũ (bảng friendships vẫn giữ nguyên dữ liệu, chỉ không dùng nữa).
export function FriendsListDialog({ userId, open, onOpenChange }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<PersonRow[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void (supabase as any)
      .rpc("get_mutual_follows", { _uid: userId })
      .then(({ data }: { data: PersonRow[] | null }) => {
        setFriends(data ?? []);
        setLoading(false);
      });
  }, [open, userId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-1">
          <DialogTitle>{t("friend.friends")}</DialogTitle>
        </DialogHeader>
        <p className="px-4 pb-2 text-[11px] text-muted-foreground">{t("friend.mutualHint")}</p>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : friends.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">{t("friend.noFriends")}</div>
          ) : (
            <ul className="space-y-1">
              {friends.map((r) => (
                <li key={r.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                  <Link
                    to={`/ho-so/${r.id}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <Avatar path={r.avatar_url} name={r.full_name || r.username} size={36} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {r.full_name || r.username || t("follow.anonymous")}
                      </div>
                      {r.username && <div className="text-[11px] text-muted-foreground truncate">@{r.username}</div>}
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
