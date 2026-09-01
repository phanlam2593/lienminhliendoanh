import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  MoreVertical,
  Ban,
  ShieldCheck,
  Star,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { StoredImage } from "@/components/StoredImage";
import { FollowListDialog } from "@/components/FollowListDialog";
import { FriendButton } from "@/components/FriendButton";
import { FriendsListDialog } from "@/components/FriendsListDialog";
import { WallPostCard } from "@/components/WallPostCard";
import { timeAgo } from "@/lib/time";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PubProfile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  status_message: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
}

interface WallPost {
  id: string;
  content: string;
  type: "text" | "image" | "gif";
  image_url: string | null;
  created_at: string;
}

interface WallReview {
  id: string;
  rating: number;
  comment: string | null;
  image_url: string | null;
  created_at: string;
  businesses: { id: string; name: string; cover_url: string | null } | null;
}

export default function UserProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [p, setP] = useState<PubProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [listOpen, setListOpen] = useState<null | "followers" | "following">(null);
  const [busy, setBusy] = useState(false);
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [tab, setTab] = useState<"posts" | "reviews">("posts");
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [reviews, setReviews] = useState<WallReview[]>([]);
  const [wallLoading, setWallLoading] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);

  const loadFriendsCount = async () => {
    if (!id) return;
    const { count } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${id},addressee_id.eq.${id}`);
    setFriendsCount(count ?? 0);
  };

  useEffect(() => {
    void loadFriendsCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      const [{ data: prof }, { count }, { count: gc }, { data: rel }, { data: blockRow }] = await Promise.all([
        supabase.rpc("get_public_profile", { _id: id }).maybeSingle(),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_user_id", id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id),
        user
          ? supabase.from("follows").select("id").eq("follower_id", user.id).eq("followee_user_id", id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        user
          ? supabase.from("blocks").select("id").eq("blocker_id", user.id).eq("blocked_id", id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      if (!prof) {
        toast.message(t("common.contentGone"));
        nav("/");
        return;
      }
      setP(prof as PubProfile);
      setFollowers(count ?? 0);
      setFollowingCount(gc ?? 0);
      setFollowing(!!rel);
      setIBlockedThem(!!blockRow);
      setLoading(false);
    })();
  }, [id, user?.id, nav]);

  useEffect(() => {
    if (!id) return;
    setWallLoading(true);
    (async () => {
      const [{ data: postRows }, { data: reviewRows }] = await Promise.all([
        supabase
          .from("wall_posts")
          .select("id, content, type, image_url, created_at")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("reviews")
          .select("id, rating, comment, image_url, created_at, businesses(id, name, cover_url)")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      setPosts((postRows ?? []) as WallPost[]);
      setReviews((reviewRows ?? []) as unknown as WallReview[]);
      setWallLoading(false);
    })();
  }, [id]);

  const toggleFollow = async () => {
    if (!user || !id) return;
    setBusy(true);
    if (following) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("followee_user_id", id);
      setFollowing(false);
      setFollowers((c) => Math.max(0, c - 1));
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, followee_user_id: id });
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
      setFollowing(true);
      setFollowers((c) => c + 1);
    }
    setBusy(false);
  };

  const blockUser = async () => {
    if (!user || !id) return;
    const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    setIBlockedThem(true);
    setConfirmBlockOpen(false);
    setFollowing(false);
    toast.success(t("block.blocked"));
  };

  const unblockUser = async () => {
    if (!user || !id) return;
    const { error } = await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setIBlockedThem(false);
    toast.success(t("block.unblocked"));
  };

  if (loading || !p) return <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>;

  const isMe = user?.id === p.id;

  return (
    <div className="max-w-xl mx-auto pb-6">
      <div className="relative">
        {p.cover_url ? (
          <StoredImage path={p.cover_url} alt="" className="h-28 w-full object-cover rounded-b-2xl" />
        ) : (
          <div className="h-28 bg-gradient-brand rounded-b-2xl" />
        )}
        <button
          onClick={() => nav(-1)}
          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/20 hover:bg-black/30 text-white grid place-items-center backdrop-blur-sm"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        {!isMe && user && (
          <Popover open={blockMenuOpen} onOpenChange={setBlockMenuOpen}>
            <PopoverTrigger asChild>
              <button
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/20 hover:bg-black/30 text-white grid place-items-center backdrop-blur-sm"
                aria-label={t("block.menu")}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="end">
              {iBlockedThem ? (
                <button
                  onClick={() => {
                    setBlockMenuOpen(false);
                    unblockUser();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-semibold hover:bg-accent text-left"
                >
                  <ShieldCheck className="w-4 h-4" /> {t("block.unblock")}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setBlockMenuOpen(false);
                    setConfirmBlockOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-semibold hover:bg-accent text-destructive text-left"
                >
                  <Ban className="w-4 h-4" /> {t("block.block")}
                </button>
              )}
            </PopoverContent>
          </Popover>
        )}
        <div className="px-4 -mt-10">
          <div className="flex items-end gap-3">
            <div className="relative ring-4 ring-background rounded-full shrink-0">
              <Avatar path={p.avatar_url} name={p.full_name} size={88} />
              {p.status_message && (
                <div className="absolute bottom-[calc(100%-6px)] left-2 z-10 w-fit max-w-[180px]">
                  <div className="absolute -bottom-[13px] left-3 w-2 h-2 rounded-full bg-card border border-border" />
                  <div className="absolute -bottom-[20px] left-4 w-1.5 h-1.5 rounded-full bg-card border border-border" />
                  <div className="absolute -bottom-[26px] left-5 w-1 h-1 rounded-full bg-card border border-border" />
                  <p className="relative px-3 py-1.5 rounded-2xl bg-card border border-border shadow-sm text-sm text-primary italic font-medium line-clamp-2">
                    "{p.status_message}"
                  </p>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1.5">
              <div className="text-lg font-extrabold truncate">{p.full_name}</div>
              {p.username && <div className="text-xs text-muted-foreground truncate">@{p.username}</div>}
            </div>
          </div>
          {p.bio && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{p.bio}</p>}
          <div className="flex items-center gap-4 text-xs mt-3 bg-card rounded-xl px-3 py-2.5 shadow-sm">
            <button onClick={() => setListOpen("followers")} className="hover:text-primary">
              <span className="font-bold text-foreground">{followers}</span> {t("follow.followersLabel")}
            </button>
            <button onClick={() => setListOpen("following")} className="hover:text-primary">
              <span className="font-bold text-foreground">{followingCount}</span> {t("follow.followingLabel")}
            </button>
            <button onClick={() => setFriendsOpen(true)} className="hover:text-primary ml-auto">
              <span className="font-bold text-foreground">{friendsCount}</span> {t("friend.friends")}
            </button>
          </div>
          {!isMe && user && (
            <FriendButton
              targetId={p.id}
              targetName={p.full_name}
              disabled={iBlockedThem}
              onChanged={loadFriendsCount}
              className="w-full mt-2"
            />
          )}
          {!isMe && user && (
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={toggleFollow}
                disabled={busy || iBlockedThem}
                className={`flex-1 h-10 rounded-xl text-sm font-semibold disabled:opacity-50 ${following ? "bg-muted text-foreground" : "bg-primary/10 text-primary"}`}
              >
                {following ? t("common.following") : t("common.follow")}
              </button>
              <button
                onClick={() => nav(`/tin-nhan/${p.id}`)}
                disabled={iBlockedThem}
                className="flex-1 h-10 rounded-xl text-sm font-semibold border flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <MessageCircle className="w-4 h-4" /> {t("common.message")}
              </button>
            </div>
          )}
          {iBlockedThem && (
            <div className="w-full text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2 mt-2">
              {t("block.bannerBlocked")}
            </div>
          )}
          <div className="w-full space-y-1.5 text-sm mt-2">
            {p.email && (
              <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                {p.email}
              </a>
            )}
            {p.phone && (
              <a href={`tel:${p.phone}`} className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                {p.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 mt-5">
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setTab("posts")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${tab === "posts" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> {t("wall.posts")}
          </button>
          <button
            onClick={() => setTab("reviews")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${tab === "reviews" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            <Star className="w-3.5 h-3.5" /> {t("wall.reviews")}
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {wallLoading ? (
            <p className="text-center text-xs text-muted-foreground py-8">{t("common.loading")}</p>
          ) : tab === "posts" ? (
            posts.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">{t("wall.noPosts")}</p>
            ) : (
              posts.map((post) => <WallPostCard key={post.id} post={post} />)
            )
          ) : reviews.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">{t("wall.noReviews")}</p>
          ) : (
            reviews.map((rv) => (
              <div key={rv.id} className="bg-card rounded-2xl p-3 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  {rv.businesses ? (
                    <Link to={`/dn/${rv.businesses.id}`} className="text-sm font-semibold hover:text-primary truncate">
                      🏢 {rv.businesses.name}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">{t("reports.contentDeleted")}</span>
                  )}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < rv.rating ? "fill-primary text-primary" : "text-muted"}`}
                      />
                    ))}
                  </div>
                </div>
                {rv.comment && <p className="text-sm text-muted-foreground">{rv.comment}</p>}
                {rv.image_url && (
                  <StoredImage path={rv.image_url} alt={t("biz.reviewImageAlt")} className="max-w-[200px] rounded-xl" />
                )}
                <div className="text-[11px] text-muted-foreground">{timeAgo(rv.created_at, lang)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <AlertDialog open={confirmBlockOpen} onOpenChange={setConfirmBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("block.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("block.confirmDesc", { name: p.full_name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={blockUser} className="bg-destructive hover:bg-destructive/90">
              {t("block.block")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FollowListDialog
        open={listOpen !== null}
        onOpenChange={(v) => !v && setListOpen(null)}
        target={{ kind: "user", id: p.id }}
        mode={listOpen ?? "followers"}
      />
      <FriendsListDialog userId={p.id} open={friendsOpen} onOpenChange={setFriendsOpen} onChanged={loadFriendsCount} />
    </div>
  );
}
