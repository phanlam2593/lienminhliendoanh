import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Message, Profile, Business } from "@/lib/types";
import { STICKER_PACKS, isStickerFile } from "@/lib/stickers";
import { timeAgo } from "@/lib/time";
import { useEffect, useState, useRef } from "react";
import { uploadImage, validateImage } from "@/lib/upload";
import { StoredImage } from "@/components/StoredImage";
import { Image as ImageIcon, Smile } from "lucide-react";
import { ArrowLeft, Send, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { MemberLevelBadge } from "@/components/MemberLevelBadge";
import { ProfileQuickView } from "@/components/ProfileQuickView";
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
import { useLanguage } from "@/lib/i18n";

interface ConvoSummary {
  partnerId: string;
  partner?: Pick<Profile, "id" | "full_name" | "username" | "avatar_url" | "points">;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

function messagePreview(m: Pick<Message, "type" | "content">): string {
  if (m.type === "image") return "📷 Hình ảnh";
  if (m.type === "sticker") return `${m.content} Sticker`;
  if (m.type === "broadcast") return m.content.replace(/^📢\s*/, "📢 ");
  return m.content;
}

export function MessagesInbox() {
  const { user, isApproved, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [convos, setConvos] = useState<ConvoSummary[]>([]);
  const [confirmPartner, setConfirmPartner] = useState<ConvoSummary | null>(null);
  const [sp] = useSearchParams();
  const [tab, setTab] = useState<"messages" | "follows">(sp.get("tab") === "follows" ? "follows" : "messages");
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!user) return;
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    const map = new Map<string, ConvoSummary>();
    (msgs as Message[] | null)?.forEach((m) => {
      // Tin broadcast do CHÍNH TÔI gửi (admin) không tính vào hội thoại của TÔI —
      // tránh 1 lần gửi N người tạo N hội thoại "ảo" trong hộp thư người gửi.
      // Người NHẬN vẫn thấy bình thường (điều kiện dưới chỉ chặn khi sender_id === tôi).
      if (m.type === "broadcast" && m.sender_id === user.id) return;
      const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!map.has(partnerId)) {
        map.set(partnerId, { partnerId, lastMessage: messagePreview(m), lastAt: m.created_at, unread: 0 });
      }
      if (m.receiver_id === user.id && !m.is_read) map.get(partnerId)!.unread += 1;
    });
    const ids = [...map.keys()];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, points")
        .in("id", ids);
      (profs as any[] | null)?.forEach((p) => {
        if (map.has(p.id)) map.get(p.id)!.partner = p;
      });
    }
    setConvos([...map.values()]);
  };

  useEffect(() => {
    if (!user) return;
    load();
    supabase
      .rpc("get_admin_user_ids")
      .then(({ data }) => setAdminIds(new Set((data ?? []).map((r: any) => r.user_id))));
    const ch = supabase
      .channel(`inbox:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const deleteConvo = async () => {
    if (!confirmPartner || !user) return;
    const pid = confirmPartner.partnerId;
    const { error } = await supabase
      .from("messages")
      .delete()
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${pid}),and(sender_id.eq.${pid},receiver_id.eq.${user.id})`);
    if (error) toast.error(error.message);
    else toast.success("Đã xóa cuộc trò chuyện");
    setConfirmPartner(null);
    load();
  };

  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">{t("community.needLogin")}</div>;
  if (!isApproved && !isAdmin)
    return <div className="p-8 text-center text-sm text-muted-foreground">{t("community.needApproval")}</div>;

  return (
    <div className="p-4 space-y-2">
      <h1 className="text-xl font-extrabold mb-2">{t("messages.title")}</h1>
      <div className="flex gap-1 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setTab("messages")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold ${tab === "messages" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
        >
          {t("messages.title")}
        </button>
        <button
          onClick={() => setTab("follows")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold ${tab === "follows" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
        >
          {t("messages.follows")}
        </button>
      </div>

      {tab === "messages" ? (
        convos.length === 0 ? (
          <p className="text-sm text-center py-12 text-muted-foreground">{t("messages.noConversations")}</p>
        ) : (
          convos.map((c) => (
            <div key={c.partnerId} className="flex items-center gap-2 p-3 bg-card rounded-xl shadow-sm">
              <Link to={`/tin-nhan/${c.partnerId}`} className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar path={c.partner?.avatar_url} name={c.partner?.full_name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="font-semibold text-sm truncate">
                      {c.partner?.full_name || t("messages.unknownUser")}
                    </div>
                    {c.partner && <MemberLevelBadge points={c.partner.points} isAdmin={adminIds.has(c.partnerId)} />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{c.lastMessage}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">{timeAgo(c.lastAt)}</div>
                  {c.unread > 0 && (
                    <div className="mt-1 inline-block min-w-4 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {c.unread}
                    </div>
                  )}
                </div>
              </Link>
              <button
                onClick={() => setConfirmPartner(c)}
                aria-label="Xóa cuộc trò chuyện"
                className="w-8 h-8 rounded-full hover:bg-destructive/10 text-destructive grid place-items-center flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )
      ) : (
        <FollowsTab userId={user.id} />
      )}

      <AlertDialog open={!!confirmPartner} onOpenChange={(v) => !v && setConfirmPartner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("messages.deleteConvoTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("messages.deleteConvoDesc", {
                name: confirmPartner?.partner?.full_name || t("messages.thisUser"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteConvo} className="bg-destructive hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function MessagesThread() {
  const { id = "" } = useParams();
  const { user, isApproved, isAdmin } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigate();
  const [partner, setPartner] = useState<Profile | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [stickerPack, setStickerPack] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [pendingSticker, setPendingSticker] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [partnerIsAdmin, setPartnerIsAdmin] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, status, points")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setPartner(data as Profile));
    supabase
      .rpc("get_admin_user_ids")
      .then(({ data }) => setPartnerIsAdmin((data ?? []).some((r: any) => r.user_id === id)));
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`)
        .order("created_at");
      setMsgs((data ?? []) as Message[]);
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", id)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    };
    load();
    const ch = supabase
      .channel(`thread:${user.id}:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, id]);

  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">Cần đăng nhập</div>;
  if (!isApproved && !isAdmin)
    return <div className="p-8 text-center text-sm text-muted-foreground">Tài khoản cần được duyệt</div>;

  const cancelPending = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
    setPendingSticker(null);
  };

  const pickImage = (file: File) => {
    const err = validateImage(file);
    if (err) {
      toast.error(err);
      return;
    }
    setPendingSticker(null);
    setPendingImage({ file, previewUrl: URL.createObjectURL(file) });
  };

  const pickSticker = (emoji: string) => {
    setPendingImage(null);
    setPendingSticker(emoji);
    setShowStickers(false);
  };

  const send = async () => {
    if (pendingImage) {
      setUploading(true);
      try {
        const path = await uploadImage(pendingImage.file, "messages", user.id);
        const { error } = await supabase
          .from("messages")
          .insert({ sender_id: user.id, receiver_id: id, content: "", type: "image", image_url: path });
        if (error) throw error;
        URL.revokeObjectURL(pendingImage.previewUrl);
        setPendingImage(null);
      } catch (e: any) {
        toast.error(e.message || "Gửi ảnh thất bại");
      } finally {
        setUploading(false);
      }
      return;
    }
    if (pendingSticker) {
      const emoji = pendingSticker;
      setPendingSticker(null);
      const { error } = await supabase
        .from("messages")
        .insert({ sender_id: user.id, receiver_id: id, content: emoji, type: "sticker" });
      if (error) toast.error("Gửi sticker thất bại: " + error.message);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    const { error } = await supabase
      .from("messages")
      .insert({ sender_id: user.id, receiver_id: id, content: trimmed, type: "text" });
    if (error) {
      toast.error("Gửi tin nhắn thất bại: " + error.message);
      setText(trimmed);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-5rem)]">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <button onClick={() => nav("/tin-nhan")}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={() => setQuickViewOpen(true)} className="shrink-0">
          <Avatar path={partner?.avatar_url} name={partner?.full_name} size={32} />
        </button>
        <button onClick={() => setQuickViewOpen(true)} className="flex items-center gap-1.5 min-w-0 text-left">
          <div className="font-semibold text-sm truncate hover:text-primary">{partner?.full_name || "…"}</div>
          {partner && <MemberLevelBadge points={(partner as any).points ?? 0} isAdmin={partnerIsAdmin} />}
        </button>
      </div>
      <ProfileQuickView userId={id} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {msgs.map((m) => {
          const mine = m.sender_id === user.id;
          const canDelete = mine || isAdmin;
          return (
            <div key={m.id} className={`group flex items-end gap-1 ${mine ? "justify-end" : "justify-start"}`}>
              {canDelete && mine && (
                <button
                  onClick={() => setConfirmDeleteId(m.id)}
                  aria-label="Xóa"
                  className="opacity-0 group-hover:opacity-100 text-destructive p-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              {m.type === "sticker" ? (
                <div className="flex flex-col items-center">
                  {isStickerFile(m.content) ? (
                    <img src={`/stickers/${m.content}`} alt="Sticker" className="w-28 h-28 object-contain" />
                  ) : (
                    <span className="text-5xl leading-none">{m.content}</span>
                  )}
                  <div className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(m.created_at)}</div>
                </div>
              ) : m.type === "image" ? (
                <div className="max-w-[220px]">
                  <StoredImage path={m.image_url} alt="Hình ảnh" className="rounded-2xl w-full object-cover" />
                  <div className={`text-[11px] mt-0.5 ${mine ? "text-right" : ""} text-muted-foreground`}>
                    {timeAgo(m.created_at)}
                  </div>
                </div>
              ) : (
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"}`}
                >
                  {m.content}
                  <div className={`text-[11px] mt-0.5 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                    {timeAgo(m.created_at)}
                  </div>
                </div>
              )}
              {canDelete && !mine && (
                <button
                  onClick={() => setConfirmDeleteId(m.id)}
                  aria-label="Xóa"
                  className="opacity-0 group-hover:opacity-100 text-destructive p-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {(pendingImage || pendingSticker) && (
        <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/40">
          {pendingImage && (
            <div className="relative">
              <img src={pendingImage.previewUrl} alt="Xem trước" className="w-16 h-16 object-cover rounded-lg border" />
              <button
                onClick={cancelPending}
                aria-label="Hủy"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white grid place-items-center text-xs leading-none"
              >
                ×
              </button>
            </div>
          )}
          {pendingSticker && (
            <div className="relative">
              <img src={`/stickers/${pendingSticker}`} alt="Sticker" className="w-16 h-16 object-contain" />
              <button
                onClick={cancelPending}
                aria-label="Hủy"
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white grid place-items-center text-xs leading-none"
              >
                ×
              </button>
            </div>
          )}
          <span className="text-xs text-muted-foreground">Nhấn nút gửi để chia sẻ</span>
        </div>
      )}
      {showStickers && (
        <div className="border-t bg-card">
          <div className="flex gap-1 p-2 border-b">
            {STICKER_PACKS.map((pack, i) => (
              <button
                key={pack.id}
                onClick={() => setStickerPack(i)}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${stickerPack === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {pack.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1 p-2 max-h-40 overflow-y-auto">
            {STICKER_PACKS[stickerPack].files.map((s) => (
              <button key={s} onClick={() => pickSticker(s)} className="p-1 rounded-lg hover:bg-accent">
                <img
                  src={`/stickers/${s}`}
                  alt="Sticker"
                  className="w-full aspect-square object-contain"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 p-3 border-t bg-card items-center">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickImage(f);
            e.currentTarget.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label="Chọn ảnh"
          className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center text-muted-foreground shrink-0"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowStickers((v) => !v)}
          aria-label="Sticker"
          className={`w-9 h-9 rounded-full hover:bg-accent grid place-items-center shrink-0 ${showStickers ? "bg-accent" : "text-muted-foreground"}`}
        >
          <Smile className="w-5 h-5" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          disabled={!!pendingImage || !!pendingSticker}
          placeholder={pendingImage || pendingSticker ? "Nhấn gửi để chia sẻ…" : "Nhập tin nhắn…"}
          className="flex-1 px-3 py-2 rounded-full border bg-background text-sm disabled:opacity-60"
        />
        <button
          onClick={send}
          disabled={uploading}
          className="w-10 h-10 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center shrink-0 disabled:opacity-60"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(v) => !v && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tin nhắn?</AlertDialogTitle>
            <AlertDialogDescription>Tin nhắn sẽ bị xóa vĩnh viễn.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDeleteId) await supabase.from("messages").delete().eq("id", confirmDeleteId);
                setConfirmDeleteId(null);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FollowsTab({ userId }: { userId: string }) {
  const [following, setFollowing] = useState<
    { id: string; full_name: string; username: string; avatar_url: string | null }[]
  >([]);
  const [followers, setFollowers] = useState<
    { id: string; full_name: string; username: string; avatar_url: string | null }[]
  >([]);
  const [followingBiz, setFollowingBiz] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: outRows }, { data: inRows }] = await Promise.all([
        supabase.from("follows").select("followee_user_id, followee_business_id").eq("follower_id", userId),
        supabase.from("follows").select("follower_id").eq("followee_user_id", userId),
      ]);
      const outUserIds = (outRows ?? []).map((r: any) => r.followee_user_id).filter(Boolean);
      const outBizIds = (outRows ?? []).map((r: any) => r.followee_business_id).filter(Boolean);
      const inIds = (inRows ?? []).map((r: any) => r.follower_id).filter(Boolean);

      const [outUsersRes, inUsersRes, outBizRes] = await Promise.all([
        outUserIds.length
          ? supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", outUserIds)
          : Promise.resolve({ data: [] } as any),
        inIds.length
          ? supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", inIds)
          : Promise.resolve({ data: [] } as any),
        outBizIds.length
          ? supabase.from("businesses").select("*").in("id", outBizIds)
          : Promise.resolve({ data: [] } as any),
      ]);
      setFollowing((outUsersRes.data ?? []) as any);
      setFollowers((inUsersRes.data ?? []) as any);
      setFollowingBiz((outBizRes.data ?? []) as Business[]);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <p className="text-sm text-center py-12 text-muted-foreground">Đang tải…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold mb-2">Đang theo dõi ({following.length + followingBiz.length})</h2>
        {following.length === 0 && followingBiz.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Bạn chưa theo dõi ai</p>
        ) : (
          <div className="space-y-2">
            {following.map((p) => (
              <div key={p.id} className="flex items-center gap-2 p-2 bg-card rounded-xl">
                <Avatar path={p.avatar_url} name={p.full_name} size={36} />
                <Link to={`/ho-so/${p.id}`} className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{p.full_name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">@{p.username}</div>
                </Link>
                <Link
                  to={`/tin-nhan/${p.id}`}
                  className="text-xs px-3 py-1.5 rounded-full bg-gradient-brand text-primary-foreground font-semibold inline-flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" /> Nhắn tin
                </Link>
              </div>
            ))}
            {followingBiz.map((b) => (
              <div key={b.id} className="flex items-center gap-2 p-2 bg-card rounded-xl">
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted shrink-0">
                  <StoredImage path={b.cover_url} alt={b.name} className="w-full h-full object-cover" />
                </div>
                <Link to={`/dn/${b.id}`} className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">🏢 {b.name}</div>
                </Link>
                {b.owner_id && (
                  <Link
                    to={`/tin-nhan/${b.owner_id}`}
                    className="text-xs px-3 py-1.5 rounded-full bg-gradient-brand text-primary-foreground font-semibold inline-flex items-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3" /> Nhắn chủ
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold mb-2">Người theo dõi tôi ({followers.length})</h2>
        {followers.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Chưa có ai theo dõi bạn</p>
        ) : (
          <div className="space-y-2">
            {followers.map((p) => (
              <div key={p.id} className="flex items-center gap-2 p-2 bg-card rounded-xl">
                <Avatar path={p.avatar_url} name={p.full_name} size={36} />
                <Link to={`/ho-so/${p.id}`} className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{p.full_name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">@{p.username}</div>
                </Link>
                <Link
                  to={`/tin-nhan/${p.id}`}
                  className="text-xs px-3 py-1.5 rounded-full bg-gradient-brand text-primary-foreground font-semibold inline-flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" /> Nhắn tin
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
