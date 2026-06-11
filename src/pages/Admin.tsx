import { useState } from "react";
import { useStore } from "@/lib/store";
import { Users, Store, Gift, Star, Check, X, BarChart3, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUSINESS_TYPE_LABELS } from "@/lib/types";
import { toast } from "sonner";

export default function Admin() {
  const { businesses, users, usages, reviews, suggestions, approveBusiness, rejectBusiness, deleteBusiness, loginAdmin, session } = useStore();
  const [tab, setTab] = useState<"overview" | "pending" | "reviews" | "stats" | "suggestions" | "businesses">("overview");

  if (!session.isAdmin) {
    return (
      <div className="px-5 pt-10 text-center">
        <Sparkles className="w-12 h-12 mx-auto text-primary mb-3"/>
        <h1 className="text-xl font-extrabold mb-1">Khu vực Admin</h1>
        <p className="text-sm text-muted-foreground mb-5">Đăng nhập admin để quản lý cộng đồng</p>
        <button onClick={() => { loginAdmin(); toast.success("Đã vào chế độ Admin"); }}
          className="px-6 py-3 rounded-2xl bg-gradient-brand text-white font-bold shadow-brand">
          Đăng nhập Admin (demo)
        </button>
      </div>
    );
  }

  const pending = businesses.filter(b => b.status === "pending");
  const approved = businesses.filter(b => b.status === "approved");
  const stats = approved.map(b => ({ b, count: usages.filter(u => u.businessId === b.id).length }))
    .sort((a, b) => b.count - a.count);
  const recentReviews = [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-brand text-white grid place-items-center">
          <BarChart3 className="w-5 h-5"/>
        </div>
        <div>
          <h1 className="font-extrabold text-lg leading-tight">Admin Dashboard</h1>
          <div className="text-[11px] text-muted-foreground">Quản lý cộng đồng Liên Minh</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard icon={Users} label="Thành viên" value={users.length} color="primary"/>
        <StatCard icon={Store} label="Doanh nghiệp" value={approved.length} color="secondary"/>
        <StatCard icon={Gift} label="Lượt ưu đãi" value={usages.length} color="primary"/>
        <StatCard icon={Star} label="Đánh giá" value={reviews.length} color="secondary"/>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 mb-3 pb-1">
        {[
          { k: "overview", label: "Tổng quan" },
          { k: "pending", label: `Chờ duyệt (${pending.length})` },
          { k: "businesses", label: `Doanh nghiệp (${approved.length})` },
          { k: "reviews", label: "Đánh giá" },
          { k: "stats", label: "Thống kê" },
          { k: "suggestions", label: `Đề xuất (${suggestions.length})` },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap",
              tab === t.k ? "bg-gradient-brand text-white border-transparent" : "bg-card border-border text-muted-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-3 pb-4">
          <Section title="Doanh nghiệp đang chờ duyệt">
            {pending.length === 0 ? <Empty msg="Không có doanh nghiệp nào chờ duyệt"/> :
              pending.slice(0, 3).map(b => <PendingRow key={b.id} b={b} onApprove={approveBusiness} onReject={rejectBusiness}/>)
            }
          </Section>
          <Section title="Mã ưu đãi gần đây">
            {usages.slice(0, 5).map(u => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-xs font-bold font-mono text-primary">{u.code}</div>
                  <div className="text-[11px] text-muted-foreground">{u.userName} · {u.businessName}</div>
                </div>
                <div className="text-[10px] text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("vi-VN")}</div>
              </div>
            ))}
          </Section>
        </div>
      )}

      {tab === "pending" && (
        <div className="space-y-3 pb-4">
          {pending.length === 0 ? <Empty msg="Không có doanh nghiệp nào chờ duyệt"/> :
            pending.map(b => <PendingRow key={b.id} b={b} onApprove={approveBusiness} onReject={rejectBusiness}/>)
          }
        </div>
      )}

      {tab === "reviews" && (
        <div className="space-y-2 pb-4">
          {recentReviews.map(r => {
            const biz = businesses.find(b => b.id === r.businessId);
            return (
              <div key={r.id} className="p-3 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-sm">{r.userName} <span className="text-muted-foreground font-normal">→ {biz?.name}</span></div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} className={cn("w-3 h-3", s <= r.stars ? "fill-warning text-warning" : "text-muted-foreground/30")}/>)}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{r.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {tab === "stats" && (
        <div className="space-y-2 pb-4">
          <Section title="Lượt sử dụng theo doanh nghiệp">
            {stats.map(({ b, count }) => {
              const max = stats[0]?.count || 1;
              return (
                <div key={b.id} className="py-2">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span>{b.name}</span>
                    <span className="text-primary font-bold">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-brand" style={{ width: `${(count / max) * 100}%` }}/>
                  </div>
                </div>
              );
            })}
          </Section>
        </div>
      )}

      {tab === "businesses" && (
        <div className="space-y-2 pb-4">
          {approved.length === 0 ? <Empty msg="Không có doanh nghiệp nào"/> :
            approved.map(b => (
              <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <img src={b.logo} className="w-12 h-12 rounded-xl object-cover shrink-0"/>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{b.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{BUSINESS_TYPE_LABELS[b.type]} · {b.city} · {b.reviewCount} đánh giá · {b.usageCount} ưu đãi</div>
                </div>
                <button onClick={() => {
                  if (confirm(`Xóa doanh nghiệp "${b.name}"? Hành động này không thể hoàn tác.`)) {
                    deleteBusiness(b.id);
                    toast.success("Đã xóa doanh nghiệp");
                  }
                }} className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive grid place-items-center shrink-0">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            ))
          }
        </div>
      )}

      {tab === "suggestions" && (
        <div className="space-y-2 pb-4">
          {suggestions.length === 0 ? <Empty msg="Chưa có đề xuất nào từ cộng đồng"/> :
            suggestions.map(s => (
              <div key={s.id} className="p-3 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-sm">{s.name}</div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{BUSINESS_TYPE_LABELS[s.type]}</span>
                </div>
                <div className="text-xs text-muted-foreground">{s.address} · {s.phone}</div>
                {s.facebook && <div className="text-[11px] text-secondary">{s.facebook}</div>}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: "primary" | "secondary" }) {
  return (
    <div className="p-3 rounded-2xl bg-card border border-border shadow-soft">
      <div className={cn("w-8 h-8 rounded-lg grid place-items-center mb-1.5 text-white",
        color === "primary" ? "bg-gradient-brand" : "bg-secondary")}>
        <Icon className="w-4 h-4"/>
      </div>
      <div className="text-xl font-extrabold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3.5 rounded-2xl bg-card border border-border">
      <div className="font-bold text-sm mb-2">{title}</div>
      {children}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="text-center text-xs text-muted-foreground py-6">{msg}</div>;
}

function PendingRow({ b, onApprove, onReject }: any) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
      <img src={b.logo} className="w-12 h-12 rounded-xl object-cover"/>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate">{b.name}</div>
        <div className="text-[11px] text-muted-foreground truncate">{BUSINESS_TYPE_LABELS[b.type]} · {b.city}</div>
      </div>
      <button onClick={() => { onApprove(b.id); toast.success("Đã duyệt"); }}
        className="w-9 h-9 rounded-xl bg-primary text-white grid place-items-center">
        <Check className="w-4 h-4"/>
      </button>
      <button onClick={() => { onReject(b.id); toast.success("Đã từ chối"); }}
        className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive grid place-items-center">
        <X className="w-4 h-4"/>
      </button>
    </div>
  );
}
