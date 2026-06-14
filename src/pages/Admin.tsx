import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Profile, Business, Offer, Review, Suggestion, Report } from "@/lib/types";
import { BUSINESS_TYPE_LABEL, BUSINESS_TYPES } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, X, Star, Trash2, Edit, Send } from "lucide-react";

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "members";

  if (loading) return <div className="p-10 text-center text-sm">Đang tải…</div>;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-extrabold">Quản trị</h1>
      <Tabs value={tab} onValueChange={(v) => setSp({ tab: v })}>
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="inline-flex">
            <TabsTrigger value="members">Thành viên</TabsTrigger>
            <TabsTrigger value="businesses">Doanh nghiệp</TabsTrigger>
            <TabsTrigger value="offers">Ưu đãi</TabsTrigger>
            <TabsTrigger value="reviews">Đánh giá</TabsTrigger>
            <TabsTrigger value="suggestions">Đề xuất</TabsTrigger>
            <TabsTrigger value="reports">Báo cáo</TabsTrigger>
            <TabsTrigger value="broadcast">Phát thông báo</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="members"><Members /></TabsContent>
        <TabsContent value="businesses"><Businesses /></TabsContent>
        <TabsContent value="offers"><Offers /></TabsContent>
        <TabsContent value="reviews"><Reviews /></TabsContent>
        <TabsContent value="suggestions"><Suggestions /></TabsContent>
        <TabsContent value="reports"><Reports /></TabsContent>
        <TabsContent value="broadcast"><Broadcast /></TabsContent>
      </Tabs>
    </div>
  );
}

function Members() {
  const [list, setList] = useState<Profile[]>([]);
  const load = () => supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setList((data ?? []) as Profile[]));
  useEffect(() => { load(); }, []);
  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Cập nhật"); load(); }
  };
  const del = async (id: string) => {
    if (!confirm("Xoá thành viên?")) return;
    await supabase.from("profiles").delete().eq("id", id);
    load();
  };
  return (
    <div className="space-y-2 mt-3">
      {list.map(p => (
        <div key={p.id} className="p-3 bg-card rounded-xl flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-brand text-white grid place-items-center text-xs font-bold">{p.full_name?.[0]}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{p.full_name} <span className="text-muted-foreground text-xs">@{p.username}</span></div>
            <div className="text-[10px] text-muted-foreground">{p.email} · {p.status}</div>
          </div>
          {p.status === "pending" && (
            <>
              <button onClick={() => setStatus(p.id, "approved")} className="w-8 h-8 rounded-full bg-emerald-500 text-white grid place-items-center"><Check className="w-4 h-4" /></button>
              <button onClick={() => setStatus(p.id, "rejected")} className="w-8 h-8 rounded-full bg-red-500 text-white grid place-items-center"><X className="w-4 h-4" /></button>
            </>
          )}
          <button onClick={() => del(p.id)} className="w-8 h-8 rounded-full bg-muted text-destructive grid place-items-center"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}

function Businesses() {
  const [list, setList] = useState<Business[]>([]);
  const load = () => supabase.from("businesses").select("*").order("created_at", { ascending: false }).then(({ data }) => setList((data ?? []) as Business[]));
  useEffect(() => { load(); }, []);
  const update = async (id: string, patch: Partial<Business>) => {
    const { error } = await supabase.from("businesses").update(patch).eq("id", id);
    if (error) toast.error(error.message); else load();
  };
  const del = async (id: string) => {
    if (!confirm("Xoá doanh nghiệp?")) return;
    await supabase.from("businesses").delete().eq("id", id);
    load();
  };
  return (
    <div className="space-y-2 mt-3">
      {list.map(b => (
        <div key={b.id} className="p-3 bg-card rounded-xl">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{b.name}</div>
              <div className="text-[10px] text-muted-foreground">{BUSINESS_TYPE_LABEL[b.type]} · {b.status}</div>
            </div>
            <button onClick={() => update(b.id, { is_featured: !b.is_featured })} className={`w-8 h-8 rounded-full grid place-items-center ${b.is_featured ? "bg-yellow-400 text-white" : "bg-muted"}`}>
              <Star className={`w-4 h-4 ${b.is_featured ? "fill-white" : ""}`} />
            </button>
            {b.status === "pending" && (
              <>
                <button onClick={() => update(b.id, { status: "approved" })} className="w-8 h-8 rounded-full bg-emerald-500 text-white grid place-items-center"><Check className="w-4 h-4" /></button>
                <button onClick={() => update(b.id, { status: "rejected" })} className="w-8 h-8 rounded-full bg-red-500 text-white grid place-items-center"><X className="w-4 h-4" /></button>
              </>
            )}
            <button onClick={() => del(b.id)} className="w-8 h-8 rounded-full bg-muted text-destructive grid place-items-center"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Offers() {
  const [list, setList] = useState<(Offer & { business?: { name: string } | null })[]>([]);
  const load = () => supabase.from("offers").select("*, business:businesses(name)").order("created_at", { ascending: false }).then(({ data }) => setList((data ?? []) as any));
  useEffect(() => { load(); }, []);
  const toggle = async (o: Offer) => {
    await supabase.from("offers").update({ status: o.status === "active" ? "inactive" : "active" }).eq("id", o.id);
    load();
  };
  const del = async (id: string) => { if (!confirm("Xoá ưu đãi?")) return; await supabase.from("offers").delete().eq("id", id); load(); };
  return (
    <div className="space-y-2 mt-3">
      {list.map(o => (
        <div key={o.id} className="p-3 bg-card rounded-xl flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{o.title}</div>
            <div className="text-[10px] text-muted-foreground">{o.business?.name} · {o.status}</div>
          </div>
          <button onClick={() => toggle(o)} className="text-xs px-2 py-1 rounded bg-accent">{o.status === "active" ? "Tắt" : "Bật"}</button>
          <button onClick={() => del(o.id)} className="w-8 h-8 rounded-full bg-muted text-destructive grid place-items-center"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}

function Reviews() {
  const [list, setList] = useState<(Review & { profile?: { full_name: string } | null; business?: { name: string } | null })[]>([]);
  const load = () => supabase.from("reviews").select("*, profile:profiles(full_name), business:businesses(name)").order("created_at", { ascending: false }).then(({ data }) => setList((data ?? []) as any));
  useEffect(() => { load(); }, []);
  const del = async (id: string) => { await supabase.from("reviews").delete().eq("id", id); load(); };
  return (
    <div className="space-y-2 mt-3">
      {list.map(r => (
        <div key={r.id} className="p-3 bg-card rounded-xl flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{r.profile?.full_name} → {r.business?.name}</div>
            <div className="text-xs text-yellow-600">{"★".repeat(r.rating)}</div>
            {r.comment && <div className="text-xs text-muted-foreground">{r.comment}</div>}
          </div>
          <button onClick={() => del(r.id)} className="w-8 h-8 rounded-full bg-muted text-destructive grid place-items-center"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  );
}

function Suggestions() {
  const [list, setList] = useState<Suggestion[]>([]);
  const load = () => supabase.from("suggestions").select("*").order("created_at", { ascending: false }).then(({ data }) => setList((data ?? []) as Suggestion[]));
  useEffect(() => { load(); }, []);
  const approve = async (s: Suggestion) => {
    // create business pending, then mark suggestion approved
    const { error } = await supabase.from("businesses").insert({
      name: s.business_name, type: s.business_type, description: s.description, status: "approved",
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("suggestions").update({ status: "approved" }).eq("id", s.id);
    load();
  };
  const reject = async (id: string) => { await supabase.from("suggestions").update({ status: "rejected" }).eq("id", id); load(); };
  return (
    <div className="space-y-2 mt-3">
      {list.map(s => (
        <div key={s.id} className="p-3 bg-card rounded-xl space-y-1">
          <div className="text-sm font-semibold">{s.business_name}</div>
          <div className="text-[10px] text-muted-foreground">{BUSINESS_TYPE_LABEL[s.business_type]} · {s.contact_info} · {s.status}</div>
          {s.description && <div className="text-xs">{s.description}</div>}
          {s.status === "pending" && (
            <div className="flex gap-2">
              <button onClick={() => approve(s)} className="text-xs px-3 py-1 rounded bg-emerald-500 text-white">Duyệt</button>
              <button onClick={() => reject(s.id)} className="text-xs px-3 py-1 rounded bg-red-500 text-white">Từ chối</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Reports() {
  const [list, setList] = useState<Report[]>([]);
  const load = () => supabase.from("reports").select("*").order("created_at", { ascending: false }).then(({ data }) => setList((data ?? []) as Report[]));
  useEffect(() => { load(); }, []);
  const toggle = async (r: Report) => { await supabase.from("reports").update({ resolved: !r.resolved }).eq("id", r.id); load(); };
  const del = async (id: string) => { await supabase.from("reports").delete().eq("id", id); load(); };
  return (
    <div className="space-y-2 mt-3">
      {list.map(r => (
        <div key={r.id} className="p-3 bg-card rounded-xl space-y-1">
          <div className="text-xs text-muted-foreground">{r.target_type} · {r.resolved ? "✓ đã xử lý" : "Chưa xử lý"}</div>
          <div className="text-sm">{r.description}</div>
          {r.photo_url && <div className="text-[10px] text-muted-foreground">📎 {r.photo_url}</div>}
          <div className="flex gap-2">
            <button onClick={() => toggle(r)} className="text-xs px-3 py-1 rounded bg-accent">{r.resolved ? "Mở lại" : "Đánh dấu xong"}</button>
            <button onClick={() => del(r.id)} className="text-xs px-3 py-1 rounded bg-muted text-destructive">Xoá</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Broadcast() {
  const [title, setT] = useState(""); const [body, setB] = useState(""); const [loading, setL] = useState(false);
  const send = async () => {
    if (!title) { toast.error("Nhập tiêu đề"); return; }
    setL(true);
    const { data: profs } = await supabase.from("profiles").select("id").eq("status", "approved");
    if (profs?.length) {
      const rows = profs.map((p: any) => ({ user_id: p.id, type: "broadcast" as const, title, body }));
      await supabase.from("notifications").insert(rows);
    }
    setL(false); setT(""); setB(""); toast.success("Đã gửi");
  };
  return (
    <div className="mt-3 space-y-2">
      <input value={title} onChange={e => setT(e.target.value)} placeholder="Tiêu đề" className="w-full px-3 py-2 rounded-lg border bg-card text-sm" />
      <textarea value={body} onChange={e => setB(e.target.value)} placeholder="Nội dung" rows={3} className="w-full px-3 py-2 rounded-lg border bg-card text-sm" />
      <button disabled={loading} onClick={send} className="w-full py-2.5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Gửi cho tất cả thành viên</button>
    </div>
  );
}
