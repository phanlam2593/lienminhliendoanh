import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Phone, UserCheck, UserPlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./Avatar";
import { MemberLevelBadge } from "./MemberLevelBadge";

interface QuickProfile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  status_message: string | null;
  points: number;
  email: string | null;
  phone: string | null;
  bio: string | null;
  role: "admin" | "member" | "guest";
}

export function ProfileQuickView({
  userId,
  open,
  onOpenChange,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const [p, setP] = useState<QuickProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    (async () => {
      const [{ data: prof }, { data: roleData }, { count }, { data: rel }] = await Promise.all([
        supabase.rpc("get_public_profile", { _id: userId }).maybeSingle(),
        supabase.rpc("get_user_role", { _id: userId }),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_user_id", userId),
        user
          ? supabase
              .from("follows")
              .select("id")
              .eq("follower_id", user.id)
              .eq("followee_user_id", userId)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      const role = (roleData as string) || "guest";
      setP(prof ? { ...(prof as any), role } : null);
      setFollowers(count ?? 0);
      setFollowing(!!rel);
      setLoading(false);
    })();
  }, [open, userId, user?.id]);

  const toggleFollow = async () => {
    if (!user || !userId || user.id === userId) return;
    setBusy(true);
    if (following) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followee_user_id", userId);
      if (error) toast.error(error.message);
      else {
        setFollowing(false);
        setFollowers((n) => Math.max(0, n - 1));
      }
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, followee_user_id: userId });
      if (error) toast.error(error.message);
      else {
        setFollowing(true);
        setFollowers((n) => n + 1);
      }
    }
    setBusy(false);
  };

  const isSelf = user?.id === userId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Hồ sơ</DialogTitle>
        </DialogHeader>
        {loading || !p ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Đang tải…</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center gap-2">
              <Avatar path={p.avatar_url} name={p.full_name || p.username} size={84} />
              <div>
                <div className="font-bold text-base">{p.full_name}</div>
                {p.username && <div className="text-xs text-muted-foreground">@{p.username}</div>}
                <div className="mt-1">
                  <MemberLevelBadge points={p.points} size="md" isAdmin={p.role === "admin"} />
                </div>
                {p.status_message && (
                  <p className="text-sm text-primary italic mt-1 font-medium">"{p.status_message}"</p>
                )}
                {p.bio && <p className="text-sm text-muted-foreground mt-1">{p.bio}</p>}
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-muted">{followers} người theo dõi</span>
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              {p.email && (
                <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-foreground/80 hover:text-primary">
                  <Mail className="w-4 h-4" /> {p.email}
                </a>
              )}
              {p.phone && (
                <a href={`tel:${p.phone}`} className="flex items-center gap-2 text-foreground/80 hover:text-primary">
                  <Phone className="w-4 h-4" /> {p.phone}
                </a>
              )}
            </div>

            <div className="flex gap-2">
              {!isSelf && user && (
                <button
                  onClick={toggleFollow}
                  disabled={busy}
                  className={`flex-1 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-1 ${following ? "bg-muted text-foreground" : "bg-gradient-brand text-primary-foreground"}`}
                >
                  {following ? (
                    <>
                      <UserCheck className="w-4 h-4" /> Đang theo dõi
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" /> Theo dõi
                    </>
                  )}
                </button>
              )}
              {isSelf ? (
                <Link
                  to="/ho-so"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 py-2 rounded-xl border text-sm font-semibold text-center"
                >
                  Mở hồ sơ của tôi
                </Link>
              ) : (
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex-1 py-2 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1"
                >
                  <X className="w-4 h-4" /> Đóng
                </button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
