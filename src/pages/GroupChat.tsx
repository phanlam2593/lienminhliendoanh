import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useGoBack } from "@/lib/navigation";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  Image as ImageIcon,
  LogOut,
  Pencil,
  Search,
  Send,
  Smile,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { timeAgo } from "@/lib/time";
import { uploadImage, validateImage } from "@/lib/upload";
import { Avatar } from "@/components/Avatar";
import { LightboxImage } from "@/components/ImageLightbox";
import { GifPicker } from "@/components/GifPicker";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { LoadingState } from "@/components/LoadingState";

// ─────────────────────────────────────────────────────────────────────────────
// CHAT NHÓM (#24) — tối đa 50 người/nhóm (chốt ở server trong create_group_chat /
// add_group_members). Người tạo là trưởng nhóm: đổi tên, thêm/mời ra thành viên.
// Bảng: group_chats / group_members / group_messages (RLS: chỉ thành viên đọc/gửi).
// ─────────────────────────────────────────────────────────────────────────────

const db = supabase as any;
export const GROUP_MAX_MEMBERS = 50;

interface Person {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface GroupRow {
  id: string;
  name: string;
  avatar_url: string | null;
  member_count: number;
  last_message_at: string;
  last_message: string | null;
  last_type: string | null;
  last_sender_name: string | null;
  unread: number;
  muted: boolean;
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string | null;
  content: string;
  type: "text" | "image" | "gif" | "system";
  image_url: string | null;
  created_at: string;
  edited_at: string | null;
}

interface MemberRow {
  user_id: string;
  role: "admin" | "member";
  muted: boolean;
}

function lastPreview(g: GroupRow, t: (k: string, p?: Record<string, string>) => string): string {
  if (!g.last_type) return t("group.noMessages");
  if (g.last_type === "system") return t("group.sysGeneric");
  const who = g.last_sender_name ? `${g.last_sender_name.split(" ").slice(-1)[0]}: ` : "";
  if (g.last_type === "image") return `${who}📷 ${t("chat.imageAlt")}`;
  if (g.last_type === "gif") return `${who}🎬 GIF`;
  return `${who}${g.last_message ?? ""}`;
}

// ── Ô chọn người (tìm theo tên/username) — dùng cho Tạo nhóm và Thêm thành viên ──
function PeoplePicker({
  selected,
  onChange,
  excludeIds,
  max,
}: {
  selected: Person[];
  onChange: (p: Person[]) => void;
  excludeIds: string[];
  max: number;
}) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [searching, setSearching] = useState(true);

  useEffect(() => {
    if (!user) return;
    const query = q.trim();
    setSearching(true);
    const handle = setTimeout(async () => {
      let rows: Person[] = [];
      if (query.length >= 2) {
        const safe = query.replace(/[%,()*]/g, " ");
        const { data } = await supabase
          .from("profiles_public")
          .select("id, full_name, username, avatar_url")
          .or(`full_name.ilike.%${safe}%,username.ilike.%${safe}%`)
          .neq("id", user.id)
          .limit(15);
        rows = (data ?? []) as Person[];
      } else {
        // Chưa gõ gì → gợi ý bạn bè (theo dõi qua lại) trước
        const { data } = await db.rpc("get_mutual_follows", { _uid: user.id });
        rows = ((data ?? []) as Person[]).slice(0, 15);
      }
      setResults(rows.filter((p) => !excludeIds.includes(p.id)));
      setSearching(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [q, user?.id, excludeIds.join(",")]);

  const toggle = (p: Person) => {
    if (selected.some((s) => s.id === p.id)) onChange(selected.filter((s) => s.id !== p.id));
    else if (selected.length < max) onChange([...selected, p]);
    else toast.error(t("group.full", { n: String(GROUP_MAX_MEMBERS) }));
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p)}
              className="h-7 pl-1 pr-2 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1"
            >
              <Avatar path={p.avatar_url} name={p.full_name} size={20} frame={false} />
              <span className="max-w-[90px] truncate">{p.full_name || p.username}</span>
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("group.searchPeople")}
          className="pl-9 h-10 rounded-xl"
        />
      </div>
      <div className="max-h-60 overflow-y-auto space-y-0.5">
        {searching && results.length === 0 ? (
          <LoadingState className="py-4" />
        ) : results.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4">{t("group.noPeople")}</p>
        ) : (
          results.map((p) => {
            const on = selected.some((s) => s.id === p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p)}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent text-left"
              >
                <Avatar path={p.avatar_url} name={p.full_name} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{p.full_name || p.username}</div>
                  {p.username && <div className="text-[11px] text-muted-foreground truncate">@{p.username}</div>}
                </div>
                <span
                  className={`w-5 h-5 rounded-full border-2 grid place-items-center shrink-0 ${on ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"}`}
                >
                  {on && <Check className="w-3 h-3" />}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Dialog tạo nhóm (mở từ trang Tin nhắn) ──
export function CreateGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useLanguage();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setPicked([]);
    }
  }, [open]);

  const create = async () => {
    if (!name.trim() || picked.length === 0 || busy) return;
    setBusy(true);
    const { data, error } = await db.rpc("create_group_chat", {
      _name: name.trim(),
      _member_ids: picked.map((p) => p.id),
    });
    setBusy(false);
    if (error) {
      toast.error(String(error.message).includes("GROUP_FULL") ? t("group.full", { n: String(GROUP_MAX_MEMBERS) }) : error.message);
      return;
    }
    onOpenChange(false);
    nav(`/tin-nhan/nhom/${data}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[94vw]">
        <DialogHeader>
          <DialogTitle>{t("group.create")}</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 60))}
          placeholder={t("group.namePlaceholder")}
          className="h-10 rounded-xl"
        />
        <PeoplePicker selected={picked} onChange={setPicked} excludeIds={[]} max={GROUP_MAX_MEMBERS - 1} />
        <button
          type="button"
          onClick={create}
          disabled={!name.trim() || picked.length === 0 || busy}
          className="w-full h-11 rounded-xl bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-50"
        >
          {busy ? t("common.loading") : t("group.createWithN", { n: String(picked.length + 1) })}
        </button>
      </DialogContent>
    </Dialog>
  );
}

// ── Danh sách nhóm hiện ở đầu trang Tin nhắn ──
export function GroupListSection({ search }: { search: string }) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [groups, setGroups] = useState<GroupRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await db.rpc("get_my_groups");
      setGroups((data ?? []) as GroupRow[]);
    };
    void load();
    const ch = supabase
      .channel(`groups-inbox:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `user_id=eq.${user.id}` }, () =>
        void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const fold = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d");
  const shown = search.trim() ? groups.filter((g) => fold(g.name).includes(fold(search.trim()))) : groups;
  if (shown.length === 0) return null;

  return (
    <div className="space-y-0.5">
      <div className="text-xs font-semibold text-muted-foreground px-1 pt-1">{t("group.groups")}</div>
      {shown.map((g) => (
        <Link
          key={g.id}
          to={`/tin-nhan/nhom/${g.id}`}
          className="flex items-center gap-3 p-3 rounded-xl active:bg-accent/60 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="font-semibold text-sm truncate">{g.name}</div>
              <span className="text-[10px] text-muted-foreground shrink-0">· {g.member_count}</span>
              {g.muted && <BellOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            </div>
            <div className={`text-xs truncate ${g.unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              {lastPreview(g, t)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground">{timeAgo(g.last_message_at, lang)}</div>
            {g.unread > 0 && (
              <div className="mt-1 inline-block min-w-4 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {g.unread}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Trang 1 nhóm chat: /tin-nhan/nhom/:gid ──
export default function GroupChat() {
  const { gid } = useParams();
  const nav = useNavigate();
  const goBack = useGoBack();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [group, setGroup] = useState<{ id: string; name: string; created_by: string } | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [msgs, setMsgs] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [toAdd, setToAdd] = useState<Person[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const me = members.find((m) => m.user_id === user?.id);
  const iAmAdmin = me?.role === "admin";

  const ensurePeople = async (ids: string[]) => {
    const missing = [...new Set(ids)].filter((id) => id && !people[id]);
    if (missing.length === 0) return;
    const { data } = await supabase.from("profiles_public").select("id, full_name, username, avatar_url").in("id", missing);
    setPeople((prev) => {
      const next = { ...prev };
      for (const p of (data ?? []) as Person[]) next[p.id] = p;
      return next;
    });
  };

  const markRead = async () => {
    if (!user || !gid) return;
    await db.from("group_members").update({ last_read_at: new Date().toISOString() }).eq("group_id", gid).eq("user_id", user.id);
    window.dispatchEvent(new Event("messages:read"));
  };

  const loadMembers = async () => {
    if (!gid) return;
    const { data } = await db.from("group_members").select("user_id, role, muted").eq("group_id", gid);
    const rows = (data ?? []) as MemberRow[];
    setMembers(rows);
    return rows;
  };

  useEffect(() => {
    if (!gid || !user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [{ data: g }, rows, { data: m }] = await Promise.all([
        db.from("group_chats").select("id, name, created_by").eq("id", gid).maybeSingle(),
        loadMembers(),
        db.from("group_messages").select("*").eq("group_id", gid).order("created_at", { ascending: false }).limit(100),
      ]);
      if (cancelled) return;
      if (!g) {
        toast.message(t("common.contentGone"));
        nav("/tin-nhan", { replace: true });
        return;
      }
      setGroup(g);
      const list = ((m ?? []) as GroupMessage[]).reverse();
      setMsgs(list);
      const ids = [
        ...(rows ?? []).map((r) => r.user_id),
        ...list.map((x) => x.sender_id ?? ""),
        ...list.filter((x) => x.type === "system" && x.content.includes(":")).map((x) => x.content.split(":")[1]),
      ];
      await ensurePeople(ids);
      setLoading(false);
      void markRead();
    })();

    const ch = supabase
      .channel(`group:${gid}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${gid}` }, (p: any) => {
        const row = p.new as GroupMessage;
        setMsgs((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row]));
        const extra = row.type === "system" && row.content.includes(":") ? [row.content.split(":")[1]] : [];
        void ensurePeople([row.sender_id ?? "", ...extra]);
        if (row.type === "system") void loadMembers();
        void markRead();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "group_messages", filter: `group_id=eq.${gid}` }, (p: any) =>
        setMsgs((prev) => prev.filter((x) => x.id !== p.old.id)),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "group_chats", filter: `id=eq.${gid}` }, (p: any) =>
        setGroup((prev) => (prev ? { ...prev, name: p.new.name } : prev)),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gid, user?.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, loading]);

  const nameOf = (id: string | null | undefined) => {
    if (!id) return t("messages.unknownUser");
    if (id === user?.id) return t("messages.you");
    return people[id]?.full_name || people[id]?.username || t("messages.unknownUser");
  };

  const systemText = (m: GroupMessage) => {
    const actor = nameOf(m.sender_id);
    if (m.content === "created") return t("group.sysCreated", { name: actor });
    if (m.content === "left") return t("group.sysLeft", { name: actor });
    if (m.content === "renamed") return t("group.sysRenamed", { name: actor });
    const [kind, target] = m.content.split(":");
    if (kind === "added") return t("group.sysAdded", { name: actor, target: nameOf(target) });
    if (kind === "removed") return t("group.sysRemoved", { name: actor, target: nameOf(target) });
    return t("group.sysGeneric");
  };

  const insertMessage = async (payload: Partial<GroupMessage>) => {
    if (!user || !gid) return false;
    const { data, error } = await db
      .from("group_messages")
      .insert({ group_id: gid, sender_id: user.id, ...payload })
      .select()
      .single();
    if (error) {
      toast.error(t("chat.sendFail") + ": " + error.message);
      return false;
    }
    if (data) setMsgs((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as GroupMessage]));
    return true;
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    const ok = await insertMessage({ content: trimmed.slice(0, 2000), type: "text" });
    if (!ok) setText(trimmed);
    setSending(false);
  };

  const sendGif = async (url: string) => {
    setShowGifs(false);
    await insertMessage({ content: url, type: "gif" });
  };

  const sendImage = async (f: File) => {
    const err = validateImage(f);
    if (err) return toast.error(err);
    setSending(true);
    try {
      const path = await uploadImage(f, "group-chat", user?.id);
      await insertMessage({ content: "", type: "image", image_url: path });
    } catch (e: any) {
      toast.error(e?.message ?? t("common.error"));
    }
    setSending(false);
  };

  const deleteMsg = async (id: string) => {
    const { error } = await db.from("group_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setMsgs((prev) => prev.filter((x) => x.id !== id));
  };

  const toggleMute = async () => {
    if (!me || !user || !gid) return;
    const next = !me.muted;
    await db.from("group_members").update({ muted: next }).eq("group_id", gid).eq("user_id", user.id);
    setMembers((prev) => prev.map((m) => (m.user_id === user.id ? { ...m, muted: next } : m)));
  };

  const rename = async () => {
    const n = newName.trim();
    if (!n || !gid) return;
    const { error } = await db.from("group_chats").update({ name: n.slice(0, 60) }).eq("id", gid);
    if (error) return toast.error(error.message);
    setGroup((g) => (g ? { ...g, name: n } : g));
    setRenaming(false);
  };

  const addMembers = async () => {
    if (!gid || toAdd.length === 0) return;
    const { error } = await db.rpc("add_group_members", { _gid: gid, _member_ids: toAdd.map((p) => p.id) });
    if (error) {
      toast.error(String(error.message).includes("GROUP_FULL") ? t("group.full", { n: String(GROUP_MAX_MEMBERS) }) : error.message);
      return;
    }
    await ensurePeople(toAdd.map((p) => p.id));
    setToAdd([]);
    setAddOpen(false);
    void loadMembers();
  };

  const removeMember = async (uid: string) => {
    if (!gid) return;
    const { error } = await db.rpc("remove_group_member", { _gid: gid, _user: uid });
    if (error) return toast.error(error.message);
    if (uid === user?.id) {
      toast.success(t("group.leftToast"));
      nav("/tin-nhan");
      return;
    }
    void loadMembers();
  };

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) =>
        a.role !== b.role ? (a.role === "admin" ? -1 : 1) : nameOf(a.user_id).localeCompare(nameOf(b.user_id)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, people],
  );

  return (
    <div className="flex flex-col h-[calc(var(--vvh,100dvh)-var(--header-h,3.5rem)-var(--bottom-nav-h,5rem))]">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <button onClick={() => goBack("/tin-nhan")} aria-label={t("common.back")}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <div className="w-8 h-8 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{group?.name ?? "…"}</div>
            <div className="text-[11px] text-muted-foreground">{t("group.membersCount", { n: String(members.length) })}</div>
          </div>
        </button>
        {me?.muted && <BellOff className="w-4 h-4 text-muted-foreground" />}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <LoadingState />
        ) : (
          msgs.map((m, i) => {
            if (m.type === "system") {
              return (
                <div key={m.id} className="text-center text-[11px] text-muted-foreground py-1">
                  {systemText(m)}
                </div>
              );
            }
            const mine = m.sender_id === user?.id;
            const prev = msgs[i - 1];
            const showName = !mine && (!prev || prev.sender_id !== m.sender_id || prev.type === "system");
            const sender = m.sender_id ? people[m.sender_id] : undefined;
            return (
              <div key={m.id} className={`group flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && (
                  <div className="w-7 shrink-0">
                    {showName && (
                      <Link to={`/ho-so/${m.sender_id}`}>
                        <Avatar path={sender?.avatar_url} name={sender?.full_name} size={28} />
                      </Link>
                    )}
                  </div>
                )}
                {mine && (
                  <button
                    onClick={() => void deleteMsg(m.id)}
                    aria-label={t("common.delete")}
                    className="opacity-0 group-hover:opacity-100 text-destructive p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <div className={`flex flex-col max-w-[75%] ${mine ? "items-end" : "items-start"}`}>
                  {showName && <div className="text-[11px] text-muted-foreground px-1 mb-0.5">{nameOf(m.sender_id)}</div>}
                  {m.type === "image" ? (
                    <div className="max-w-[220px]">
                      <LightboxImage
                        path={m.image_url}
                        alt={t("chat.imageAlt")}
                        className="rounded-2xl w-full object-cover"
                        buttonClassName="block w-full cursor-zoom-in"
                        download
                      />
                    </div>
                  ) : m.type === "gif" ? (
                    <img src={m.content} alt="GIF" className="max-w-[180px] rounded-xl" loading="lazy" />
                  ) : (
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"}`}
                    >
                      {m.content}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-0.5 px-1">{timeAgo(m.created_at, lang)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showGifs && <GifPicker onSelect={(u) => void sendGif(u)} />}
      <div className="flex gap-2 p-3 border-t bg-card items-center">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void sendImage(f);
            e.currentTarget.value = "";
          }}
        />
        {!text.trim() && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={sending || !me}
              aria-label={t("chat.pickImage")}
              className="w-9 h-9 rounded-full hover:bg-accent grid place-items-center text-muted-foreground shrink-0"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowGifs((v) => !v)}
              disabled={!me}
              aria-label="GIF"
              className={`w-9 h-9 rounded-full hover:bg-accent grid place-items-center shrink-0 ${showGifs ? "bg-accent" : "text-muted-foreground"}`}
            >
              <Smile className="w-5 h-5" />
            </button>
          </>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          disabled={!me}
          placeholder={me ? t("messages.inputPlaceholder") : t("group.notMember")}
          className="flex-1 min-w-0 px-3 py-2 rounded-full border bg-background text-base disabled:opacity-60"
        />
        <button
          onClick={() => void send()}
          disabled={sending || !me}
          aria-label={t("common.send")}
          className="w-10 h-10 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center shrink-0 disabled:opacity-60"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Cài đặt nhóm */}
      <Drawer open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left pb-2">
            {renaming ? (
              <div className="flex items-center gap-2">
                <Input value={newName} onChange={(e) => setNewName(e.target.value.slice(0, 60))} className="h-9" autoFocus />
                <button onClick={() => void rename()} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                  {t("common.save")}
                </button>
              </div>
            ) : (
              <DrawerTitle className="flex items-center gap-2">
                <span className="truncate">{group?.name}</span>
                {iAmAdmin && (
                  <button
                    onClick={() => {
                      setNewName(group?.name ?? "");
                      setRenaming(true);
                    }}
                    aria-label={t("group.rename")}
                    className="text-muted-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </DrawerTitle>
            )}
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => void toggleMute()}
                className="flex-1 h-10 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                {me?.muted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                {me?.muted ? t("messages.unmuteConvo") : t("messages.muteConvo")}
              </button>
              {iAmAdmin && members.length < GROUP_MAX_MEMBERS && (
                <button
                  onClick={() => setAddOpen(true)}
                  className="flex-1 h-10 rounded-xl bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> {t("group.addMembers")}
                </button>
              )}
            </div>
            <div className="text-xs font-semibold text-muted-foreground">
              {t("group.membersCount", { n: String(members.length) })} / {GROUP_MAX_MEMBERS}
            </div>
            <div className="space-y-0.5">
              {sortedMembers.map((m) => {
                const p = people[m.user_id];
                return (
                  <div key={m.user_id} className="flex items-center gap-2.5 p-2 rounded-lg">
                    <Link to={`/ho-so/${m.user_id}`} className="flex items-center gap-2.5 flex-1 min-w-0">
                      <Avatar path={p?.avatar_url} name={p?.full_name} size={36} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{nameOf(m.user_id)}</div>
                        {m.role === "admin" && <div className="text-[11px] text-primary font-semibold">{t("group.admin")}</div>}
                      </div>
                    </Link>
                    {iAmAdmin && m.user_id !== user?.id && (
                      <button
                        onClick={() => void removeMember(m.user_id)}
                        aria-label={t("group.removeMember")}
                        className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-destructive grid place-items-center"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {me && (
              <button
                onClick={() => user && void removeMember(user.id)}
                className="w-full h-10 rounded-xl border border-destructive/40 text-destructive text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" /> {t("group.leave")}
              </button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm w-[94vw]">
          <DialogHeader>
            <DialogTitle>{t("group.addMembers")}</DialogTitle>
          </DialogHeader>
          <PeoplePicker
            selected={toAdd}
            onChange={setToAdd}
            excludeIds={members.map((m) => m.user_id)}
            max={GROUP_MAX_MEMBERS - members.length}
          />
          <button
            onClick={() => void addMembers()}
            disabled={toAdd.length === 0}
            className="w-full h-11 rounded-xl bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-50"
          >
            {t("group.addN", { n: String(toAdd.length) })}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
