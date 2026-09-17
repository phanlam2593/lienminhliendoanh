import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Message, Profile } from "@/lib/types";
import { timeAgo } from "@/lib/time";
import { GifPicker } from "@/components/GifPicker";
import { useCallback, useEffect, useLayoutEffect, useState, useRef } from "react";
import { uploadImage, validateImage } from "@/lib/upload";
import { StoredImage } from "@/components/StoredImage";
import { Image as ImageIcon, Smile, SmilePlus } from "lucide-react";
import {
  ArrowLeft,
  Send,
  Trash2,
  Pencil,
  Check,
  X,
  Reply as ReplyIcon,
  Phone,
  Video,
  PhoneMissed,
  PhoneIncoming,
  PhoneOutgoing,
  MoreVertical,
  Ban,
  ShieldCheck,
  Pin,
  PinOff,
  Bell,
  BellOff,
  Search,
  Images,
  Link2,
  Play,
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";

interface ConvoSummary {
  partnerId: string;
  partner?: Pick<Profile, "id" | "full_name" | "username" | "avatar_url" | "points" | "status_message">;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

interface CallRow {
  id: string;
  caller_id: string;
  callee_id: string;
  status: "answered" | "missed" | "declined" | "busy";
  call_type: "voice" | "video";
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
  c: { status: string; duration_seconds: number | null; call_type?: string },
  outgoing: boolean,
  tr: (k: string, params?: any) => string,
): string {
  const icon = c.call_type === "video" ? "📹" : "📞";
  if (c.status === "answered") return `${icon} ${tr("callHistory.answered")}`;
  if (c.status === "missed")
    return outgoing ? `${icon} ${tr("call.inline.noAnswer")}` : `${icon} ${tr("callHistory.missed")}`;
  if (c.status === "declined")
    return outgoing ? `${icon} ${tr("callHistory.declinedByThem")}` : `${icon} ${tr("callHistory.youDeclined")}`;
  if (c.status === "busy") return `${icon} ${tr("callHistory.busy")}`;
  return `${icon} ${tr("call.inline.title")}`;
}

// --- Xu ly link trong tin nhan: tu bam duoc, tu nhung video Youtube, tu lay preview website (giong FB) ---

function linkifyContent(text: string) {
  const re = /(https?:\/\/[^\s]+)/g;
  const nodes: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index));
    const raw = m[0];
    const url = raw.replace(/[),.!?]+$/, "");
    const trail = raw.slice(url.length);
    nodes.push(
      <a
        key={`lnk-${key++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="underline break-all"
      >
        {url}
      </a>,
    );
    if (trail) nodes.push(trail);
    lastIndex = m.index + raw.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : text;
}

function extractFirstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s]+/);
  if (!m) return null;
  return m[0].replace(/[),.!?]+$/, "");
}

function getYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
    }
  } catch {
    /* khong phai URL hop le */
  }
  return null;
}

function YoutubeEmbed({ videoId }: { videoId: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative w-64 aspect-video rounded-xl overflow-hidden bg-muted">
      {playing ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="w-full h-full relative block">
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="YouTube"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <span className="absolute inset-0 grid place-items-center bg-black/25">
            <span className="w-12 h-12 rounded-full bg-white/90 grid place-items-center">
              <Play className="w-6 h-6 ml-0.5" fill="black" stroke="black" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

type LinkMetaData = { title?: string; description?: string; image?: string; siteName?: string; url: string };
const linkPreviewCache = new Map<string, LinkMetaData | null>();

function LinkPreviewCard({ url }: { url: string }) {
  const [meta, setMeta] = useState<LinkMetaData | null | undefined>(() => linkPreviewCache.get(url));

  useEffect(() => {
    if (linkPreviewCache.has(url)) {
      setMeta(linkPreviewCache.get(url) ?? null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("link-preview", { body: { url } });
      if (cancelled) return;
      const ok = !error && data && !data.error && (data.title || data.image);
      const result: LinkMetaData | null = ok ? (data as LinkMetaData) : null;
      linkPreviewCache.set(url, result);
      setMeta(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!meta) return null;

  let domain = "";
  try {
    domain = new URL(meta.url || url).hostname.replace(/^www\./, "");
  } catch {
    domain = url;
  }

  return (
    <a
      href={meta.url || url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-2 w-64 rounded-xl border bg-card overflow-hidden hover:opacity-90"
    >
      {meta.image ? (
        <img src={meta.image} alt="" className="w-14 h-14 object-cover shrink-0" loading="lazy" />
      ) : (
        <div className="w-14 h-14 shrink-0 bg-muted grid place-items-center">
          <Link2 className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 py-1.5 pr-2">
        {meta.title && <div className="text-xs font-semibold line-clamp-2">{meta.title}</div>}
        <div className="text-[10px] text-muted-foreground truncate mt-0.5">{domain}</div>
      </div>
    </a>
  );
}

function ChatLinkPreview({ text }: { text: string }) {
  const url = extractFirstUrl(text);
  if (!url) return null;
  const ytId = getYoutubeId(url);
  if (ytId) return <YoutubeEmbed videoId={ytId} />;
  return <LinkPreviewCard url={url} />;
}

export function MessagesInbox() {
  const { user, profile, isApproved, isAdmin, loading: authLoading, refresh } = useAuth();
  const { t, lang } = useLanguage();
  const [convos, setConvos] = useState<ConvoSummary[]>([]);
  const [convosLoading, setConvosLoading] = useState(true);
  const [confirmPartner, setConfirmPartner] = useState<ConvoSummary | null>(null);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const onlineUsers = useOnlineUsers();

  // Ghim/tắt thông báo/chặn theo từng người — lưu ở bảng riêng (message_pins/message_mutes/
  // blocks), KHÔNG đụng bảng messages. Tải 1 lần vì chỉ chính mình bấm mới đổi (#QUY TẮC state riêng).
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [actionSheetFor, setActionSheetFor] = useState<ConvoSummary | null>(null);
  const [confirmBlockFor, setConfirmBlockFor] = useState<ConvoSummary | null>(null);

  // Status cá nhân (kiểu "note" của FB) hiện ở đầu dải avatar đang hoạt động — dùng lại
  // field status_message đã có sẵn ở trang Cá nhân, sửa nhanh ngay tại đây qua popover.
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState("");

  useEffect(() => {
    setMyStatus(profile?.status_message ?? null);
  }, [profile?.status_message]);

  const saveMyStatus = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ status_message: statusDraft.trim() || null })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMyStatus(statusDraft.trim() || null);
    setStatusPopoverOpen(false);
    toast.success(t("common.saved"));
    void refresh();
  };

  // Nhấn-giữ ~500ms (không dịch ngón tay quá 10px) trên 1 dòng hội thoại để mở bảng tuỳ
  // chọn — giống Messenger/FB, thay cho nút thùng rác cố định hiện trước đây.
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const pressStart = useRef({ x: 0, y: 0 });

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const onRowPointerDown = (c: ConvoSummary, e: React.PointerEvent) => {
    pressStart.current = { x: e.clientX, y: e.clientY };
    longPressFired.current = false;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      if (navigator.vibrate) navigator.vibrate(12);
      setActionSheetFor(c);
    }, 500);
  };
  const onRowPointerMove = (e: React.PointerEvent) => {
    if (!longPressTimer.current) return;
    if (Math.abs(e.clientX - pressStart.current.x) > 10 || Math.abs(e.clientY - pressStart.current.y) > 10) {
      clearLongPress();
    }
  };
  const onRowPointerUp = () => clearLongPress();
  const onRowLinkClick = (e: React.MouseEvent) => {
    if (longPressFired.current) {
      e.preventDefault();
      longPressFired.current = false;
    }
  };

  const load = async () => {
    if (!user) return;
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(500);
    const { data: callRows } = await supabase
      .from("calls")
      .select("id, caller_id, callee_id, status, call_type, duration_seconds, created_at")
      .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
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

    // Nếu cuộc gọi gần nhất với 1 người MỚI HƠN tin nhắn gần nhất, hiện nó làm tin nhắn
    // cuối thay vì tin nhắn cũ — đúng kiểu Zalo/FB (kể cả khi 2 người chưa từng nhắn tin
    // với nhau, chỉ mới gọi).
    (callRows as any[] | null)?.forEach((c) => {
      const partnerId = c.caller_id === user.id ? c.callee_id : c.caller_id;
      const existing = map.get(partnerId);
      if (existing && new Date(existing.lastAt) >= new Date(c.created_at)) return;
      const outgoing = c.caller_id === user.id;
      const entry = existing ?? { partnerId, lastMessage: "", lastAt: c.created_at, unread: 0 };
      entry.lastMessage = callPreviewText(c, outgoing, t);
      entry.lastAt = c.created_at;
      map.set(partnerId, entry);
    });

    const ids = [...map.keys()];
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles_public")
        .select("id, full_name, username, avatar_url, points, status_message")
        .in("id", ids);
      (profs as any[] | null)?.forEach((p) => {
        if (map.has(p.id)) map.get(p.id)!.partner = p;
      });
    }
    setConvos([...map.values()].sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()));
    setConvosLoading(false);
  };

  const loadPrefs = useCallback(async () => {
    if (!user) return;
    const [{ data: pins }, { data: mutes }, { data: blks }] = await Promise.all([
      supabase.from("message_pins").select("partner_id").eq("user_id", user.id),
      supabase.from("message_mutes").select("muted_user_id").eq("user_id", user.id),
      supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
    ]);
    setPinnedIds(new Set((pins ?? []).map((r: any) => r.partner_id)));
    setMutedIds(new Set((mutes ?? []).map((r: any) => r.muted_user_id)));
    setBlockedIds(new Set((blks ?? []).map((r: any) => r.blocked_id)));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    load();
    loadPrefs();
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
      .on("postgres_changes", { event: "*", schema: "public", table: "calls", filter: `caller_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "calls", filter: `callee_id=eq.${user.id}` }, load)
      .subscribe();

    // Không chỉ dựa vào Realtime của bảng "calls" (độ trễ/độ tin cậy khó lường) — call.tsx
    // tự phát tín hiệu ngay khi 1 cuộc gọi vừa có kết quả, nghe thêm ở đây để chắc chắn
    // danh sách hội thoại luôn cập nhật kịp thời.
    const onCallLogged = () => load();
    window.addEventListener("call:logged", onCallLogged);

    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener("call:logged", onCallLogged);
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

  const togglePin = async (c: ConvoSummary) => {
    if (!user) return;
    const pinned = pinnedIds.has(c.partnerId);
    setActionSheetFor(null);
    if (pinned) {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        next.delete(c.partnerId);
        return next;
      });
      await supabase.from("message_pins").delete().eq("user_id", user.id).eq("partner_id", c.partnerId);
    } else {
      setPinnedIds((prev) => new Set(prev).add(c.partnerId));
      const { error } = await supabase.from("message_pins").insert({ user_id: user.id, partner_id: c.partnerId });
      if (error) {
        toast.error(error.message);
        setPinnedIds((prev) => {
          const next = new Set(prev);
          next.delete(c.partnerId);
          return next;
        });
      }
    }
  };

  const toggleMute = async (c: ConvoSummary) => {
    if (!user) return;
    const muted = mutedIds.has(c.partnerId);
    setActionSheetFor(null);
    if (muted) {
      setMutedIds((prev) => {
        const next = new Set(prev);
        next.delete(c.partnerId);
        return next;
      });
      const { error } = await supabase
        .from("message_mutes")
        .delete()
        .eq("user_id", user.id)
        .eq("muted_user_id", c.partnerId);
      if (!error) toast.success(t("messages.unmutedToast"));
    } else {
      setMutedIds((prev) => new Set(prev).add(c.partnerId));
      const { error } = await supabase.from("message_mutes").insert({ user_id: user.id, muted_user_id: c.partnerId });
      if (error) {
        toast.error(error.message);
        setMutedIds((prev) => {
          const next = new Set(prev);
          next.delete(c.partnerId);
          return next;
        });
      } else {
        toast.success(t("messages.mutedToast"));
      }
    }
  };

  const toggleBlock = (c: ConvoSummary) => {
    if (blockedIds.has(c.partnerId)) {
      setActionSheetFor(null);
      void unblockFromList(c);
    } else {
      setActionSheetFor(null);
      setConfirmBlockFor(c);
    }
  };

  const unblockFromList = async (c: ConvoSummary) => {
    if (!user) return;
    setBlockedIds((prev) => {
      const next = new Set(prev);
      next.delete(c.partnerId);
      return next;
    });
    const { error } = await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", c.partnerId);
    if (error) toast.error(error.message);
    else toast.success(t("block.unblocked"));
  };

  const confirmBlock = async () => {
    if (!confirmBlockFor || !user) return;
    const pid = confirmBlockFor.partnerId;
    const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: pid });
    setConfirmBlockFor(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBlockedIds((prev) => new Set(prev).add(pid));
    toast.success(t("block.blocked"));
  };

  // Bỏ dấu tiếng Việt đơn giản để tìm không cần gõ đúng dấu.
  const fold = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");

  const filteredConvos = search.trim()
    ? convos.filter((c) => {
        const hay = fold(`${c.partner?.full_name ?? ""} ${c.partner?.username ?? ""}`);
        return hay.includes(fold(search.trim()));
      })
    : convos;

  // Ghim lên đầu (không đổi thứ tự giữa các mục đã ghim), phần còn lại theo tin nhắn/cuộc
  // gọi gần nhất — không tính "chat nhiều/ít" ở ĐÂY (đã dùng cho dải hoạt động phía trên).
  const sortedConvos = [...filteredConvos].sort((a, b) => {
    const aPinned = pinnedIds.has(a.partnerId);
    const bPinned = pinnedIds.has(b.partnerId);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
  });

  // Dải "đang hoạt động" kiểu Messenger — online lên trước, rồi ai nhắn gần đây nhất
  // (một cách gián tiếp thể hiện hay chat với ai), tối đa 12 người để không tràn ngang.
  const activeStrip = [...convos]
    .sort((a, b) => {
      const aOn = onlineUsers.has(a.partnerId) ? 0 : 1;
      const bOn = onlineUsers.has(b.partnerId) ? 0 : 1;
      if (aOn !== bOn) return aOn - bOn;
      return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
    })
    .slice(0, 12);

  if (authLoading) return <div className="p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">{t("community.needLogin")}</div>;
  if (!isApproved && !isAdmin)
    return <div className="p-8 text-center text-sm text-muted-foreground">{t("community.needApproval")}</div>;

  return (
    <div className="p-4 space-y-2">
      {convosLoading ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </div>
      ) : convos.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-sm text-muted-foreground">{t("messages.noConversations")}</p>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("messages.searchPlaceholder")}
              className="pl-9 h-10 rounded-xl"
            />
          </div>

          {!search.trim() && (
            <div className="flex gap-3 overflow-x-auto pb-1 pt-7 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex flex-col items-center gap-1 shrink-0 w-16 relative">
                <Popover
                  open={statusPopoverOpen}
                  onOpenChange={(o) => {
                    setStatusPopoverOpen(o);
                    if (o) setStatusDraft(myStatus ?? "");
                  }}
                >
                  <PopoverTrigger asChild>
                    {myStatus ? (
                      <button type="button" className="absolute -top-7 left-1/2 -translate-x-1/2 max-w-[120px] z-10">
                        <span className="relative block px-2.5 py-1 rounded-2xl bg-card border border-border shadow-sm text-[10px] text-primary font-semibold italic break-words text-center">
                          {myStatus}
                          <span className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-2 h-2 bg-card border-b border-r border-border rotate-45" />
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={t("profile.statusPlaceholder")}
                        className="absolute top-8 left-8 w-5 h-5 rounded-full bg-primary text-primary-foreground grid place-items-center ring-2 ring-background text-xs font-bold z-10"
                      >
                        +
                      </button>
                    )}
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="start">
                    <div className="space-y-2">
                      <Input
                        value={statusDraft}
                        onChange={(e) => setStatusDraft(e.target.value)}
                        placeholder={t("profile.statusPlaceholder")}
                        maxLength={60}
                        className="h-9 text-sm"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setStatusPopoverOpen(false)}
                          className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-accent"
                        >
                          {t("common.cancel")}
                        </button>
                        <button
                          type="button"
                          onClick={saveMyStatus}
                          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold"
                        >
                          {t("common.save")}
                        </button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Link to={`/tin-nhan/${user.id}`}>
                  <Avatar path={profile?.avatar_url} name={profile?.full_name} size={48} />
                </Link>
                <div className="text-[10px] text-center truncate w-full text-muted-foreground">{t("messages.you")}</div>
              </div>

              {activeStrip.map((c) => (
                <Link
                  key={c.partnerId}
                  to={`/tin-nhan/${c.partnerId}`}
                  className="flex flex-col items-center gap-1 shrink-0 w-16 relative"
                >
                  {c.partner?.status_message && (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 max-w-[120px] z-10 block px-2.5 py-1 rounded-2xl bg-card border border-border shadow-sm text-[10px] text-primary font-semibold italic break-words text-center">
                      {c.partner.status_message}
                      <span className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-2 h-2 bg-card border-b border-r border-border rotate-45" />
                    </span>
                  )}
                  <div className="relative">
                    <Avatar path={c.partner?.avatar_url} name={c.partner?.full_name} size={48} />
                    {onlineUsers.has(c.partnerId) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-background" />
                    )}
                  </div>
                  <div className="text-[10px] text-center truncate w-full text-muted-foreground">
                    {c.partner?.full_name?.split(" ")[0] || t("messages.unknownUser")}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {sortedConvos.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">{t("messages.noConversations")}</p>
            </div>
          ) : (
            sortedConvos.map((c) => (
              <div
                key={c.partnerId}
                className="relative flex items-center gap-2 p-3 rounded-xl select-none active:bg-accent/60 transition-colors"
                onPointerDown={(e) => onRowPointerDown(c, e)}
                onPointerMove={onRowPointerMove}
                onPointerUp={onRowPointerUp}
                onPointerCancel={onRowPointerUp}
                onContextMenu={(e) => e.preventDefault()}
              >
                <Link
                  to={`/tin-nhan/${c.partnerId}`}
                  onClick={onRowLinkClick}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="relative shrink-0">
                    <Avatar path={c.partner?.avatar_url} name={c.partner?.full_name} size={40} />
                    {onlineUsers.has(c.partnerId) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {pinnedIds.has(c.partnerId) && (
                        <Pin className="w-3 h-3 text-primary shrink-0" aria-label={t("messages.pinnedTooltip")} />
                      )}
                      <div className="font-semibold text-sm truncate">
                        {c.partner?.full_name || t("messages.unknownUser")}
                      </div>
                      {c.partner && <MemberLevelBadge points={c.partner.points} isAdmin={adminIds.has(c.partnerId)} />}
                      {mutedIds.has(c.partnerId) && (
                        <BellOff
                          className="w-3.5 h-3.5 text-muted-foreground shrink-0"
                          aria-label={t("messages.mutedTooltip")}
                        />
                      )}
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
              </div>
            ))
          )}
        </>
      )}

      <Drawer open={!!actionSheetFor} onOpenChange={(v) => !v && setActionSheetFor(null)}>
        <DrawerContent>
          <DrawerHeader className="flex flex-row items-center gap-3 text-left pb-2">
            <Avatar path={actionSheetFor?.partner?.avatar_url} name={actionSheetFor?.partner?.full_name} size={36} />
            <DrawerTitle className="text-base">
              {actionSheetFor?.partner?.full_name || t("messages.unknownUser")}
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-2 pb-6 space-y-1">
            {actionSheetFor && (
              <>
                <button
                  onClick={() => togglePin(actionSheetFor)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold hover:bg-accent text-left"
                >
                  {pinnedIds.has(actionSheetFor.partnerId) ? (
                    <>
                      <PinOff className="w-4 h-4" /> {t("messages.unpinConvo")}
                    </>
                  ) : (
                    <>
                      <Pin className="w-4 h-4" /> {t("messages.pinConvo")}
                    </>
                  )}
                </button>
                <button
                  onClick={() => toggleMute(actionSheetFor)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold hover:bg-accent text-left"
                >
                  {mutedIds.has(actionSheetFor.partnerId) ? (
                    <>
                      <Bell className="w-4 h-4" /> {t("messages.unmuteConvo")}
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4" /> {t("messages.muteConvo")}
                    </>
                  )}
                </button>
                <button
                  onClick={() => toggleBlock(actionSheetFor)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold hover:bg-accent text-destructive text-left"
                >
                  {blockedIds.has(actionSheetFor.partnerId) ? (
                    <>
                      <ShieldCheck className="w-4 h-4" /> {t("block.unblock")}
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" /> {t("block.block")}
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setConfirmPartner(actionSheetFor);
                    setActionSheetFor(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold hover:bg-accent text-destructive text-left"
                >
                  <Trash2 className="w-4 h-4" /> {t("messages.deleteConvo")}
                </button>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

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

      <AlertDialog open={!!confirmBlockFor} onOpenChange={(v) => !v && setConfirmBlockFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("block.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("block.confirmDesc", { name: confirmBlockFor?.partner?.full_name || t("messages.thisUser") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBlock} className="bg-destructive hover:bg-destructive/90">
              {t("block.block")}
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
  const { user, isApproved, isAdmin, loading: authLoading } = useAuth();
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
  const handleVideoCall = () => {
    if (!partner) return;
    if (!partnerOnline) {
      toast(t("call.offline"));
      return;
    }
    startCall({ id: partner.id, full_name: partner.full_name, avatar_url: partner.avatar_url }, { video: true });
  };
  const [partner, setPartner] = useState<Profile | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(true);
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
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [iMutedThem, setIMutedThem] = useState(false);
  const [confirmDeleteConvoOpen, setConfirmDeleteConvoOpen] = useState(false);
  const [allMediaOpen, setAllMediaOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<
    { id: string; type: string; content: string; image_url: string | null }[]
  >([]);
  const [mediaLoading, setMediaLoading] = useState(false);
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
  // QUAN TRONG: boc useCallback([]) de giu NGUYEN danh tinh ham qua moi lan render --
  // neu khong, moi lan component re-render (don dap luc moi mo trang: setPartner, setMsgs,
  // setCalls, setIBlockedThem... moi cai mot luot render rieng do la cac call bat dong bo
  // khac nhau) React coi day la "ref khac nen" thao roi gan lai ResizeObserver lien tuc, co
  // the huy mat lan thong bao kich thuoc DAU TIEN truoc khi no kip ban ra -- day chinh la ly
  // do tu cuon xuong day doi khi khong an o lan vao trang dau tien (nhung lan sau cac loi goi
  // API da nhanh/co san nen don lai thanh 1 lan render, tinh co khong gap loi).
  const contentRef = useCallback((node: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    if (node) {
      const ro = new ResizeObserver(() => {
        if (pinnedToBottomRef.current) scrollToBottom(false);
      });
      ro.observe(node);
      resizeObserverRef.current = ro;
    }
  }, []);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    pinnedToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // QUAN TRỌNG: dùng scrollTo() trực tiếp trên ĐÚNG khung cuộn tin nhắn, KHÔNG dùng
  // endRef.scrollIntoView() nữa — scrollIntoView() trên Safari/iOS có lỗi nổi tiếng là đôi
  // khi kéo lệch cả TRANG (che luôn phần tên/nút gọi ở trên) thay vì chỉ cuộn đúng khung
  // tin nhắn bên trong. scrollTo() trên chính khung đó thì không bao giờ ảnh hưởng ra ngoài.
  const scrollToBottom = (smooth = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  };

  // Dam bao cuon xuong cuoi ngay khi khung tin nhan THUC SU duoc gan vao DOM (vi du sau
  // khi man hinh "dang xac thuc" bien mat) -- rAF/setTimeout ben duoi co the chay truoc
  // luc do, khi scrollContainerRef con la null, nen can them 1 lop bao hiem nay.
  useEffect(() => {
    if (!authLoading && user && pinnedToBottomRef.current) scrollToBottom(false);
  }, [authLoading, user?.id]);

  // Cuon xuong cuoi NGAY SAU KHI React cap nhat xong DOM (truoc khi trinh duyet ve khung
  // hinh tiep theo) ngay luc tin nhan vua hien ra -- dung so lieu layout THUC TE tai thoi
  // diem do thay vi doan bang rAF/setTimeout nhu ben duoi.
  useLayoutEffect(() => {
    if (!msgsLoading && pinnedToBottomRef.current) scrollToBottom(false);
  }, [msgsLoading]);

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

  const loadMsgs = async (limit: number, shouldScrollToBottom: boolean) => {
    if (!user || !id) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: false })
      .limit(limit);
    const list = ((data ?? []) as Message[]).reverse();
    setMsgs(list);
    setMsgsLoading(false);
    setMsgHasMore(list.length === limit);
    void loadReactions(list.map((m) => m.id));
    if (shouldScrollToBottom) {
      pinnedToBottomRef.current = true;
      requestAnimationFrame(() => scrollToBottom(false));
      // ResizeObserver phia tren se tu cuon lai dung luc anh/GIF thuc su tai xong. Nhung
      // phong them truong hop rAF o tren chay dung luc scrollContainerRef CHUA gan vao DOM
      // (vi du dang o man hinh "dang tai/kiem tra dang nhap" luc vao trang lan dau) -- thu
      // lai vai lan bang setTimeout, vo hai neu da dung vi tri roi vi dich luon la day khung,
      // va tu huy neu nguoi dung da cuon len (pinnedToBottomRef thanh false).
      setTimeout(() => {
        if (pinnedToBottomRef.current) scrollToBottom(false);
      }, 150);
      setTimeout(() => {
        if (pinnedToBottomRef.current) scrollToBottom(false);
      }, 500);
      setTimeout(() => {
        if (pinnedToBottomRef.current) scrollToBottom(false);
      }, 1200);
    }
  };

  const loadCalls = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from("calls")
      .select("id, caller_id, callee_id, status, call_type, duration_seconds, created_at")
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
    supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", id)
      .maybeSingle()
      .then(({ data }) => setIBlockedThem(!!data));
    supabase
      .from("message_mutes")
      .select("id")
      .eq("user_id", user.id)
      .eq("muted_user_id", id)
      .maybeSingle()
      .then(({ data }) => setIMutedThem(!!data));
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
          setTimeout(() => scrollToBottom(true), 50);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as Message;
          if (row.receiver_id !== id) return;
          setMsgs((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          setTimeout(() => scrollToBottom(true), 50);
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

    // Không chỉ dựa vào Realtime của bảng "calls" — call.tsx tự phát tín hiệu ngay khi
    // cuộc gọi với ĐÚNG người đang chat cùng vừa có kết quả, nghe thêm để chắc chắn bong
    // bóng cuộc gọi cập nhật ngay, không cần thoát ra vào lại.
    const onCallLogged = (e: Event) => {
      const detail = (e as CustomEvent).detail as { peerId?: string } | undefined;
      if (detail?.peerId === id) void loadCalls();
    };
    window.addEventListener("call:logged", onCallLogged);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("call:logged", onCallLogged);
      supabase.removeChannel(ch);
    };
  }, [user?.id, id]);

  if (authLoading) return <div className="p-8 text-center text-sm text-muted-foreground">{t("common.loading")}</div>;
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
    setTimeout(() => scrollToBottom(true), 50);
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
        setTimeout(() => scrollToBottom(true), 50);
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
    setTimeout(() => scrollToBottom(true), 50);
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

  const blockUser = async () => {
    if (!partner) return;
    const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: partner.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    setIBlockedThem(true);
    setConfirmBlockOpen(false);
    toast.success(t("block.blocked"));
  };

  const unblockUser = async () => {
    if (!partner) return;
    const { error } = await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", partner.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setIBlockedThem(false);
    toast.success(t("block.unblocked"));
  };

  const toggleMuteThread = async () => {
    if (!user || !partner) return;
    if (iMutedThem) {
      setIMutedThem(false);
      const { error } = await supabase
        .from("message_mutes")
        .delete()
        .eq("user_id", user.id)
        .eq("muted_user_id", partner.id);
      if (!error) toast.success(t("messages.unmutedToast"));
    } else {
      setIMutedThem(true);
      const { error } = await supabase.from("message_mutes").insert({ user_id: user.id, muted_user_id: partner.id });
      if (error) {
        toast.error(error.message);
        setIMutedThem(false);
      } else {
        toast.success(t("messages.mutedToast"));
      }
    }
  };

  const deleteThisConvo = async () => {
    if (!user || !partner) return;
    const { error } = await supabase
      .from("messages")
      .delete()
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${user.id})`,
      );
    setConfirmDeleteConvoOpen(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("messages.convoDeleted"));
    nav("/tin-nhan");
  };

  const loadAllMedia = async () => {
    if (!user || !partner) return;
    setMediaLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("id, type, content, image_url, created_at")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partner.id}),and(sender_id.eq.${partner.id},receiver_id.eq.${user.id})`,
      )
      .eq("type", "image")
      .order("created_at", { ascending: false })
      .limit(200);
    setMediaItems((data as any[] | null) ?? []);
    setMediaLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(var(--vvh,100dvh)-var(--header-h,3.5rem)-var(--bottom-nav-h,5rem))]">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <button onClick={() => nav("/tin-nhan")}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={() => setQuickViewOpen(true)} className="shrink-0 relative">
          <Avatar path={partner?.avatar_url} name={partner?.full_name} size={32} />
          {partnerOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-background" />
          )}
        </button>
        <button onClick={() => setQuickViewOpen(true)} className="flex items-center gap-1.5 min-w-0 text-left flex-1">
          <div className="font-semibold text-sm truncate hover:text-primary">{partner?.full_name || "…"}</div>
          {partner && <MemberLevelBadge points={(partner as any).points ?? 0} isAdmin={partnerIsAdmin} />}
        </button>
        {partner && (
          <>
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
            <button
              onClick={handleVideoCall}
              className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${
                partnerOnline ? "bg-primary/10 text-primary" : "bg-accent text-muted-foreground"
              }`}
              aria-label={t("call.startVideoCall")}
              title={partnerOnline ? t("call.startVideoCall") : t("call.offline")}
            >
              <Video className="w-4 h-4" />
            </button>
          </>
        )}
        <Popover open={blockMenuOpen} onOpenChange={setBlockMenuOpen}>
          <PopoverTrigger asChild>
            <button
              className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center text-muted-foreground shrink-0"
              aria-label={t("block.menu")}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1" align="end">
            <button
              onClick={() => {
                setBlockMenuOpen(false);
                setAllMediaOpen(true);
                void loadAllMedia();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-semibold hover:bg-accent text-left"
            >
              <Images className="w-4 h-4" /> {t("messages.allMedia")}
            </button>
            <button
              onClick={() => {
                setBlockMenuOpen(false);
                toggleMuteThread();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-semibold hover:bg-accent text-left"
            >
              {iMutedThem ? (
                <>
                  <Bell className="w-4 h-4" /> {t("messages.unmuteConvo")}
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4" /> {t("messages.muteConvo")}
                </>
              )}
            </button>
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
            <button
              onClick={() => {
                setBlockMenuOpen(false);
                setConfirmDeleteConvoOpen(true);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-semibold hover:bg-accent text-destructive text-left"
            >
              <Trash2 className="w-4 h-4" /> {t("messages.deleteConvo")}
            </button>
          </PopoverContent>
        </Popover>
      </div>
      <AlertDialog open={confirmBlockOpen} onOpenChange={setConfirmBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("block.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("block.confirmDesc", { name: partner?.full_name || t("messages.thisUser") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={blockUser} className="bg-destructive hover:bg-destructive/90">
              {t("block.block")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteConvoOpen} onOpenChange={setConfirmDeleteConvoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("messages.deleteConvoTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("messages.deleteConvoDesc", { name: partner?.full_name || t("messages.thisUser") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteThisConvo} className="bg-destructive hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Drawer open={allMediaOpen} onOpenChange={setAllMediaOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>{t("messages.allMedia")}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {mediaLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
            ) : mediaItems.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">{t("messages.noMedia")}</div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {mediaItems.map((m) => (
                  <div key={m.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                    {m.type === "image" ? (
                      <StoredImage path={m.image_url} alt={t("chat.imageAlt")} className="w-full h-full object-cover" />
                    ) : (
                      <img src={m.content} alt="GIF" className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
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
          {msgsLoading ? (
            <p className="text-center text-xs text-muted-foreground py-6">{t("common.loading")}</p>
          ) : (
            (() => {
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
                  const isVideo = (c as any).call_type === "video";
                  const header =
                    c.status === "answered"
                      ? outgoing
                        ? t("call.inline.outgoingAnswered")
                        : t("call.inline.incomingAnswered")
                      : isVideo
                        ? t("call.inline.titleVideo")
                        : t("call.inline.title");
                  const sub =
                    c.status === "answered"
                      ? t("call.inline.durationLong", { m: durMin, s: durSec })
                      : c.status === "missed"
                        ? outgoing
                          ? t("call.inline.noAnswer")
                          : isVideo
                            ? t("call.inline.missedSubVideo")
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
                          {isVideo ? (
                            <Video className="w-4 h-4" />
                          ) : missedByMe ? (
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
                              startCall(
                                {
                                  id: partner.id,
                                  full_name: partner.full_name,
                                  avatar_url: partner.avatar_url,
                                },
                                { video: isVideo },
                              )
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
                        <div className={`flex flex-col gap-1 max-w-[75%] ${mine ? "items-end" : "items-start"}`}>
                          <div
                            className={`px-3 py-2 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"}`}
                          >
                            {linkifyContent(m.content)}
                            <div className={`text-[11px] mt-0.5 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                              {timeAgo(m.created_at, lang)}
                              {m.edited_at && <span className="italic"> {t("msg.edited")}</span>}
                            </div>
                          </div>
                          <ChatLinkPreview text={m.content} />
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
            })()
          )}
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
      {iBlockedThem && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t bg-muted/60 text-xs">
          <span className="text-muted-foreground">{t("block.bannerBlocked")}</span>
          <button onClick={unblockUser} className="font-semibold text-primary shrink-0">
            {t("block.unblock")}
          </button>
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
          disabled={uploading || iBlockedThem}
          aria-label={t("chat.pickImage")}
          className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center text-muted-foreground shrink-0"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowGifs((v) => !v)}
          disabled={iBlockedThem}
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
          disabled={!!pendingImage || iBlockedThem}
          placeholder={
            iBlockedThem
              ? t("block.bannerBlocked")
              : pendingImage
                ? t("community.tapSendPlaceholder")
                : t("messages.inputPlaceholder")
          }
          className="flex-1 px-3 py-2 rounded-full border bg-background text-sm disabled:opacity-60"
        />
        <button
          onClick={send}
          disabled={uploading || iBlockedThem}
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
