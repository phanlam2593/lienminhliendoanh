import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/time";
import { uploadImage, validateImage } from "@/lib/upload";
import { StoredImage } from "@/components/StoredImage";
import { Image as ImageIcon, Smile, ChevronDown, ChevronUp, Users, MapPin, Hash } from "lucide-react";
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
}

const MEMBER_PAGE_SIZE = 50;
const MSG_PAGE_SIZE = 50;
const TOPICS = ["general", "jobs", "marketplace", "housing", "game", "random", "sharing", "qna", "news"] as const;
type Topic = (typeof TOPICS)[number];
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
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
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
    const base = { location: channelLocation, topic: channelTopic };
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
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const send = async () => {
    const