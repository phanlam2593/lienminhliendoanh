import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminCall, clearAdmin } from "@/lib/admin";
import { Business, CATEGORY_LABEL, Offer, Profile, Review, Suggestion } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { StoredImage } from "@/components/StoredImage";
import { LogOut, Users, Store, Ticket, Star, Lightbulb, Trash2, Check, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Tab = "dashboard" | "members" | "businesses" | "offers" | "reviews" | "suggestions";

export default function Admin() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState({ members: 0, businesses: 0, offers: 0, reviews: 0, pendingSuggestions: 0 });
  const [members, setMembers] = useState<Profile[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);

  const loadStats = async () => { try { setStats(await adminCall("stats")); } catch (e: any) { toast.error(e.message); } };

  const loadTab = async (t: Tab) => {
    setBusy(true);
    try {
      if (t === "members") setMembers(await adminCall("list", { table: "profiles" }));
      else if (t === "businesses") setBusinesses(await adminCall("list", { table: "businesses" }));
      else if (t === "offers") setOffers(await adminCall("list", { table: "offers" }));
      else if (t === "reviews") setReviews(await adminCall("list", { table: "reviews" }));
      else if (t === "suggestions") setSuggestions(await adminCall("list", { table: "business_suggestions" }));
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { if (tab !== "dashboard") loadTab(tab); }, [tab]);

  const del = async (table: string, id: string, label: string) => {
    if (!confirm(`Xoá ${label} này?`)) return;
    try { await adminCall("delete", { table, id }); toast.success("Đã xoá"); loadTab(tab); loadStats(); }
    catch (e: any) { toast.error(e.message); }
  };
  const updateStatus = async (table: string, id: string, status: string) => {
    try { await adminCall("update", { table, id, values: { status } }); toast.success("Đã cập nhật"); loadTab(tab); loadStats(); }
    catch (e: any) { toast.error(e.message); }
  };
  const toggleFeatured = async (id: string, featured: boolean) => {
    try { await adminCall("update", { table: "businesses", id, values: { featured } }); toast.success(featured ? "Đã đánh dấu nổi bật" : "Đã bỏ nổi bật"); loadTab(tab); }
    catch (e: any) { toast.error(e.message); }
  const approveSuggestion = async (id: string) => {
    try { await adminCall("approve_suggestion", { id }); toast.success("Đã duyệt thành doanh nghiệp"); loadTab(tab); loadStats(); }
    catch (e: any) { toast.error(e.message); }
  };
  const deleteUser = async (id: string) => {
    if (!confirm("Xoá thành viên này? (Tài khoản đăng nhập cũng bị xoá)")) return;
    try { await adminCall("delete_user", { id }); toast.success("Đã xoá"); loadTab(tab); loadStats(); }
    catch (e: any) { toast.error(e.message); }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "dashboard", label: "Tổng quan", icon: Star },
    { id: "members", label: "Thành viên", icon: Users },
    { id: "businesses", label: "Doanh nghiệp", icon: Store },
    { id: "offers", label: "Ưu đãi", icon: Ticket },
    { id: "reviews", label: "Đánh giá", icon: Star },
    { id: "suggestions", label: "Đề xuất", icon: Lightbulb },
  ];

  return (
    <div className="mx-auto max-w-md min-h-screen bg-background shadow-float">
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2"><Logo size={32} /><span className="text-sm font-extrabold">Admin</span></div>
        <button onClick={() => { clearAdmin(); nav("/"); }} className="text-destructive p-2"><LogOut className="w-4 h-4" /></button>
      </header>

      <div className="overflow-x-auto border-b border-border bg-card" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="flex gap-1 px-3 py-2 w-max">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${tab === t.id ? "bg-gradient-brand text-white" : "bg-muted text-muted-foreground"}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {busy && <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>}

        {tab === "dashboard" && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users} label="Thành viên" n={stats.members} />
            <StatCard icon={Store} label="Doanh nghiệp" n={stats.businesses} />
            <StatCard icon={Ticket} label="Ưu đãi" n={stats.offers} />
            <StatCard icon={Star} label="Đánh giá" n={stats.reviews} />
            <div className="col-span-2">
              <StatCard icon={Lightbulb} label="Đề xuất chờ duyệt" n={stats.pendingSuggestions} highlight />
            </div>
          </div>
        )}

        {tab === "members" && !busy && (
          <div className="space-y-2">
            {members.map(m => (
              <Row key={m.id}>
                <div className="w-9 h-9 rounded-full bg-gradient-brand text-white text-sm font-bold grid place-items-center">{(m.full_name || "?").slice(0, 1)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{m.full_name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{m.phone || "Chưa có SĐT"}</div>
                </div>
                <DelBtn onClick={() => deleteUser(m.id)} />
              </Row>
            ))}
          </div>
        )}

        {tab === "businesses" && !busy && (
          <div className="space-y-2">
            {businesses.map(b => (
              <Row key={b.id}>
                <StoredImage path={b.image_url} className="w-12 h-12 rounded-lg object-cover" fallbackClassName="w-12 h-12 rounded-lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{b.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{CATEGORY_LABEL[b.category]} • <span className={b.status === "approved" ? "text-success" : b.status === "rejected" ? "text-destructive" : "text-warning"}>{b.status}</span></div>
                </div>
                {b.status === "pending" && (
                  <>
                    <button onClick={() => updateStatus("businesses", b.id, "approved")} className="p-1.5 rounded-lg bg-success/10 text-success"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => updateStatus("businesses", b.id, "rejected")} className="p-1.5 rounded-lg bg-destructive/10 text-destructive"><X className="w-3.5 h-3.5" /></button>
                  </>
                )}
                <DelBtn onClick={() => del("businesses", b.id, "doanh nghiệp")} />
              </Row>
            ))}
          </div>
        )}

        {tab === "offers" && !busy && (
          <div className="space-y-2">
            {offers.map(o => (
              <Row key={o.id}>
                <div className="w-9 h-9 rounded-lg bg-gradient-brand text-white grid place-items-center"><Ticket className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{o.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{new Date(o.created_at).toLocaleDateString("vi-VN")}</div>
                </div>
                <DelBtn onClick={() => del("offers", o.id, "ưu đãi")} />
              </Row>
            ))}
          </div>
        )}

        {tab === "reviews" && !busy && (
          <div className="space-y-2">
            {reviews.map(r => (
              <Row key={r.id}>
                <div className="flex flex-col items-center w-9">
                  <div className="text-warning text-sm font-bold">{r.rating}★</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs line-clamp-2">{r.content || "—"}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("vi-VN")}</div>
                </div>
                <DelBtn onClick={() => del("reviews", r.id, "đánh giá")} />
              </Row>
            ))}
          </div>
        )}

        {tab === "suggestions" && !busy && (
          <div className="space-y-2">
            {suggestions.map(s => (
              <div key={s.id} className="p-3 bg-card rounded-xl border border-border/60 shadow-soft">
                <div className="flex gap-2">
                  <StoredImage path={s.image_url} className="w-14 h-14 rounded-lg object-cover" fallbackClassName="w-14 h-14 rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">{CATEGORY_LABEL[s.category]}</div>
                    <div className={`text-[10px] font-bold uppercase ${s.status === "approved" ? "text-success" : s.status === "rejected" ? "text-destructive" : "text-warning"}`}>{s.status}</div>
                  </div>
                </div>
                {s.description && <div className="text-xs text-muted-foreground mt-2">{s.description}</div>}
                {s.contact_info && <div className="text-xs mt-1">📞 {s.contact_info}</div>}
                {s.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => approveSuggestion(s.id)} className="flex-1 py-2 rounded-lg bg-success/10 text-success font-bold text-xs">Duyệt</button>
                    <button onClick={() => updateStatus("business_suggestions", s.id, "rejected")} className="flex-1 py-2 rounded-lg bg-destructive/10 text-destructive font-bold text-xs">Từ chối</button>
                    <button onClick={() => del("business_suggestions", s.id, "đề xuất")} className="p-2 rounded-lg bg-muted"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, n, highlight }: any) {
  return (
    <div className={`p-4 rounded-2xl border ${highlight ? "bg-gradient-brand text-white border-transparent" : "bg-card border-border/60"}`}>
      <Icon className={`w-5 h-5 ${highlight ? "text-white" : "text-primary"}`} />
      <div className="text-2xl font-extrabold mt-2">{n}</div>
      <div className={`text-[11px] font-bold uppercase ${highlight ? "text-white/85" : "text-muted-foreground"}`}>{label}</div>
    </div>
  );
}
function Row({ children }: any) {
  return <div className="flex items-center gap-3 p-2.5 bg-card rounded-xl border border-border/60">{children}</div>;
}
function DelBtn({ onClick }: any) {
  return <button onClick={onClick} className="p-1.5 rounded-lg bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>;
}
