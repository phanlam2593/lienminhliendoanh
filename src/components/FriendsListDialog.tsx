import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/Avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";

interface PersonRow {
  friendshipId: string;
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
  initialTab?: "friends" | "requests";
}

// Chỉ hiện tab "Lời mời" khi đang xem BẠN BÈ CỦA CHÍNH MÌNH (userId === user.id) — người
// khác không được thấy/thao tác lời mời của tôi.
export function FriendsListDialog({ userId, open, onOpenChange, onChanged, initialTab }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isMine = user?.id === userId;
  const [tab, setTab] = useState<"friends" | "requests">("friends");
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<PersonRow[]>([]);
  const [requests, setRequests] = useState<PersonRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadFriends = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    const otherIds = (rows ?? []).map((r: any) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
    if (otherIds.length === 0) {
      setFriends([]);
      setLoading(false);
      return;
    }
    const { data: people } = await supabase
      .from("profiles_public")
      .select("id, full_name, username, avatar_url")
      .in("id", otherIds);
    const byId = new Map((people ?? []).map((p: any) => [p.id, p]));
    setFriends(
      (rows ?? []).map((r: any) => {
        const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
        const p = byId.get(otherId);
        return { friendshipId: r.id, id: otherId, full_name: p?.full_name ?? null, username: p?.username ?? null, avatar_url: p?.avatar_url ?? null };
      }),
    );
    setLoading(false);
  };

  const loadRequests = async () => {
    if (!isMine) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("friendships")
      .select("id, requester_id")
      .eq("status", "pending")
      .eq("addressee_id", userId);
    const ids = (rows ?? []).map((r: any) => r.requester_id);
    if (ids.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }
    const { data: people } = await supabase.from("profiles_public").select("id, full_name, username, avatar_url").in("id", ids);
    const byId = new Map((people ?? []).map((p: any) => [p.id, p]));
    setRequests(
      (rows ?? []).map((r: any) => {
        const p = byId.get(r.requester_id);
        return { friendshipId: r.id, id: r.requester_id, full_name: p?.full_name ?? null, username: p?.username ?? null, avatar_url: p?.avatar_url ?? null };
      }),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    setTab(initialTab === "requests" && isMine ? "requests" : "friends");
    void loadFriends();
    if (isMine) void loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  const accept = async (r: PersonRow) => {
    setBusyId(r.friendshipId);
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", r.friendshipId);
    setBusyId(null);
    if (error) return toast.error(error.message);
    setRequests((prev) => prev.filter((x) => x.friendshipId !== r.friendshipId));
    setFriends((prev) => [r, ...prev]);
    onChanged?.();
  };

  const decline = async (r: PersonRow) => {
    setBusyId(r.friendshipId);
    const { error } = await supabase.from("friendships").delete().eq("id", r.friendshipId);
    setBusyId(null);
    if (error) return toast.error(error.message);
    setRequests((prev) => prev.filter((x) => x.friendshipId !== r.friendshipId));
    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{t("friend.friends")}</DialogTitle>
        </DialogHeader>
        {isMine && (
          <div className="px-4 pb-2">
            <div className="flex gap-1 p-1 bg-muted rounded-xl">
              <button
                onClick={() => setTab("friends")}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold ${tab === "friends" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                {t("friend.tabFriends")}
              </button>
              <button
                onClick={() => setTab("requests")}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold relative ${tab === "requests" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                {t("friend.tabRequests")}
                {requests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] grid place-items-center">
                    {requests.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : tab === "friends" ? (
            friends.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">{t("friend.noFriends")}</div>
            ) : (
              <ul className="space-y-1">
                {friends.map((r) => (
                  <li key={r.friendshipId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                    <Link to={`/ho-so/${r.id}`} onClick={() => onOpenChange(false)} className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar path={r.avatar_url} name={r.full_name || r.username} size={36} />
                      <div className="text-sm font-semibold truncate">{r.full_name || r.username || t("follow.anonymous")}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : requests.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">{t("friend.noRequests")}</div>
          ) : (
            <ul className="space-y-1">
              {requests.map((r) => (
                <li key={r.friendshipId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                  <Link to={`/ho-so/${r.id}`} onClick={() => onOpenChange(false)} className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar path={r.avatar_url} name={r.full_name || r.username} size={36} />
                    <div className="text-sm font-semibold truncate">{r.full_name || r.username || t("follow.anonymous")}</div>
                  </Link>
                  <button
                    onClick={() => accept(r)}
                    disabled={busyId === r.friendshipId}
                    aria-label={t("friend.accept")}
                    className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => decline(r)}
                    disabled={busyId === r.friendshipId}
                    aria-label={t("friend.decline")}
                    className="h-8 w-8 rounded-lg border grid place-items-center disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
