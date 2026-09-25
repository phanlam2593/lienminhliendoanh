import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGoBack } from "@/lib/navigation";
import { ArrowLeft, Mail, Phone, MessageCircle, MoreVertical, Ban, ShieldCheck, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { ImageViewer } from "@/components/ImageLightbox";
import { FollowListDialog } from "@/components/FollowListDialog";
import { FriendsListDialog } from "@/components/FriendsListDialog";
import { WallPostCard } from "@/components/WallPostCard";
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
import { LoadingState, NotFoundState } from "@/components/LoadingState";

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
  user_id: string;
}

export default function UserProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const goBack = useGoBack();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [p, setP] = useState<PubProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followsMe, setFollowsMe] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [listOpen, setListOpen] = useState<null | "followers" | "following">(null);
  const [busy, setBusy] = useState(false);
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [posts, setPosts] = useState<WallPost[]>([]);
  const [avatarViewOpen, setAvatarViewOpen] = useState(false);
  const [wallLoading, setWallLoading] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [statusExpanded, setStatusExpanded] = useState(false);

  // "Bạn bè" = theo dõi qua lại (kiểu Instagram) — bỏ lời mời kết bạn cũ.
  const loadFriendsCount = async () => {
    if (!id) return;
    const { data } = await (supabase as any).rpc("get_mutual_follows", { _uid: id });
    setFriendsCount((data ?? []).length);
  };

  useEffect(() => {
    void loadFriendsCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      const [{ data: prof }, { count }, { count: gc }, { data: rel }, { data: blockRow }, { data: relBack }] =
        await Promise.all([
          supabase.rpc("get_public_profile", { _id: id }).maybeSingle(),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_user_id", id),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id),
          user
            ? supabase.from("follows").select("id").eq("follower_id", user.id).eq("followee_user_id", id).maybeSingle()
            : Promise.resolve({ data: null } as any),
          user
            ? supabase.from("blocks").select("id").eq("blocker_id", user.id).eq("blocked_id", id).maybeSingle()
            : Promise.resolve({ data: null } as any),
          user
            ? supabase.from("follows").select("id").eq("follower_id", id).eq("followee_user_id", user.id).maybeSingle()
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
      setFollowsMe(!!relBack);
      setIBlockedThem(!!blockRow);
      setLoading(false);
    })();
  }, [id, user?.id, nav]);

  useEffect(() => {
    if (!id) return;
    setWallLoading(true);
    (async () => {
      const { data: postRows } = await supabase
        .from("wall_posts")
        .select("id, content, type, image_url, created_at, user_id")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(20);
      setPosts((postRows ?? []) as WallPost[]);
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
    void loadFriendsCount();
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

  if (loading) return <LoadingState full />;
  // Không tìm thấy (tài khoản đã xoá / chặn nhau) — trước đây kẹt "Đang tải…" mãi mãi.
  if (!p) return <NotFoundState fallback="/" />;

  const isMe = user?.id === p.id;

  return (
    <div className="max-w-xl mx-auto pb-6">
      <div className="relative pt-14">
        <button
          onClick={() => goBack("/")}
          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-muted hover:bg-accent text-foreground grid place-items-center"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        {!isMe && user && (
          <Popover open={blockMenuOpen} onOpenChange={setBlockMenuOpen}>
            <PopoverTrigger asChild>
              <button
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-muted hover:bg-accent text-foreground grid place-items-center"
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
        <div className="px-4">
          <div className="flex items-center gap-4">
            <div className="relative rounded-full shrink-0">
              <Avatar
                path={p.avatar_url}
                name={p.full_name}
                size={88}
                onClick={p.avatar_url ? () => setAvatarViewOpen(true) : undefined}
              />
              <ImageViewer path={p.avatar_url} open={avatarViewOpen} onClose={() => setAvatarViewOpen(false)} />
              {p.status_message && (
                <button
                  type="button"
                  onClick={() => setStatusExpanded((v) => !v)}
                  className="absolute bottom-[calc(100%+2px)] left-12 z-10 w-max max-w-[190px] text-left"
                >
                  <div className="absolute -bottom-[13px] left-5 w-2 h-2 rounded-full bg-card border border-border" />
                  <div className="absolute -bottom-[20px] left-4 w-1.5 h-1.5 rounded-full bg-card border border-border" />
                  <div className="absolute -bottom-[26px] left-3 w-1 h-1 rounded-full bg-card border border-border" />
                  <p
                    className={`relative px-3 py-1.5 rounded-2xl bg-card border border-border shadow-sm text-sm text-primary italic font-medium ${statusExpanded ? "" : "line-clamp-2"}`}
                  >
                    "{p.status_message}"
                  </p>
                </button>
              )}
            </div>
            {/* Kiểu Instagram: số liệu gọn bên phải avatar */}
            <div className="flex-1 min-w-0 grid grid-cols-3 gap-1">
              {(
                [
                  { n: followers, label: t("follow.followersLabel"), onClick: () => setListOpen("followers") },
                  { n: followingCount, label: t("follow.followingLabel"), onClick: () => setListOpen("following") },
                  { n: friendsCount, label: t("friend.friends"), onClick: () => setFriendsOpen(true) },
                ] as const
              ).map((it) => (
                <button
                  key={it.label}
                  onClick={it.onClick}
                  className="flex flex-col items-center gap-0.5 py-1 rounded-lg hover:bg-accent/60 transition"
                >
                  <div className="text-base font-extrabold leading-tight">{it.n}</div>
                  <div className="text-[11px] text-muted-foreground leading-tight text-center">{it.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="min-w-0 mt-3">
            <div className="text-lg font-extrabold truncate">{p.full_name}</div>
            {p.username && <div className="text-xs text-muted-foreground truncate">@{p.username}</div>}
          </div>
          {p.bio && <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">{p.bio}</p>}
          {!isMe && user && (
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={toggleFollow}
                disabled={busy || iBlockedThem}
                className={`flex-1 h-10 rounded-xl text-sm font-semibold disabled:opacity-50 ${following ? "bg-muted text-foreground" : "bg-primary/10 text-primary"}`}
              >
                {following && followsMe
                  ? t("friend.isFriend")
                  : following
                    ? t("common.following")
                    : followsMe
                      ? t("follow.followBack")
                      : t("common.follow")}
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
        {/* Chỉ còn "Bài viết" — phần Đánh giá đã bỏ khỏi trang cá nhân theo yêu cầu */}
        <div className="text-sm font-bold flex items-center gap-1.5 px-1">
          <MessageSquare className="w-3.5 h-3.5" /> {t("wall.posts")}
        </div>

        <div className="mt-3 space-y-2">
          {wallLoading ? (
            <LoadingState />
          ) : posts.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">{t("wall.noPosts")}</p>
          ) : (
            posts.map((post) => (
              <WallPostCard
                key={post.id}
                post={post}
                onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
              />
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
