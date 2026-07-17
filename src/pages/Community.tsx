import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { Send, Trash2, Pencil, Check, X, Reply as ReplyIcon, AtSign } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/time";
import { uploadImage, validateImage } from "@/lib/upload";
import { StoredImage } from "@/components/StoredImage";
import { Image as ImageIcon, Smile, ChevronDown, ChevronUp, Users, MapPin, Hash, SmilePlus } from "lucide-react";
import {
  Popover as ReactionPopover,
  PopoverContent as ReactionPopoverContent,
  PopoverTrigger as ReactionPopoverTrigger,
} from "@/components/ui/popover";
import { MemberLevelBadge } from "@/components/MemberLevelBadge";
import { ProfileQuickView } from "@/components/ProfileQuickView";
import { GifPicker } from "@/components/GifPicker";
import { useOnlineUsers, useSetMyChannel } from "@/lib/onlineUsers";
import { useLanguage } from "@/lib/i18n";
import { extractArea } from "@/lib/location";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  type: "text" | "image" | "gif";
  image_url: string | null;
  created_at: string;
  edited_at: string | null;
  reply_to_id: string | null;
}

const MEMBER_PAGE_SIZE = 50;
const MSG_PAGE_SIZE = 50;
const TOPICS = ["general", "jobs", "marketplace", "housing", "game", "random", "sharing", "qna", "news"] as const;
type Topic = (typeof TOPICS)[number];
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const CHANNEL_STORAGE_KEY = "lmld:community:channel";
const LOCATIONS_CACHE_KEY = "lmld:community:locations";
const LOCATIONS_CACHE_TTL = 5 * 60 * 1000; // 5 phút

function readSavedChannel(): { location: string | null; topic: Topic } {
  try {
    const raw = sessionStorage.getItem(CHANNEL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (TOPICS.includes(parsed.topic)) return { location: parsed.location ?? null, topic: parsed.topic };
    }
  } catch {}
  return { location: null, topic: "general" };
}

export default function Community() {
  const { user, isApproved, isAdmin } = useAuth();
  const { t, lang } = useLanguage();
  const onlineUsers = useOnlineUsers();
  const setMyChannel = useSetMyChannel();
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
  const [showGifs, setShowGifs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [quickViewUser, setQuickViewUser] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  // reactions[message_id][emoji] = mảng user_id đã thả
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Msg | null>(null);
  const [showTagPicker, setShowTagPicker] = useState(false);
  // typingUsers[user_id] = {name, ts} — ts dùng để tự dọn sau vài giây không có tin mới
  const [typingUsers, setTypingUsers] = useState<Record<string, { name: string; ts: number }>>({});
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingBroadcastRef = useRef(0);
  const [locations, setLocations] = useState<string[]>([]);
  const [channelLocation, setChannelLocation] = useState<string | null>(() => readSavedChannel().location);
  const [channelTopic, setChannelTopic] = useState<Topic>(() => readSavedChannel().topic);
  const [locOpen, setLocOpen] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<{ location: string | null; topic: Topic }>({
    location: channelLocation,
    topic: channelTopic,
  });
  const msgLimitRef = useRef(msgLimit);

  useEffect(() => {
    channelRef.current = { location: channelLocation, topic: channelTopic };
  }, [channelLocation, channelTopic]);

  useEffect(() => {
    msgLimitRef.current = msgLimit;
  }, [msgLimit]);

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

  const loadReactions = async (messageIds: string[]) => {
    if (!messageIds.length) {
      setReactions({});
      return;
    }
    const { data } = await supabase
      .from("community_message_reactions")
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

  // QUAN TRỌNG (hiệu năng ở quy mô lớn): trước đây quét lại TOÀN BỘ doanh nghiệp mỗi lần
  // vào trang Cộng đồng để tính danh sách vị trí — lãng phí nếu vào ra liên tục trong
  // cùng 1 phiên. Cache 5 phút trong sessionStorage, chỉ tính lại khi hết hạn.
  const loadLocations = async () => {
    try {
      const cached = sessionStorage.getItem(LOCATIONS_CACHE_KEY);
      if (cached) {
        const { locations: cachedLocs, ts } = JSON.parse(cached);
        if (Date.now() - ts < LOCATIONS_CACHE_TTL) {
          setLocations(cachedLocs);
          return;
        }
      }
    } catch {}
    const { data } = await supabase.from("businesses").select("address").eq("status", "approved");
    const set = new Set<string>();
    (data ?? []).forEach((b: any) => set.add(extractArea(b.address)));
    const result = Array.from(set).sort();
    setLocations(result);
    try {
      sessionStorage.setItem(LOCATIONS_CACHE_KEY, JSON.stringify({ locations: result, ts: Date.now() }));
    } catch {}
  };

  const loadMsgs = async (limit = msgLimit, scrollToBottom = true, loc = channelLocation, topic = channelTopic) => {
    let q = supabase
      .from("community_messages")
      .select("*")
      .eq("topic", topic)
      .order("created_at", { ascending: false })
      .limit(limit);
    q = loc === null ? q.is("location", null) : q.eq("location", loc);
    const { data } = await q;
    const list = ((data ?? []) as Msg[]).reverse();
    setMsgs(list);
    setMsgHasMore(list.length === limit);
    void enrichProfiles([...new Set(list.map((m) => m.user_id))]);
    void loadReactions(list.map((m) => m.id));
    if (scrollToBottom) {
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const switchChannel = (loc: string | null, topic: Topic) => {
    setChannelLocation(loc);
    setChannelTopic(topic);
    setMsgLimit(MSG_PAGE_SIZE);
    void loadMsgs(MSG_PAGE_SIZE, true, loc, topic);
    setMyChannel(loc, topic);
    try {
      sessionStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify({ location: loc, topic }));
    } catch {}
  };

  const loadOlderMsgs = async () => {
    setLoadingOlderMsgs(true);
    const next = msgLimit + MSG_PAGE_SIZE;
    setMsgLimit(next);
    await loadMsgs(next, false);
    setLoadingOlderMsgs(false);
  };

  const loadMembers = async (pageNum = 0, append = false) => {
    setMemberLoadingMore(true);
    const from = pageNum * MEMBER_PAGE_SIZE;
    const to = from + MEMBER_PAGE_SIZE - 1;
    const { data, count } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, status_message, points", { count: "exact" })
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .range(from, to);
    const list = (data ?? []) as ProfLite[];
    setMemberTotal(count ?? 0);
    setMembers((prev) => {
      const merged = append ? [...prev, ...list] : list;
      merged.sort((a, b) => (a.id === user?.id ? -1 : b.id === user?.id ? 1 : 0));
      return merged;
    });
    setMemberHasMore(list.length === MEMBER_PAGE_SIZE);
    setMemberLoadingMore(false);
  };

  const loadMoreMembers = () => {
    const next = memberPage + 1;
    setMemberPage(next);
    void loadMembers(next, true);
  };

  useEffect(() => {
    if (!user) return;
    void loadMsgs(MSG_PAGE_SIZE, true, channelLocation, channelTopic);
    void loadMembers(0, false);
    void loadLocations();
    setMyChannel(channelLocation, channelTopic);
    supabase.rpc("get_admin_user_ids").then(({ data }) => {
      setAdminIds(new Set((data ?? []).map((r: any) => r.user_id)));
    });

    // Kênh "đang nhập" — dùng tên CHUNG cố định (không theo user.id như kênh tin nhắn),
    // vì broadcast chỉ tới được người khác nếu cùng tên kênh. Lọc đúng vị trí/chủ đề ở
    // client bằng channelRef.current, giống hệt cách lọc tin nhắn realtime đã làm.
    const typingCh = supabase
      .channel("community-typing")
      .on("broadcast", { event: "typing" }, (payload) => {
        const p = payload.payload as { userId: string; name: string; location: string | null; topic: Topic };
        if (p.userId === user.id) return;
        const { location, topic } = channelRef.current;
        if (p.topic !== topic) return;
        if (location === null ? p.location !== null : p.location !== location) return;
        setTypingUsers((prev) => ({ ...prev, [p.userId]: { name: p.name, ts: Date.now() } }));
      })
      .subscribe();
    typingChannelRef.current = typingCh;
    const cleanupInterval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const next: typeof prev = {};
        for (const [k, v] of Object.entries(prev)) if (now - v.ts < 4000) next[k] = v;
        return next;
      });
    }, 1000);

    const matchesCurrentChannel = (row: any) => {
      const { location, topic } = channelRef.current;
      if (row.topic !== topic) return false;
      return location === null ? row.location === null : row.location === location;
    };
    const ch = supabase
      .channel(`community:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages" }, (payload) => {
        const row = payload.new as Msg & { location: string | null; topic: Topic };
        if (!matchesCurrentChannel(row)) return;
        setMsgs((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        void enrichProfiles([row.user_id]);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_messages" }, (payload) => {
        const oldRow = payload.old as { id: string };
        setMsgs((prev) => prev.filter((m) => m.id !== oldRow.id));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_messages" }, (payload) => {
        const row = payload.new as Msg;
        setMsgs((prev) => prev.map((m) => (m.id === row.id ? row : m)));
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_message_reactions" },
        (payload) => {
          const r = payload.new as { message_id: string; user_id: string; emoji: string };
          setReactions((prev) => {
            const next = { ...prev };
            next[r.message_id] = { ...next[r.message_id] };
            const arr = next[r.message_id][r.emoji] ?? [];
            if (!arr.includes(r.user_id)) next[r.message_id][r.emoji] = [...arr, r.user_id];
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_message_reactions" },
        (payload) => {
          const r = payload.old as { message_id: string; user_id: string; emoji: string };
          setReactions((prev) => {
            if (!prev[r.message_id]?.[r.emoji]) return prev;
            const next = { ...prev };
            next[r.message_id] = { ...next[r.message_id] };
            next[r.message_id][r.emoji] = next[r.message_id][r.emoji].filter((id) => id !== r.user_id);
            return next;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(typingCh);
      clearInterval(cleanupInterval);
    };
  }, [user?.id]);

  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">{t("community.needLogin")}</div>;
  if (!isApproved)
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
    const base = { location: channelLocation, topic: channelTopic, reply_to_id: replyingTo?.id ?? null };
    const { data, error } = await supabase
      .from("community_messages")
      .insert({ user_id: user.id, content: url, type: "gif", ...base })
      .select()
      .single();
    if (error) {
      toast.error("Gửi GIF thất bại: " + error.message);
      return;
    }
    if (data) setMsgs((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Msg]));
    setReplyingTo(null);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const send = async () => {
    const base = { location: channelLocation, topic: channelTopic, reply_to_id: replyingTo?.id ?? null };
    if (pendingImage) {
      setUploading(true);
      try {
        const path = await uploadImage(pendingImage.file, "community", user.id);
        const { data, error } = await supabase
          .from("community_messages")
          .insert({ user_id: user.id, content: "", type: "image", image_url: path, ...base })
          .select()
          .single();
        if (error) throw error;
        if (data) setMsgs((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Msg]));
        setReplyingTo(null);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        URL.revokeObjectURL(pendingImage.previewUrl);
        setPendingImage(null);
      } catch (e: any) {
        toast.error(e.message || "Gửi ảnh thất bại");
      } finally {
        setUploading(false);
      }
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    const { data, error } = await supabase
      .from("community_messages")
      .insert({ user_id: user.id, content: trimmed, type: "text", ...base })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      setText(trimmed);
      return;
    }
    if (data) setMsgs((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Msg]));
    setReplyingTo(null);
    void notifyMentions(trimmed);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const del = async (id: string) => {
    if (!confirm("Xóa tin nhắn này?")) return;
    const { error } = await supabase.from("community_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  // Quét nội dung tìm @username khớp với thành viên ĐANG TẢI trong danh sách, tạo thông
  // báo riêng cho từng người (category=null để không bị gộp/đè — giống broadcast_offer).
  // Không báo cho chính người gửi nếu lỡ tự tag mình.
  const notifyMentions = async (content: string) => {
    const matches = [...content.matchAll(/@(\w+)/g)].map((m) => m[1]);
    if (!matches.length) return;
    const myName = profMap.get(user.id)?.full_name || user.email || "";
    const targets = members.filter((m) => matches.includes(m.username) && m.id !== user.id);
    if (!targets.length) return;
    const rows = targets.map((tgt) => ({
      user_id: tgt.id,
      type: "mention",
      category: null,
      title: t("tag.notifTitle", { name: myName }),
      body: content.slice(0, 100),
    }));
    await supabase.from("notifications").insert(rows);
  };

  const startEdit = (m: Msg) => {
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
      .from("community_messages")
      .update({ content: trimmed, edited_at: new Date().toISOString() })
      .eq("id", editingId)
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) setMsgs((prev) => prev.map((m) => (m.id === data.id ? (data as Msg) : m)));
    cancelEdit();
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    setReactionPickerFor(null);
    const already = reactions[messageId]?.[emoji]?.includes(user.id) ?? false;
    if (already) {
      await supabase
        .from("community_message_reactions")
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
      await supabase.from("community_message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
      setReactions((prev) => {
        const next = { ...prev };
        next[messageId] = { ...next[messageId] };
        next[messageId][emoji] = [...(next[messageId][emoji] ?? []), user.id];
        return next;
      });
    }
  };

  // Chỉ gửi tối đa 1 lần / 2 giây khi đang gõ liên tục — tránh spam broadcast không cần thiết
  const broadcastTyping = () => {
    const now = Date.now();
    if (now - lastTypingBroadcastRef.current < 2000) return;
    lastTypingBroadcastRef.current = now;
    const myName = profMap.get(user.id)?.full_name || user.email || "";
    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id, name: myName, location: channelLocation, topic: channelTopic },
    });
  };

  const typingList = Object.values(typingUsers);

  const onlineCount = members.filter((m) => onlineUsers.has(m.id)).length;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-5rem)]">
      {/* Bộ chọn kênh — 2 nút dropdown: Địa điểm + Kênh chat */}
      <div className="border-b bg-card shrink-0 px-3 py-2 flex gap-2">
        <Popover open={locOpen} onOpenChange={setLocOpen}>
          <PopoverTrigger asChild>
            <button className="flex-1 flex items-center justify-between gap-1 px-3 py-1.5 rounded-lg border bg-muted text-xs font-semibold min-w-0">
              <span className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span className="truncate">{channelLocation ?? t("channel.nationwide")}</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1 max-h-72 overflow-y-auto" align="start">
            <button
              onClick={() => {
                switchChannel(null, channelTopic);
                setLocOpen(false);
              }}
              className={`w-full text-left px-2.5 py-2 rounded-lg text-sm ${channelLocation === null ? "bg-accent font-semibold text-primary" : "hover:bg-accent"}`}
            >
              {t("channel.nationwide")}
            </button>
            {locations.map((loc) => (
              <button
                key={loc}
                onClick={() => {
                  switchChannel(loc, channelTopic);
                  setLocOpen(false);
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-sm ${channelLocation === loc ? "bg-accent font-semibold text-primary" : "hover:bg-accent"}`}
              >
                {loc}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <Popover open={topicOpen} onOpenChange={setTopicOpen}>
          <PopoverTrigger asChild>
            <button className="flex-1 flex items-center justify-between gap-1 px-3 py-1.5 rounded-lg border bg-muted text-xs font-semibold min-w-0">
              <span className="flex items-center gap-1.5 truncate">
                <Hash className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span className="truncate">{t(`channel.${channelTopic}`)}</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1 max-h-72 overflow-y-auto" align="start">
            {TOPICS.map((tp) => (
              <button
                key={tp}
                onClick={() => {
                  switchChannel(channelLocation, tp);
                  setTopicOpen(false);
                }}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-sm ${channelTopic === tp ? "bg-accent font-semibold text-primary" : "hover:bg-accent"}`}
              >
                {t(`channel.${tp}`)}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Danh sách thành viên — thu gọn mặc định, nằm trên khung chat */}
      <button
        onClick={() => setShowMembers((v) => !v)}
        className="flex items-center justify-between px-3 py-2 border-b bg-card shrink-0"
      >
        <span className="font-bold text-sm flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" /> {t("community.memberCount", { n: memberTotal })}
          <span className="text-emerald-600 font-semibold">{t("community.onlineCount", { n: onlineCount })}</span>
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
                  {m.id === user.id && <span className="text-[10px] text-muted-foreground">{t("community.you")}</span>}
                  <MemberLevelBadge points={m.points} isAdmin={adminIds.has(m.id)} />
                  {onlineUsers.has(m.id) && onlineUsers.get(m.id)?.topic && (
                    <span className="text-[10px] text-emerald-600 font-normal truncate">
                      · {onlineUsers.get(m.id)?.location ?? t("channel.nationwide")} ·{" "}
                      {t(`channel.${onlineUsers.get(m.id)!.topic}`)}
                    </span>
                  )}
                </div>
                {m.status_message && (
                  <div className="text-[11px] text-primary italic truncate font-medium">{m.status_message}</div>
                )}
              </div>
            </Link>
          ))}
          {memberHasMore && (
            <button
              onClick={loadMoreMembers}
              disabled={memberLoadingMore}
              className="w-full py-2 text-xs font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              {memberLoadingMore ? t("common.loading") : `${t("common.loadMore")} (${memberTotal - members.length})`}
            </button>
          )}
        </div>
      )}

      {/* Khung chat — chiếm phần còn lại */}
      <section className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {msgs.length > 0 && msgHasMore && (
            <button
              onClick={loadOlderMsgs}
              disabled={loadingOlderMsgs}
              className="w-full py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent rounded-lg disabled:opacity-50"
            >
              {loadingOlderMsgs ? t("common.loading") : t("community.loadOlder")}
            </button>
          )}
          {msgs.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">{t("community.noMessages")}</p>
          ) : (
            msgs.map((m) => {
              const msgsById = new Map(msgs.map((mm) => [mm.id, mm]));
              const repliedMsg = m.reply_to_id ? msgsById.get(m.reply_to_id) : null;
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
                        {p?.full_name || t("community.member")}
                      </button>
                      {p && <MemberLevelBadge points={p.points} isAdmin={adminIds.has(m.user_id)} />}
                      <span className="text-muted-foreground">{timeAgo(m.created_at, lang)}</span>
                      {m.edited_at && <span className="text-muted-foreground italic">{t("msg.edited")}</span>}
                      {editingId !== m.id && (
                        <button
                          onClick={() => setReplyingTo(m)}
                          aria-label={t("msg.reply")}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition text-muted-foreground"
                        >
                          <ReplyIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {mine && m.type === "text" && editingId !== m.id && (
                        <button
                          onClick={() => startEdit(m)}
                          aria-label={t("msg.edit")}
                          className="ml-auto opacity-0 group-hover:opacity-100 focus:opacity-100 transition text-muted-foreground"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => del(m.id)}
                          aria-label="Xóa"
                          className={`opacity-0 group-hover:opacity-100 focus:opacity-100 transition text-destructive ${mine && m.type === "text" ? "" : "ml-auto"}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {editingId !== m.id && m.reply_to_id && (
                      <div className="mt-0.5 px-2 py-1 rounded-lg bg-muted/60 border-l-2 border-primary text-[11px] text-muted-foreground max-w-[220px] truncate">
                        {repliedMsg
                          ? `${profMap.get(repliedMsg.user_id)?.full_name || t("community.member")}: ${repliedMsg.type === "text" ? repliedMsg.content : repliedMsg.type === "gif" ? "🎬 GIF" : "📷 Ảnh"}`
                          : t("msg.originalDeleted")}
                      </div>
                    )}
                    {editingId === m.id ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                          className="flex-1 px-2.5 py-1 rounded-lg border bg-background text-sm"
                        />
                        <button
                          onClick={saveEdit}
                          aria-label={t("msg.editSave")}
                          className="w-6 h-6 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          aria-label={t("msg.editCancel")}
                          className="w-6 h-6 rounded-full bg-muted grid place-items-center shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : m.type === "gif" ? (
                      <img src={m.content} alt="GIF" className="max-w-[180px] rounded-xl mt-0.5" loading="lazy" />
                    ) : m.type === "image" ? (
                      <div className="max-w-[200px] mt-0.5">
                        <StoredImage path={m.image_url} alt="Hình ảnh" className="rounded-xl w-full object-cover" />
                      </div>
                    ) : (
                      <div
                        className={`text-sm rounded-xl px-3 py-1.5 mt-0.5 inline-block max-w-full break-words ${mine ? "bg-primary text-primary-foreground" : "bg-card border"}`}
                      >
                        {m.content.split(/(@\w+)/g).map((part, i) =>
                          part.startsWith("@") && members.some((mb) => mb.username === part.slice(1)) ? (
                            <span key={i} className={`font-bold ${mine ? "underline" : "text-primary"}`}>
                              {part}
                            </span>
                          ) : (
                            part
                          ),
                        )}
                      </div>
                    )}
                    {editingId !== m.id && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
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
                        <ReactionPopover
                          open={reactionPickerFor === m.id}
                          onOpenChange={(v) => setReactionPickerFor(v ? m.id : null)}
                        >
                          <ReactionPopoverTrigger asChild>
                            <button className="text-muted-foreground opacity-0 group-hover:opacity-100 transition p-0.5">
                              <SmilePlus className="w-3.5 h-3.5" />
                            </button>
                          </ReactionPopoverTrigger>
                          <ReactionPopoverContent className="w-auto p-1 flex gap-1" align="start">
                            {REACTION_EMOJIS.map((e) => (
                              <button
                                key={e}
                                onClick={() => toggleReaction(m.id, e)}
                                className="text-lg hover:scale-125 transition p-1"
                              >
                                {e}
                              </button>
                            ))}
                          </ReactionPopoverContent>
                        </ReactionPopover>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>
        {replyingTo && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-t bg-muted/40">
            <div className="text-xs min-w-0">
              <span className="font-semibold text-primary">{t("msg.replyingTo")} </span>
              <span className="text-muted-foreground truncate">
                {profMap.get(replyingTo.user_id)?.full_name || t("community.member")}:{" "}
                {replyingTo.type === "text" ? replyingTo.content : replyingTo.type === "gif" ? "🎬 GIF" : "📷 Ảnh"}
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
              <img src={pendingImage.previewUrl} alt="Xem trước" className="w-16 h-16 object-cover rounded-lg border" />
              <button
                onClick={cancelPendingImage}
                aria-label="Hủy"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white grid place-items-center text-xs leading-none"
              >
                ×
              </button>
            </div>
            <span className="text-xs text-muted-foreground">{t("community.tapToShare")}</span>
          </div>
        )}
        {showGifs && <GifPicker onSelect={sendGif} />}
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
            onClick={() => setShowGifs((v) => !v)}
            aria-label="GIF"
            className={`w-9 h-9 rounded-full hover:bg-accent grid place-items-center shrink-0 ${showGifs ? "bg-accent" : "text-muted-foreground"}`}
          >
            <Smile className="w-5 h-5" />
          </button>
          <Popover open={showTagPicker} onOpenChange={setShowTagPicker}>
            <PopoverTrigger asChild>
              <button
                aria-label={t("tag.button")}
                className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center text-muted-foreground shrink-0"
              >
                <AtSign className="w-5 h-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1 max-h-64 overflow-y-auto" align="start">
              <p className="px-2 py-1 text-[11px] text-muted-foreground">{t("tag.pickMember")}</p>
              {members
                .filter((m) => m.id !== user.id)
                .map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setText((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}@${m.username} `);
                      setShowTagPicker(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent text-left"
                  >
                    <Avatar path={m.avatar_url} name={m.full_name} size={24} />
                    <span className="text-sm truncate">{m.full_name}</span>
                  </button>
                ))}
            </PopoverContent>
          </Popover>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            disabled={!!pendingImage}
            placeholder={pendingImage ? t("community.tapSendPlaceholder") : t("community.inputPlaceholder")}
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
