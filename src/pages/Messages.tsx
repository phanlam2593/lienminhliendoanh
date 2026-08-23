import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Message, Profile, Business } from "@/lib/types";
import { timeAgo } from "@/lib/time";
import { GifPicker } from "@/components/GifPicker";
import { useEffect, useState, useRef } from "react";
import { uploadImage, validateImage } from "@/lib/upload";
import { StoredImage } from "@/components/StoredImage";
import { Image as ImageIcon, Smile, SmilePlus } from "lucide-react";
import {
  ArrowLeft,
  Send,
  Trash2,
  MessageCircle,
  Pencil,
  Check,
  X,
  Reply as ReplyIcon,
  Phone,
  PhoneMissed,
  PhoneIncoming,
  PhoneOutgoing,
  History,
} from "lucide-react";
import { useOnlineUsers } from "@/lib/onlineUsers";
import { useCall } from "@/lib/call";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

interface CallRow {
  id: string;
  caller_id: string;
  callee_id: string;
  status: "answered" | "missed" | "declined" | "busy";
  duration_seconds: number | null;
  created_at: string;
}

function messagePreview(m: Pick<Message, "type" | "content">, tr: (k: string) => string): string {
  if (m.type === "image") return `📷 ${tr("chat.imageAlt")}`;
  if (m.type === "gif") return "🎬 GIF";
  if (m.type === "broadcast") return m.content.replace(/^📢\s*/, "📢 ");
  return m.content;
}

function callPreviewText(
  c: { status: string; duration_seconds: number | null },
  outgoing: boolean,
  tr: (k: string, params?: any) => string,
): string {
  if (c.status === "answered") return `📞 ${tr("callHistory.answered")}`;
  if (c.status === "missed") return outgoing ? `📞 ${tr("call.inline.noAnswer")}` : `📞 ${tr("callHistory.missed")}`;
  if (c.status === "declined")
    return outgoing ? `📞 ${tr("callHistory.declinedByThem")}` : `📞 ${tr("callHistory.youDeclined")}`;
  if (c.status === "busy") return `📞 ${tr("callHistory.busy")}`;
  return `📞 ${tr("call.inline.title")}`;
}

export function MessagesInbox() {
  const { user, isApproved, isAdmin } = useAuth();
  const { t, lang } = useLanguage();
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
      .order("created_at", { ascending: false })
      .limit(500);
    const map = new Map<string, ConvoSummary>();
    (msgs as Message[] | null)?.forEach((m) => {
      // Tin broadcast do CHÍNH TÔI gửi (admin) không tính vào hội thoại của TÔI —
      // tránh 1 lần gửi N người tạo N hội thoại "ảo" trong hộp thư người gửi.
      // Người NHẬN vẫn thấy bình thường (điều kiện dưới chỉ chặn khi sender_id === tôi).
      if (m.type === "broadcast" && m.sender_id === user.id) return;
      const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!map.has(partnerId)) {
        map.set(partnerId, { partnerId, lastMessage: messagePreview(m, t), lastAt: m.created_at, unread: 0 });
      }
      if (m.receiver_id === user.id && !m.is_read) map.get(partnerId)!.unread += 1;
    });
    const ids = [...map.keys()];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles_public")
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
    // QUAN TRỌNG (hiệu năng ở quy mô lớn): trước đây nghe "*" trên TOÀN BỘ bảng messages —
    // tin nhắn của bất kỳ 2 người dùng nào khác cũng kích hoạt tải lại hộp thư của mình.
    // Giờ chỉ lọc đúng những gì liên quan tới tài khoản mình.
    const ch = supabase
      .channel(`inbox:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `sender_id=eq.${user.id}` },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        load,
      )
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
    else toast.success(t("messages.convoDeleted"));
    setConfirmPartner(null);
    load();
  };

  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">{t("community.needLogin")}</div>;
  if (!isApproved && !isAdmin)
    return <div className="p-8 text-center text-sm text-muted-foreground">{t("community.needApproval")}</div>;

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-extrabold">{t("messages.title")}</h1>
        <Link
          to="/cuoc-goi"
          className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center text-muted-foreground"
          aria-label={t("callHistory.title")}
          title={t("callHistory.title")}
        >
          <History className="w-5 h-5" />
        </Link>
      </div>
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
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{t("messages.noConversations")}</p>
          </div>
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
                  <div className="text-[10px] text-muted-foreground">{timeAgo(c.lastAt, lang)}</div>
                  {c.unread > 0 && (
                    <div className="mt-1 inline-block min-w-4 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {c.unread}
                    </div>
                  )}
                </div>
              </Link>
              <button
                onClick={() => setConfirmPartner(c)}
                aria-label={t("messages.deleteConvo")}
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

const MSG_PAGE_SIZE = 50;

export function MessagesThread() {
  const { id = "" } = useParams();
  const { user, isApproved, isAdmin } = useAuth();
  const { t, lang } = useLanguage();
  const nav = useNavigate();
  const onlineUsers = useOnlineUsers();
  const { startCall } = useCall();
  const partnerOnline = onlineUsers.has(id);

  const handleCall = () => {
    if (!partner) return;
    if (!partnerOnline) {
      toast(t("call.offline"));
      return;
    }
    startCall({ id: partner.id, full_name: partner.full_name, avatar_url: partner.avatar_url });
  };
  const [partner, setPartner] = useState<Profile | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [msgLimit, setMsgLimit] = useState(MSG_PAGE_SIZE);
  const [msgHasMore, setMsgHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [showGifs, setShowGifs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [partnerIsAdmin, setPartnerIsAdmin] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // QUAN TRỌNG: khung cuộn ngoài (scrollContainerRef) có chiều cao CỐ ĐỊNH (flex-1 trong
  // khung khít màn hình) — kích thước bản thân nó KHÔNG đổi khi nội dung bên trong dài ra
  // do ảnh/GIF tải xong (chỉ phần cuộn overflow bên trong đổi, ResizeObserver không thấy).
  // Phải theo dõi đúng LỚP BỌC NỘI DUNG (co giãn tự nhiên theo nội dung thật) thay vì khung
  // cuộn — lớp đó mới thực sự đổi kích thước khi ảnh/GIF tải xong.
  // Có đang ở gần đáy khung chat không — dùng để quyết định có tự ghim xuống đáy khi nội
  // dung đổi chiều cao hay không, tránh làm phiền nếu người dùng đang cố tình cuộn lên xem
  // tin cũ.
  const pinnedToBottomRef = useRef(true);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  // QUAN TRỌNG: dùng "callback ref" thay vì useRef+useEffect([]) — lúc trang mới mở, vài
  // lần render đầu có thể vẫn đang ở giao diện "đang tải/kiểm tra đăng nhập" (contentRef
  // chưa tồn tại trong DOM lúc đó), effect với dependency [] chạy 1 lần rồi thôi, không
  // bao giờ thử gắn lại khi giao diện chat thật sự xuất hiện sau đó. Callback ref tự động
  // được gọi lại đúng lúc phần tử thật sự được gắn vào DOM, dù sớm hay trễ.
  const contentRef = (node: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    if (node) {
      const ro = new ResizeObserver(() => {
        if (pinnedToBottomRef.current) endRef.current?.scrollIntoView({ behavior: "auto" });
      });
      ro.observe(node);
      resizeObserverRef.current = ro;
    }
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    pinnedToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadReactions = async (messageIds: string[]) => {
    if (!messageIds.length) {
      setReactions({});
      return;
    }
    const { data } = await supabase
      .from("message_reactions")
      .select("message_id, user_id, emoji")
      .in("message_id", messageIds);
    const grouped: Record<string, Record<string, string[]>> = {};
    (data ?? []).forEach((r: any) => {
      grouped[r.message_id] ??= {};
      grouped[r.message_id][r.emoji] ??= [];
      grouped[r.message_id][r.emoji].push(r.user_id);
    });
    setReactions(grouped);
  };

  const loadMsgs = async (limit: number, scrollToBottom: boolean) => {
    if (!user || !id) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: false })
      .limit(limit);
    const list = ((data ?? []) as Message[]).reverse();
    setMsgs(list);
    setMsgHasMore(list.length === limit);
    void loadReactions(list.map((m) => m.id));
    if (scrollToBottom) {
      pinnedToBottomRef.current = true;
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "auto" }));
      // Không cần đoán thêm khoảng chờ nào nữa — ResizeObserver phía trên sẽ tự cuộn lại
      // đúng lúc ảnh/GIF thật sự tải xong, dù nhanh hay chậm.
    }
  };

  const loadCalls = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from("calls")
      .select("id, caller_id, callee_id, status, duration_seconds, created_at")
      .or(`and(caller_id.eq.${user.id},callee_id.eq.${id}),and(caller_id.eq.${id},callee_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    setCalls((data ?? []) as CallRow[]);
  };

  const loadOlderMsgs = async () => {
    setLoadingOlder(true);
    const next = msgLimit + MSG_PAGE_SIZE;
    setMsgLimit(next);
    await loadMsgs(next, false);
    setLoadingOlder(false);
  };

  // Đánh dấu ĐÃ ĐỌC mọi tin chưa đọc của đối phương trong đoạn chat này.
  // QUAN TRỌNG: không phụ thuộc riêng vào sự kiện Realtime UPDATE để hạ badge —
  // sau khi UPDATE thành công, cập nhật state tại chỗ + phát sự kiện toàn cục
  // "messages:read" để badge ở header (useUnreadMessages) tự đếm lại ngay.
  const markThreadRead = async () => {
    if (!user || !id) return;
    const { data, error } = await supabase
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("sender_id", id)
      .eq("receiver_id", user.id)
      .eq("is_read", false)
      .select("id");
    if (error) {
      console.error("[mark-read] lỗi:", error);
      return;
    }
    if (data?.length) {
      const ids = new Set(data.map((r: any) => r.id));
      setMsgs((prev) => prev.map((m) => (ids.has(m.id) ? { ...m, is_read: true } : m)));
    }
    window.dispatchEvent(new Event("messages:read"));
  };

  useEffect(() => {
    if (!user || !id) return;
    setMsgLimit(MSG_PAGE_SIZE);
    supabase
      .from("profiles_public")
      .select("id, full_name, username, avatar_url, status, points")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setPartner(data as Profile));
    supabase
      .rpc("get_admin_user_ids")
      .then(({ data }) => setPartnerIsAdmin((data ?? []).some((r: any) => r.user_id === id)));
    void loadMsgs(MSG_PAGE_SIZE, true);
    void loadCalls();
    void markThreadRead();
    // Thử lại khi người dùng quay lại tab/app (lần đầu có thể lỗi mạng hoặc token vừa hết hạn)
    const onFocus = () => {
      if (document.visibilityState === "visible") void markThreadRead();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    // QUAN TRỌNG (hiệu năng ở quy mô lớn): trước đây INSERT không lọc gì cả — MỌI tin nhắn
    // gửi ở BẤT KỲ đâu trong toàn app đều kích hoạt tải lại toàn bộ lịch sử đoạn chat này.
    // Giờ lọc theo sender_id ngay ở Postgres + xác nhận đúng cặp hội thoại ở client, và chỉ
    // thêm tin nhắn mới vào state thay vì tải lại từ đầu.
    const ch = supabase
      .channel(`thread:${user.id}:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${id}` },
        (payload) => {
          const row = payload.new as Message;
          if (row.receiver_id !== user.id) return;
          setMsgs((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          void markThreadRead();
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as Message;
          if (row.receiver_id !== id) return;
          setMsgs((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `sender_id=eq.${id}` },
        (payload) => {
          const row = payload.new as Message;
          setMsgs((prev) => prev.map((m) => (m.id === row.id ? row : m)));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `sender_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as Message;
          setMsgs((prev) => prev.map((m) => (m.id === row.id ? row : m)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `sender_id=eq.${id}` },
        (payload) => {
          const oldRow = payload.old as { id: string };
          setMsgs((prev) => prev.filter((m) => m.id !== oldRow.id));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `sender_id=eq.${user.id}` },
        (payload) => {
          const oldRow = payload.old as { id: string };
          setMsgs((prev) => prev.filter((m) => m.id !== oldRow.id));
        },
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" }, (payload) => {
        const r = payload.new as { message_id: string; user_id: string; emoji: string };
        setReactions((prev) => {
          const next = { ...prev };
          next[r.message_id] = { ...next[r.message_id] };
          const arr = next[r.message_id][r.emoji] ?? [];
          if (!arr.includes(r.user_id)) next[r.message_id][r.emoji] = [...arr, r.user_id];
          return next;
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" }, (payload) => {
        const r = payload.old as { message_id: string; user_id: string; emoji: string };
        setReactions((prev) => {
          if (!prev[r.message_id]?.[r.emoji]) return prev;
          const next = { ...prev };
          next[r.message_id] = { ...next[r.message_id] };
          next[r.message_id][r.emoji] = next[r.message_id][r.emoji].filter((id) => id !== r.user_id);
          return next;
        });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls", filter: `caller_id=eq.${id}` },
        (payload) => {
          const row = payload.new as CallRow;
          if (row.callee_id !== user.id) return;
          setCalls((prev) =>
            prev.some((c) => c.id === row.id) ? prev.map((c) => (c.id === row.id ? row : c)) : [...prev, row],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls", filter: `caller_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as CallRow;
          if (row.callee_id !== id) return;
          setCalls((prev) =>
            prev.some((c) => c.id === row.id) ? prev.map((c) => (c.id === row.id ? row : c)) : [...prev, row],
          );
        },
      )
      .subscribe();
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      supabase.removeChannel(ch);
    };
  }, [user?.id, id]);

  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">{t("community.needLogin")}</div>;
  if (!isApproved && !isAdmin)
    return <div className="p-8 text-center text-sm text-muted-foreground">{t("community.needApproval")}</div>;

  const cancelPendingImage = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
  };

  const pickImage = (file: File) => {
    const err = validateImage(file);
    if (err) {
      toast.error(err);
      return;
    }
    setPendingImage({ file, previewUrl: URL.createObjectURL(file) });
  };

  const sendGif = async (url: string) => {
    setShowGifs(false);
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: user.id, receiver_id: id, content: url, type: "gif", reply_to_id: replyingTo?.id ?? null })
      .select()
      .single();
    if (error) {
      toast.error(t("chat.sendGifFail") + ": " + error.message);
      return;
    }
    if (data) setMsgs((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]));
    setReplyingTo(null);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const send = async () => {
    if (pendingImage) {
      setUploading(true);
      try {
        const path = await uploadImage(pendingImage.file, "messages", user.id);
        const { data, error } = await supabase
          .from("messages")
          .insert({
            sender_id: user.id,
            receiver_id: id,
            content: "",
            type: "image",
            image_url: path,
            reply_to_id: replyingTo?.id ?? null,
          })
          .select()
          .single();
        if (error) throw error;
        if (data) setMsgs((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]));
        setReplyingTo(null);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        URL.revokeObjectURL(pendingImage.previewUrl);
        setPendingImage(null);
      } catch (e: any) {
        toast.error(e.message || t("chat.sendImageFail"));
      } finally {
        setUploading(false);
      }
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: id,
        content: trimmed,
        type: "text",
        reply_to_id: replyingTo?.id ?? null,
      })
      .select()
      .single();
    if (error) {
      toast.error(t("chat.sendFail") + ": " + error.message);
      setText(trimmed);
      return;
    }
    if (data) setMsgs((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]));
    setReplyingTo(null);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const startEdit = (m: Message) => {
    setEditingId(m.id);
    setEditText(m.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || !editingId) return;
    const { data, error } = await supabase
      .from("messages")
      .update({ content: trimmed, edited_at: new Date().toISOString() })
      .eq("id", editingId)
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) setMsgs((prev) => prev.map((m) => (m.id === data.id ? (data as Message) : m)));
    cancelEdit();
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    setReactionPickerFor(null);
    const already = reactions[messageId]?.[emoji]?.includes(user.id) ?? false;
    if (already) {
      await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
      setReactions((prev) => {
        const next = { ...prev };
        next[messageId] = { ...next[messageId] };
        next[messageId][emoji] = (next[messageId][emoji] ?? []).filter((id) => id !== user.id);
        return next;
      });
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
      setReactions((prev) => {
        const next = { ...prev };
        next[messageId] = { ...next[messageId] };
        next[messageId][emoji] = [...(next[messageId][emoji] ?? []), user.id];
        return next;
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-var(--header-h,3.5rem)-var(--bottom-nav-h,5rem))]">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <button onClick={() => nav("/tin-nhan")}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={() => setQuickViewOpen(true)} className="shrink-0">
          <Avatar path={partner?.avatar_url} name={partner?.full_name} size={32} />
        </button>
        <button onClick={() => setQuickViewOpen(true)} className="flex items-center gap-1.5 min-w-0 text-left flex-1">
          <div className="font-semibold text-sm truncate hover:text-primary">{partner?.full_name || "…"}</div>
          {partner && <MemberLevelBadge points={(partner as any).points ?? 0} isAdmin={partnerIsAdmin} />}
        </button>
        {partner && (
          <button
            onClick={handleCall}
            className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${
              partnerOnline ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground"
            }`}
            aria-label={t("call.startCall")}
            title={partnerOnline ? t("call.startCall") : t("call.offline")}
          >
            <Phone className="w-4 h-4" />
          </button>
        )}
      </div>
      <ProfileQuickView userId={id} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-2">
        {msgs.length > 0 && msgHasMore && (
          <button
            onClick={loadOlderMsgs}
            disabled={loadingOlder}
            className="w-full py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent rounded-lg disabled:opacity-50"
          >
            {loadingOlder ? t("common.loading") : t("community.loadOlder")}
          </button>
        )}
        <div ref={contentRef}>
          {(() => {
            // Chỉ tìm 1 lần cho cả danh sách: tin nhắn CUỐI CÙNG của tôi đã được xem —
            // đúng hành vi Messenger/Zalo (không hiện "đã xem" dưới mọi tin, chỉ tin mới nhất).
            let lastSeenMineId: string | null = null;
            for (let i = msgs.length - 1; i >= 0; i--) {
              if (msgs[i].sender_id === user.id && msgs[i].read_at) {
                lastSeenMineId = msgs[i].id;
                break;
              }
            }
            const timeline: ({ kind: "message"; item: Message } | { kind: "call"; item: CallRow })[] = [
              ...msgs.map((mm) => ({ kind: "message" as const, item: mm })),
              ...calls.map((c) => ({ kind: "call" as const, item: c })),
            ].sort((a, b) => new Date(a.item.created_at).getTime() - new Date(b.item.created_at).getTime());
            return timeline.map((entry) => {
              if (entry.kind === "call") {
                const c = entry.item;
                const outgoing = c.caller_id === user.id;
                const missedByMe = !outgoing && (c.status === "missed" || c.status === "busy");
                const durMin = Math.floor((c.duration_seconds ?? 0) / 60);
                const durSec = (c.duration_seconds ?? 0) % 60;
                const header =
                  c.status === "answered"
                    ? outgoing
                      ? t("call.inline.outgoingAnswered")
                      : t("call.inline.incomingAnswered")
                    : t("call.inline.title");
                const sub =
                  c.status === "answered"
                    ? t("call.inline.durationLong", { m: durMin, s: durSec })
                    : c.status === "missed"
                      ? outgoing
                        ? t("call.inline.noAnswer")
                        : t("call.inline.missedSub")
                      : c.status === "declined"
                        ? outgoing
                          ? t("call.inline.theyDeclined")
                          : t("call.inline.youDeclinedSub")
                        : t("call.inline.busySub");
                return (
                  <div key={`call-${c.id}`} className={`flex ${outgoing ? "justify-end" : "justify-start"} my-1.5`}>
                    <div
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-card border max-w-[85%] ${
                        outgoing ? "rounded-br-sm" : "rounded-bl-sm"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${
                          missedByMe ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                        }`}
                      >
                        {missedByMe ? (
                          <PhoneMissed className="w-4 h-4" />
                        ) : outgoing ? (
                          <PhoneOutgoing className="w-4 h-4" />
                        ) : (
                          <PhoneIncoming className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-semibold ${missedByMe ? "text-destructive" : ""}`}>
                          {missedByMe ? t("call.inline.missedByMe") : header}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{sub}</div>
                      </div>
                      {partner && (
                        <button
                          onClick={() =>
                            startCall({ id: partner.id, full_name: partner.full_name, avatar_url: partner.avatar_url })
                          }
                          className="ml-1 text-xs font-semibold text-primary shrink-0"
                        >
                          {t("call.inline.callBack")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              const m = entry.item;
              const msgsById = new Map(msgs.map((mm) => [mm.id, mm]));
              const repliedMsg = m.reply_to_id ? msgsById.get(m.reply_to_id) : null;
              const mine = m.sender_id === user.id;
              const canDelete = mine || isAdmin;
              const isEditing = editingId === m.id;
              const showSeen = m.id === lastSeenMineId;
              return (
                <div key={m.id} className="flex flex-col">
                  {!isEditing && m.reply_to_id && (
                    <div
                      className={`mb-0.5 px-2 py-1 rounded-lg bg-muted/60 border-l-2 border-primary text-[11px] text-muted-foreground max-w-[220px] truncate ${mine ? "self-end" : "self-start"}`}
                    >
                      {repliedMsg
                        ? `${repliedMsg.sender_id === user.id ? t("community.you") : partner?.full_name || ""}: ${repliedMsg.type === "text" ? repliedMsg.content : repliedMsg.type === "gif" ? "🎬 GIF" : "📷 Ảnh"}`
                        : t("msg.originalDeleted")}
                    </div>
                  )}
                  <div className={`group flex items-end gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                    {!isEditing && (
                      <button
                        onClick={() => setReplyingTo(m)}
                        aria-label={t("msg.reply")}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground p-1"
                      >
                        <ReplyIcon className="w-3 h-3" />
                      </button>
                    )}
                    {mine && m.type === "text" && !isEditing && (
                      <button
                        onClick={() => startEdit(m)}
                        aria-label={t("msg.edit")}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground p-1"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    {canDelete && mine && !isEditing && (
                      <button
                        onClick={() => setConfirmDeleteId(m.id)}
                        aria-label={t("common.delete")}
                        className="opacity-0 group-hover:opacity-100 text-destructive p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    {isEditing ? (
                      <div className="flex items-center gap-1 max-w-[80%]">
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                          className="flex-1 px-3 py-2 rounded-2xl border bg-background text-sm"
                        />
                        <button
                          onClick={saveEdit}
                          aria-label={t("msg.editSave")}
                          className="w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          aria-label={t("msg.editCancel")}
                          className="w-7 h-7 rounded-full bg-muted grid place-items-center shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : m.type === "gif" ? (
                      <div className="flex flex-col items-center">
                        <img src={m.content} alt="GIF" className="max-w-[180px] rounded-xl" loading="lazy" />
                        <div className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(m.created_at, lang)}</div>
                      </div>
                    ) : m.type === "image" ? (
                      <div className="max-w-[220px]">
                        <StoredImage
                          path={m.image_url}
                          alt={t("chat.imageAlt")}
                          className="rounded-2xl w-full object-cover"
                        />
                        <div className={`text-[11px] mt-0.5 ${mine ? "text-right" : ""} text-muted-foreground`}>
                          {timeAgo(m.created_at, lang)}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"}`}
                      >
                        {m.content}
                        <div className={`text-[11px] mt-0.5 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                          {timeAgo(m.created_at, lang)}
                          {m.edited_at && <span className="italic"> {t("msg.edited")}</span>}
                        </div>
                      </div>
                    )}
                    {canDelete && !mine && !isEditing && (
                      <button
                        onClick={() => setConfirmDeleteId(m.id)}
                        aria-label={t("common.delete")}
                        className="opacity-0 group-hover:opacity-100 text-destructive p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {!isEditing && (
                    <div
                      className={`flex items-center gap-1 mt-0.5 flex-wrap ${mine ? "justify-end" : "justify-start"}`}
                    >
                      {Object.entries(reactions[m.id] ?? {})
                        .filter(([, ids]) => ids.length > 0)
                        .map(([emoji, ids]) => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(m.id, emoji)}
                            className={`text-[11px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${ids.includes(user.id) ? "bg-primary/10 border-primary text-primary" : "bg-muted border-transparent text-muted-foreground"}`}
                          >
                            <span>{emoji}</span>
                            <span>{ids.length}</span>
                          </button>
                        ))}
                      <Popover
                        open={reactionPickerFor === m.id}
                        onOpenChange={(v) => setReactionPickerFor(v ? m.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <button className="text-muted-foreground opacity-0 group-hover:opacity-100 transition p-0.5">
                            <SmilePlus className="w-3.5 h-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-1 flex gap-1" align="start">
                          {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((e) => (
                            <button
                              key={e}
                              onClick={() => toggleReaction(m.id, e)}
                              className="text-lg hover:scale-125 transition p-1"
                            >
                              {e}
                            </button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  {showSeen && m.read_at && (
                    <div className="text-[10px] text-muted-foreground text-right mt-0.5">
                      {t("msg.seenAt", {
                        time: new Date(m.read_at).toLocaleTimeString(lang === "vi" ? "vi-VN" : "en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }),
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
          <div ref={endRef} />
        </div>
      </div>
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-t bg-muted/40">
          <div className="text-xs min-w-0">
            <span className="font-semibold text-primary">{t("msg.replyingTo")} </span>
            <span className="text-muted-foreground truncate">
              {replyingTo.sender_id === user.id ? t("community.you") : partner?.full_name || ""}:{" "}
              {replyingTo.type === "text"
                ? replyingTo.content
                : replyingTo.type === "gif"
                  ? "🎬 GIF"
                  : `📷 ${t("chat.imageAlt")}`}
            </span>
          </div>
          <button onClick={() => setReplyingTo(null)} aria-label={t("msg.editCancel")} className="shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}
      {pendingImage && (
        <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/40">
          <div className="relative">
            <img
              src={pendingImage.previewUrl}
              alt={t("chat.previewAlt")}
              className="w-16 h-16 object-cover rounded-lg border"
            />
            <button
              onClick={cancelPendingImage}
              aria-label={t("common.cancel")}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white grid place-items-center text-xs leading-none"
            >
              ×
            </button>
          </div>
          <span className="text-xs text-muted-foreground">{t("community.tapToShare")}</span>
        </div>
      )}
      {showGifs && <GifPicker onSelect={sendGif} />}
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
          aria-label={t("chat.pickImage")}
          className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center text-muted-foreground shrink-0"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowGifs((v) => !v)}
          aria-label="GIF"
          className={`w-9 h-9 rounded-full hover:bg-accent grid place-items-center shrink-0 ${showGifs ? "bg-accent" : "text-muted-foreground"}`}
        >
          <Smile className="w-5 h-5" />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          disabled={!!pendingImage}
          placeholder={pendingImage ? t("community.tapSendPlaceholder") : t("messages.inputPlaceholder")}
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
            <AlertDialogTitle>{t("messages.deleteMsgTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("messages.deleteMsgDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDeleteId) {
                  const { error } = await supabase.from("messages").delete().eq("id", confirmDeleteId);
                  if (error) {
                    toast.error(error.message);
                  } else {
                    setMsgs((prev) => prev.filter((m) => m.id !== confirmDeleteId));
                  }
                }
                setConfirmDeleteId(null);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface FollowUser {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
}

function FollowsTab({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [followingBiz, setFollowingBiz] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Thêm .range() phòng trường hợp 1 người follow/được follow rất nhiều (>1000) — trước
      // đây không giới hạn gì, dễ bị Supabase âm thầm cắt bớt khi vượt ngưỡng mặc định.
      const [{ data: outRows }, { data: inRows }] = await Promise.all([
        supabase
          .from("follows")
          .select("followee_user_id, followee_business_id")
          .eq("follower_id", userId)
          .range(0, 4999),
        supabase.from("follows").select("follower_id").eq("followee_user_id", userId).range(0, 4999),
      ]);
      const outUserIds = (outRows ?? []).map((r: any) => r.followee_user_id).filter(Boolean);
      const outBizIds = (outRows ?? []).map((r: any) => r.followee_business_id).filter(Boolean);
      const inIds = (inRows ?? []).map((r: any) => r.follower_id).filter(Boolean);

      const [outUsersRes, inUsersRes, outBizRes] = await Promise.all([
        outUserIds.length
          ? supabase.from("profiles_public").select("id, full_name, username, avatar_url").in("id", outUserIds)
          : Promise.resolve({ data: [] } as any),
        inIds.length
          ? supabase.from("profiles_public").select("id, full_name, username, avatar_url").in("id", inIds)
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

  if (loading) return <p className="text-sm text-center py-12 text-muted-foreground">{t("common.loading")}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold mb-2">
          {t("messages.followingHeader")} ({following.length + followingBiz.length})
        </h2>
        {following.length === 0 && followingBiz.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">{t("messages.notFollowingAnyone")}</p>
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
                  <MessageCircle className="w-3 h-3" /> {t("biz.message")}
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
                    <MessageCircle className="w-3 h-3" /> {t("messages.messageOwner")}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold mb-2">
          {t("messages.followersHeader")} ({followers.length})
        </h2>
        {followers.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">{t("messages.noFollowers")}</p>
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
                  <MessageCircle className="w-3 h-3" /> {t("biz.message")}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
