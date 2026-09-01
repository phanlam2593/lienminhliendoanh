import { useEffect, useState } from "react";
import { Heart, MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { StoredImage } from "@/components/StoredImage";
import { timeAgo } from "@/lib/time";
import { toast } from "sonner";

interface WallPostCardPost {
  id: string;
  content: string | null;
  type: string;
  image_url: string | null;
  created_at: string;
}

interface WallCommentRow {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
}

export function WallPostCard({ post }: { post: WallPostCardPost }) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [reactionCount, setReactionCount] = useState(0);
  const [iReacted, setIReacted] = useState(false);
  const [reactBusy, setReactBusy] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<WallCommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: reactRows }, { count: cCount }] = await Promise.all([
        supabase.from("wall_post_reactions").select("user_id").eq("post_id", post.id),
        supabase.from("wall_post_comments").select("*", { count: "exact", head: true }).eq("post_id", post.id),
      ]);
      setReactionCount(reactRows?.length ?? 0);
      setIReacted(!!user && (reactRows ?? []).some((r) => r.user_id === user.id));
      setCommentCount(cCount ?? 0);
    })();
  }, [post.id, user?.id]);

  const toggleReaction = async () => {
    if (!user || reactBusy) return;
    setReactBusy(true);
    if (iReacted) {
      const { error } = await supabase.from("wall_post_reactions").delete().eq("post_id", post.id).eq("user_id", user.id);
      if (!error) {
        setIReacted(false);
        setReactionCount((c) => Math.max(0, c - 1));
      }
    } else {
      const { error } = await supabase.from("wall_post_reactions").insert({ post_id: post.id, user_id: user.id });
      if (!error) {
        setIReacted(true);
        setReactionCount((c) => c + 1);
      }
    }
    setReactBusy(false);
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    const { data } = await supabase
      .from("wall_post_comments")
      .select("id, content, created_at, user_id, profiles(full_name, avatar_url)")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true })
      .limit(50);
    setComments((data ?? []) as unknown as WallCommentRow[]);
    setCommentsLoading(false);
  };

  const toggleComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments.length === 0) void loadComments();
  };

  const sendComment = async () => {
    if (!user || !newComment.trim() || sending) return;
    setSending(true);
    const content = newComment.trim().slice(0, 500);
    const { data, error } = await supabase
      .from("wall_post_comments")
      .insert({ post_id: post.id, user_id: user.id, content })
      .select("id, content, created_at, user_id, profiles(full_name, avatar_url)")
      .single();
    if (error) {
      toast.error(error.message);
    } else if (data) {
      setComments((c) => [...c, data as unknown as WallCommentRow]);
      setCommentCount((c) => c + 1);
      setNewComment("");
    }
    setSending(false);
  };

  return (
    <div className="bg-card rounded-2xl p-3 shadow-sm space-y-1.5">
      <div className="text-[11px] text-muted-foreground">{timeAgo(post.created_at, lang)}</div>
      {post.type === "gif" ? (
        <img src={post.content ?? ""} alt="GIF" className="max-w-[180px] rounded-xl" loading="lazy" />
      ) : post.type === "image" ? (
        <StoredImage path={post.image_url} alt={t("chat.imageAlt")} className="max-w-[220px] rounded-xl" />
      ) : (
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
      )}

      <div className="flex items-center gap-4 pt-1.5 border-t border-border/60 mt-1.5">
        <button
          onClick={toggleReaction}
          disabled={!user || reactBusy}
          className={`flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 ${iReacted ? "text-red-500" : "text-muted-foreground"}`}
        >
          <Heart className={`w-4 h-4 ${iReacted ? "fill-red-500" : ""}`} />
          {reactionCount > 0 ? reactionCount : t("wall.react")}
        </button>
        <button onClick={toggleComments} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          {commentCount > 0 ? t("wall.commentsCount", { n: commentCount }) : t("wall.comment")}
        </button>
      </div>

      {commentsOpen && (
        <div className="pt-2 space-y-2 border-t border-border/60 mt-1.5">
          {commentsLoading ? (
            <p className="text-center text-[11px] text-muted-foreground py-2">{t("common.loading")}</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar path={c.profiles?.avatar_url ?? null} name={c.profiles?.full_name ?? "?"} size={26} />
                <div className="flex-1 min-w-0 bg-muted rounded-2xl px-2.5 py-1.5">
                  <div className="text-[11px] font-semibold">{c.profiles?.full_name ?? t("messages.unknownUser")}</div>
                  <div className="text-xs whitespace-pre-wrap">{c.content}</div>
                </div>
              </div>
            ))
          )}
          {user && (
            <div className="flex items-center gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void sendComment();
                  }
                }}
                placeholder={t("wall.commentPlaceholder")}
                className="flex-1 h-8 px-3 rounded-full bg-muted text-xs outline-none"
              />
              <button
                onClick={sendComment}
                disabled={!newComment.trim() || sending}
                className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-50 shrink-0"
                aria-label={t("common.send")}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
