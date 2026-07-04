import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/time";
import { STICKERS } from "@/lib/stickers";
import { uploadImage } from "@/lib/upload";
import { StoredImage } from "@/components/StoredImage";
import { Image as ImageIcon, Smile } from "lucide-react";

interface ProfLite {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
}
interface Msg {
  id: string;
  user_id: string;
  content: string;
  type: "text" | "image" | "sticker";
  image_url: string | null;
  created_at: string;
}

export default function Community() {
  const { user, isApproved, isAdmin } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [showStickers, setShowStickers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [profMap, setProfMap] = useState<Map<string, ProfLite>>(new Map());
  const [members, setMembers] = useState<ProfLite[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const enrichProfiles = async (ids: string[]) => {
    const missing = ids.filter((id) => !profMap.has(id));
    if (!missing.length) return;
    const { data } = await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", missing);
    setProfMap((prev) => {
      const n = new Map(prev);
      (data ?? []).forEach((p: any) => n.set(p.id, p));
      return n;
    });
  };

  const loadMsgs = async () => {
    const { data } = await supabase
      .from("community_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);
    const list = (data ?? []) as Msg[];
    setMsgs(list);
    void enrichProfiles([...new Set(list.map((m) => m.user_id))]);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200);
    setMembers((data ?? []) as ProfLite[]);
  };

  useEffect(() => {
    if (!user) return;
    loadMsgs();
    loadMembers();
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

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    const { error } = await supabase.from("community_messages").insert({ user_id: user.id, content: t, type: "text" });
    if (error) {
      toast.error(error.message);
      setText(t);
    }
  };

  const sendSticker = async (emoji: string) => {
    setShowStickers(false);
    const { error } = await supabase
      .from("community_messages")
      .insert({ user_id: user.id, content: emoji, type: "sticker" });
    if (error) toast.error("Gửi sticker thất bại: " + error.message);
  };

  const sendImage = async (file: File) => {
    setUploading(true);
    try {
      const path = await uploadImage(file, "community", user.id);
      const { error } = await supabase
        .from("community_messages")
        .insert({ user_id: user.id, content: "", type: "image", image_url: path });
      if (error) throw error;
    } catch (e: any) {
      toast.error(e.message || "Gửi ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Xóa tin nhắn này?")) return;
    const { error } = await supabase.from("community_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-5rem)]">
      {/* Group chat — 60% */}
      <section className="flex flex-col" style={{ height: "60%" }}>
        <div className="px-3 py-2 border-b bg-card font-bold text-sm">💬 Nhóm cộng đồng</div>
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
                  <Avatar path={p?.avatar_url} name={p?.full_name} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="font-semibold truncate">{p?.full_name || "Thành viên"}</span>
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
                    <div
                      className={`text-sm rounded-xl px-3 py-1.5 mt-0.5 inline-block max-w-full break-words ${mine ? "bg-primary text-primary-foreground" : "bg-card border"}`}
                    >
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>
        <div className="flex gap-2 p-2 border-t bg-card">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Nhập tin nhắn cộng đồng…"
            className="flex-1 px-3 py-2 rounded-full border bg-background text-sm"
          />
          <button
            onClick={send}
            aria-label="Gửi"
            className="w-10 h-10 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Member list — 40% */}
      <section className="flex flex-col border-t" style={{ height: "40%" }}>
        <div className="px-3 py-2 border-b bg-card font-bold text-sm">👥 Thành viên ({members.length})</div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {members.map((m) => (
            <Link
              key={m.id}
              to={m.id === user.id ? "/ho-so" : `/tin-nhan/${m.id}`}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent"
            >
              <Avatar path={m.avatar_url} name={m.full_name} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {m.full_name}
                  {m.id === user.id && <span className="text-[10px] text-muted-foreground ml-1">(bạn)</span>}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">@{m.username}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
