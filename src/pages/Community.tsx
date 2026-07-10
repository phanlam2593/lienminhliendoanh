import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/time";
import { STICKER_PACKS, isStickerFile } from "@/lib/stickers";
import { uploadImage, validateImage } from "@/lib/upload";
import { StoredImage } from "@/components/StoredImage";
import { Image as ImageIcon, Smile, ChevronDown, ChevronUp, Users } from "lucide-react";
import { MemberLevelBadge } from "@/components/MemberLevelBadge";
import { ProfileQuickView } from "@/components/ProfileQuickView";
import { useOnlineUsers } from "@/lib/onlineUsers";
interface ProfLite {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  status_message: string | null;
  points: number;
}

interface Msg {
  id: string;
  user_id: string;
  content: string;
  type: "text" | "image" | "sticker";
  image_url: string | null;
  created_at: string;
}

const MEMBER_PAGE_SIZE = 50;
const MSG_PAGE_SIZE = 50;

export default function Community() {
  const { user, isApproved, isAdmin } = useAuth();
  const onlineUsers = useOnlineUsers();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [msgLimit, setMsgLimit] = useState(MSG_PAGE_SIZE);
  const [msgHasMore, setMsgHasMore] = useState(true);
  const [loadingOlderMsgs, setLoadingOlderMsgs] = useState(false);
  const [profMap, setProfMap] = useState<Map<string, ProfLite>>(new Map());
  const [members, setMembers] = useState<ProfLite[]>([]);
  const [memberPage, setMemberPage] = useState(0);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberHasMore, setMemberHasMore] = useState(true);
  const [memberLoadingMore, setMemberLoadingMore] = useState(false);
  const [text, setText] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [stickerPack, setStickerPack] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [pendingSticker, setPendingSticker] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [quickViewUser, setQuickViewUser] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const enrichProfiles = async (ids: string[]) => {
    const missing = ids.filter((id) => !profMap.has(id));
    if (!missing.length) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, points")
      .in("id", missing);
    setProfMap((prev) => {
      const n = new Map(prev);
      (data ?? []).forEach((p: any) => n.set(p.id, p));
      return n;
    });
  };

  const loadMsgs = async (limit = msgLimit, scrollToBottom = true) => {
    // Tải LIMIT tin nhắn MỚI NHẤT (không phải cũ nhất) rồi đảo lại thành thứ tự thời gian tăng dần
    // để hiển thị đúng — tránh giới hạn cứng 200 như trước, "Xem thêm" sẽ tăng dần limit này.
    const { data } = await supabase
      .from("community_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    const list = ((data ?? []) as Msg[]).reverse();
    setMsgs(list);
    setMsgHasMore(list.length === limit);
    void enrichProfiles([...new Set(list.map((m) => m.user_id))]);
    if (scrollToBottom) {
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const loadOlderMsgs = async () => {
    setLoadingOlderMsgs(true);
    const next = msgLimit + MSG_PAGE_SIZE;
    setMsgLimit(next);
    await loadMsgs(next, false);
    setLoadingOlderMsgs(false);
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, status_message, points")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200);
    const list = (data ?? []) as ProfLite[];
    list.sort((a, b) => (a.id === user?.id ? -1 : b.id === user?.id ? 1 : 0));
    setMembers(list);
  };

  useEffect(() => {
    if (!user) return;
    loadMsgs();
    loadMembers();
    supabase.rpc("get_admin_user_ids").then(({ data }) => {
      setAdminIds(new Set((data ?? []).map((r: any) => r.user_id)));
    });
    const ch = supabase
      .channel(`community:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_messages" }, () => loadMsgs())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">Cần đăng nhập</div>;
  if (!isApproved)
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">Tài khoản cần được duyệt để vào cộng đồng</div>
    );

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
        const path = await uploadImage(pendingImage.file, "community", user.id);
        const { error } = await supabase
          .from("community_messages")
          .insert({ user_id: user.id, content: "", type: "image", image_url: path });
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
        .from("community_messages")
        .insert({ user_id: user.id, content: emoji, type: "sticker" });
      if (error) toast.error("Gửi sticker thất bại: " + error.message);
      return;
    }
    const t = text.trim();
    if (!t) return;
    setText("");
    const { error } = await supabase.from("community_messages").insert({ user_id: user.id, content: t, type: "text" });
    if (error) {
      toast.error(error.message);
      setText(t);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Xóa tin nhắn này?")) return;
    const { error } = await supabase.from("community_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const onlineCount = members.filter((m) => onlineUsers.has(m.id)).length;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-5rem)]">
      {/* Danh sách thành viên — thu gọn mặc định, nằm trên khung chat */}
      <button
        onClick={() => setShowMembers((v) => !v)}
        className="flex items-center justify-between px-3 py-2 border-b bg-card shrink-0"
      >
        <span className="font-bold text-sm flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" /> {members.length} thành viên
          <span className="text-emerald-600 font-semibold">· {onlineCount} online</span>
        </span>
        {showMembers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showMembers && (
        <div className="max-h-[45vh] overflow-y-auto border-b bg-card shrink-0">
          {members.map((m) => (
            <Link
              key={m.id}
              to={m.id === user.id ? "/ho-so" : `/tin-nhan/${m.id}`}
              className="flex items-center gap-2 p-2 hover:bg-accent"
            >
              <div className="relative shrink-0">
                <Avatar path={m.avatar_url} name={m.full_name} size={36} />
                {onlineUsers.has(m.id) && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                  <span className="truncate">{m.full_name}</span>
                  {m.id === user.id && <span className="text-[10px] text-muted-foreground">(bạn)</span>}
                  <MemberLevelBadge points={m.points} isAdmin={adminIds.has(m.id)} />
                </div>
                {m.status_message && (
                  <div className="text-[11px] text-primary italic truncate font-medium">{m.status_message}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Khung chat — chiếm phần còn lại */}
      <section className="flex flex-col flex-1 min-h-0">
        <div className="px-3 py-2 border-b bg-card font-bold text-sm shrink-0">💬 Nhóm cộng đồng</div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {msgs.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              Chưa có tin nhắn nào. Hãy là người đầu tiên!
            </p>
          ) : (
            msgs.map((m) => {
              const p = profMap.get(m.user_id);
              const mine = m.user_id === user.id;
              const canDelete = mine || isAdmin;
              return (
                <div key={m.id} className="group flex items-start gap-2">
                  <button onClick={() => setQuickViewUser(m.user_id)} className="shrink-0">
                    <Avatar path={p?.avatar_url} name={p?.full_name} size={32} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        onClick={() => setQuickViewUser(m.user_id)}
                        className="font-semibold truncate hover:text-primary text-left"
                      >
                        {p?.full_name || "Thành viên"}
                      </button>
                      {p && <MemberLevelBadge points={p.points} isAdmin={adminIds.has(m.user_id)} />}
                      <span className="text-muted-foreground">{timeAgo(m.created_at)}</span>
                      {canDelete && (
                        <button
                          onClick={() => del(m.id)}
                          aria-label="Xóa"
                          className="ml-auto opacity-0 group-hover:opacity-100 focus:opacity-100 transition text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {m.type === "sticker" ? (
                      isStickerFile(m.content) ? (
                        <img src={`/stickers/${m.content}`} alt="Sticker" className="w-24 h-24 object-contain mt-0.5" />
                      ) : (
                        <span className="text-4xl leading-none inline-block mt-0.5">{m.content}</span>
                      )
                    ) : m.type === "image" ? (
                      <div className="max-w-[200px] mt-0.5">
                        <StoredImage path={m.image_url} alt="Hình ảnh" className="rounded-xl w-full object-cover" />
                      </div>
                    ) : (
                      <div
                        className={`text-sm rounded-xl px-3 py-1.5 mt-0.5 inline-block max-w-full break-words ${mine ? "bg-primary text-primary-foreground" : "bg-card border"}`}
                      >
                        {m.content}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>
        {(pendingImage || pendingSticker) && (
          <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/40">
            {pendingImage && (
              <div className="relative">
                <img
                  src={pendingImage.previewUrl}
                  alt="Xem trước"
                  className="w-16 h-16 object-cover rounded-lg border"
                />
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
        <div className="flex gap-2 p-2 border-t bg-card items-center">
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
            placeholder={pendingImage || pendingSticker ? "Nhấn gửi để chia sẻ…" : "Nhập tin nhắn cộng đồng…"}
            className="flex-1 px-3 py-2 rounded-full border bg-background text-sm disabled:opacity-60"
          />
          <button
            onClick={send}
            disabled={uploading}
            aria-label="Gửi"
            className="w-10 h-10 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center shrink-0 disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </section>
      <ProfileQuickView
        userId={quickViewUser}
        open={!!quickViewUser}
        onOpenChange={(v) => !v && setQuickViewUser(null)}
      />
    </div>
  );
}
