import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Message, Profile } from "@/lib/types";
import { timeAgo } from "@/lib/time";
import { ArrowLeft, Send } from "lucide-react";

interface ConvoSummary {
  partnerId: string;
  partner?: Pick<Profile, "id" | "full_name" | "username" | "avatar_url">;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

export function MessagesInbox() {
  const { user, isApproved, isAdmin } = useAuth();
  const [convos, setConvos] = useState<ConvoSummary[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: msgs } = await supabase.from("messages").select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      const map = new Map<string, ConvoSummary>();
      (msgs as Message[] | null)?.forEach(m => {
        const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!map.has(partnerId)) {
          map.set(partnerId, { partnerId, lastMessage: m.content, lastAt: m.created_at, unread: 0 });
        }
        if (m.receiver_id === user.id && !m.is_read) map.get(partnerId)!.unread += 1;
      });
      const ids = [...map.keys()];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", ids);
        (profs as any[] | null)?.forEach(p => { if (map.has(p.id)) map.get(p.id)!.partner = p; });
      }
      setConvos([...map.values()]);
    };
    load();
    const ch = supabase.channel(`inbox:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">Cần đăng nhập</div>;
  if (!isApproved && !isAdmin) return <div className="p-8 text-center text-sm text-muted-foreground">Tài khoản cần được duyệt</div>;

  return (
    <div className="p-4 space-y-2">
      <h1 className="text-xl font-extrabold mb-2">Tin nhắn</h1>
      {convos.length === 0 ? (
        <p className="text-sm text-center py-12 text-muted-foreground">Chưa có cuộc trò chuyện</p>
      ) : (
        convos.map(c => (
          <Link key={c.partnerId} to={`/tin-nhan/${c.partnerId}`} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-sm">
            <div className="w-10 h-10 rounded-full bg-gradient-brand text-white grid place-items-center font-bold">{(c.partner?.full_name || "?").slice(0, 1)}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{c.partner?.full_name || "Người dùng"}</div>
              <div className="text-xs text-muted-foreground truncate">{c.lastMessage}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">{timeAgo(c.lastAt)}</div>
              {c.unread > 0 && <div className="mt-1 inline-block min-w-4 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">{c.unread}</div>}
            </div>
          </Link>
        ))
      )}
    </div>
  );
}

export function MessagesThread() {
  const { id = "" } = useParams();
  const { user, isApproved, isAdmin } = useAuth();
  const nav = useNavigate();
  const [partner, setPartner] = useState<Profile | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !id) return;
    supabase.from("profiles").select("*").eq("id", id).maybeSingle().then(({ data }) => setPartner(data as Profile));
    const load = async () => {
      const { data } = await supabase.from("messages").select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`)
        .order("created_at");
      setMsgs((data ?? []) as Message[]);
      // mark unread as read
      await supabase.from("messages").update({ is_read: true }).eq("sender_id", id).eq("receiver_id", user.id).eq("is_read", false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    };
    load();
    const ch = supabase.channel(`thread:${user.id}:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, id]);

  if (!user) return <div className="p-8 text-center text-sm text-muted-foreground">Cần đăng nhập</div>;
  if (!isApproved && !isAdmin) return <div className="p-8 text-center text-sm text-muted-foreground">Tài khoản cần được duyệt</div>;

  const send = async () => {
    const t = text.trim(); if (!t) return;
    setText("");
    await supabase.from("messages").insert({ sender_id: user.id, receiver_id: id, content: t });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-5rem)]">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <button onClick={() => nav("/tin-nhan")}><ArrowLeft className="w-5 h-5" /></button>
        <div className="w-8 h-8 rounded-full bg-gradient-brand text-white grid place-items-center font-bold text-xs">{(partner?.full_name || "?").slice(0, 1)}</div>
        <div className="font-semibold text-sm">{partner?.full_name || "…"}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {msgs.map(m => (
          <div key={m.id} className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.sender_id === user.id ? "bg-primary text-primary-foreground ml-auto rounded-br-sm" : "bg-card border rounded-bl-sm"}`}>
            {m.content}
            <div className={`text-[9px] mt-0.5 ${m.sender_id === user.id ? "opacity-70" : "text-muted-foreground"}`}>{timeAgo(m.created_at)}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2 p-3 border-t bg-card">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }}
          placeholder="Nhập tin nhắn…" className="flex-1 px-3 py-2 rounded-full border bg-background text-sm" />
        <button onClick={send} className="w-10 h-10 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
