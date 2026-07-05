import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { FollowListDialog } from "@/components/FollowListDialog";
import { toast } from "sonner";

interface PubProfile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  status_message: string | null;
  email: string | null;
  phone: string | null;
}

export default function UserProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [p, setP] = useState<PubProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [listOpen, setListOpen] = useState<null | "followers" | "following">(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      const [{ data: prof }, { count }, { count: gc }, { data: rel }] = await Promise.all([
        supabase.rpc("get_public_profile", { _id: id }).maybeSingle(),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_user_id", id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id),
        user
          ? supabase.from("follows").select("id").eq("follower_id", user.id).eq("followee_user_id", id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      if (!prof) {
        toast.message("Nội dung không còn tồn tại");
        nav("/");
        return;
      }
      setP(prof as PubProfile);
      setFollowers(count ?? 0);
      setFollowingCount(gc ?? 0);
      setFollowing(!!rel);
      setLoading(false);
    })();
  }, [id, user?.id, nav]);

  const toggleFollow = async () => {
    if (!user || !id) return;
    setBusy(true);
    if (following) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("followee_user_id", id);
      setFollowing(false);
      setFollowers((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followee_user_id: id });
      setFollowing(true);
      setFollowers((c) => c + 1);
    }
    setBusy(false);
  };

  if (loading || !p) return <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>;

  const isMe = user?.id === p.id;

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>
      <div className="rounded-2xl border bg-card p-5 flex flex-col items-center text-center gap-3">
        <Avatar path={p.avatar_url} name={p.full_name} size={88} />
        <div>
          <div className="text-lg font-extrabold">{p.full_name}</div>
          {p.username && <div className="text-xs text-muted-foreground">@{p.username}</div>}
        </div>
        <div className="flex gap-4 text-xs">
          <button onClick={() => setListOpen("followers")} className="hover:text-primary">
            <span className="font-bold text-foreground">{followers}</span> người theo dõi
          </button>
          <button onClick={() => setListOpen("following")} className="hover:text-primary">
            <span className="font-bold text-foreground">{followingCount}</span> đang theo dõi
          </button>
        </div>
        {!isMe && user && (
          <div className="flex gap-2 w-full">
            <button
              onClick={toggleFollow}
              disabled={busy}
              className={`flex-1 h-10 rounded-xl text-sm font-semibold ${following ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}
            >
              {following ? "Đang theo dõi" : "Theo dõi"}
            </button>
            <button
              onClick={() => nav(`/tin-nhan/${p.id}`)}
              className="flex-1 h-10 rounded-xl text-sm font-semibold border flex items-center justify-center gap-1"
            >
              <MessageCircle className="w-4 h-4" /> Nhắn tin
            </button>
          </div>
        )}
        <div className="w-full space-y-1.5 text-sm text-left mt-2">
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
      <FollowListDialog
        open={listOpen !== null}
        onOpenChange={(v) => !v && setListOpen(null)}
        target={{ kind: "user", id: p.id }}
        mode={listOpen ?? "followers"}
      />
    </div>
  );
}
