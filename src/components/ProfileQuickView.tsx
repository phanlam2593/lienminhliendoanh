import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Mail, MessageCircle, Phone, UserCheck, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
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
  const { t } = useLanguage();
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
    const wasFollowing = following;
    // Optimistic
    setFollowing(!wasFollowing);
    setFollowers((n) => (wasFollowing ? Math.max(0, n - 1) : n + 1));
    if (wasFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followee_user_id", userId);
      if (error) {
        // rollback
        setFollowing(true);
        setFollowers((n) => n + 1);
        toast.error(error.message);
      }
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, followee_user_id: userId });
      if (error) {
        setFollowing(false);
        setFollowers((n) => Math.max(0, n - 1));
        toast.error(error.message);
      }
    }
    setBusy(false);
  };

  const isSelf = user?.id === userId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("profileQuick.title")}</DialogTitle>
        </DialogHeader>
        {loading || !p ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="relative"><Avatar path={p.avatar_url} name={p.full_name || p.username} size={84} />{p.status_message && (<div className="absolute bottom-[calc(100%+2px)] left-12 z-10 w-max max-w-[150px] text-left"><div className="absolute -bottom-[13px] left-5 w-2 h-2 rounded-full bg-card border border-border" /><div className="absolute -bottom-[20px] left-4 w-1.5 h-1.5 rounded-full bg-card border border-border" /><div className="absolute -bottom-[26px] left-3 w-1 h-1 rounded-full bg-card border border-border" /><span className="relative block px-3 py-1.5 rounded-2xl bg-card border border-border shadow-sm text-xs text-primary font-semibold italic break-words">"{p.status_message.length > 60 ? p.status_message.slice(0, 60) + "…" : p.status_message}"</span></div>)}</div>
              <div>
                <div className="font-bold text-base">{p.full_name}</div>
                {p.username && <div className="text-xs text-muted-foreground">@{p.username}</div>}
                <div className="mt-1">
                  <MemberLevelBadge points={p.points} size="md" isAdmin={p.role === "admin"} />
                </div>
                {false && (p.status_message && (
                  <div className="inline-block max-w-full px-3 py-1.5 rounded-2xl bg-card border border-border shadow-sm mt-1">
                    <span className="text-sm text-primary italic font-medium break-words">"{p.status_message.length > 60 ? p.status_message.slice(0, 60) + "…" : p.status_message}"</span>
                  </div>
                ))}
                {p.bio && <p className="text-sm text-muted-foreground mt-1">{p.bio}</p>}
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-muted">
                  {t("profileQuick.followersCount", { n: followers })}
                </span>
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
                      <UserCheck className="w-4 h-4" /> {t("common.following")}
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" /> {t("common.follow")}
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
                  {t("profileQuick.openMyProfile")}
                </Link>
              ) : (
                user && (
                  <Link
                    to={`/tin-nhan/${userId}`}
                    onClick={() => onOpenChange(false)}
                    className="flex-1 py-2 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1"
                  >
                    <MessageCircle className="w-4 h-4" /> {t("common.message")}
                  </Link>
                )
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
