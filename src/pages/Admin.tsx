import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Profile, Business, Offer, Review, Report, ReportStatus } from "@/lib/types";
import { BUSINESS_TYPE_LABEL, BUSINESS_TYPES, BusinessType } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Bell,
  Check,
  X,
  CheckCircle2,
  XCircle,
  Star,
  UserPlus,
  Tag,
  Ticket,
  MessageCircle,
  Shield,
  Flag,
  Lightbulb,
  Award,
  TrendingUp,
  Building2,
  Sparkles,
  Handshake,
  Users,
  Search,
  Trash2,
  Save,
  KeyRound,
  Copy,
  ChevronDown,
  ChevronRight,
  Send,
} from "lucide-react";
import { StoredImage } from "@/components/StoredImage";
import { LightboxImage } from "@/components/ImageLightbox";
import { WelcomeOnboarding } from "@/components/WelcomeOnboarding";
import { timeAgo } from "@/lib/time";
import { ReportRepliesPanel, ReportStatusBadge } from "@/components/ReportRepliesPanel";

interface MemberRow extends Profile {
  business?: Business | null;
  lastVisit: string | null;
}

const MEMBER_PAGE_SIZE = 50;

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewOnboarding, setPreviewOnboarding] = useState(false);
  const [memberPage, setMemberPage] = useState(0);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberHasMore, setMemberHasMore] = useState(true);
  const [memberLoadingMore, setMemberLoadingMore] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!isAdmin) return;
    setMemberPage(0);
    void loadMembers(0, false);
  }, [isAdmin, refreshKey, debouncedSearch]);

  const loadMembers = async (pageNum: number, append: boolean) => {
    setMemberLoadingMore(true);
    const from = pageNum * MEMBER_PAGE_SIZE;
    const to = from + MEMBER_PAGE_SIZE - 1;
    let q = supabase
      .from("profiles")
      .select(
        "id, username, full_name, email, phone, avatar_url, status, status_message, points, created_at, updated_at, admin_note, notification_prefs, member_number, has_seen_welcome, is_member, membership_started_at, membership_expires_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (debouncedSearch) {
      q = q.or(`full_name.ilike.%${debouncedSearch}%,username.ilike.%${debouncedSearch}%`);
    }
    const { data: profs, count } = await q;
    setMemberTotal(count ?? 0);

    const ids = ((profs as Profile[] | null) ?? []).map((p) => p.id);
    const [{ data: biz }, { data: visits }] = await Promise.all([
      ids.length
        ? supabase.from("businesses").select("*").in("owner_id", ids)
        : Promise.resolve({ data: [] as Business[] }),
      ids.length
        ? supabase
            .from("login_events")
            .select("user_id, created_at")
            .in("user_id", ids)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const bizByOwner = new Map<string, Business>();
    (biz as Business[] | null)?.forEach((b) => {
      if (b.owner_id) bizByOwner.set(b.owner_id, b);
    });
    const lastVisitByUser = new Map<string, string>();
    (visits ?? []).forEach((v: any) => {
      if (!lastVisitByUser.has(v.user_id)) lastVisitByUser.set(v.user_id, v.created_at);
    });

    const newRows: MemberRow[] = ((profs as Profile[] | null) ?? []).map((p) => ({
      ...p,
      business: bizByOwner.get(p.id) ?? null,
      lastVisit: lastVisitByUser.get(p.id) ?? null,
    }));
    setRows((prev) => (append ? [...prev, ...newRows] : newRows));
    setMemberHasMore(newRows.length === MEMBER_PAGE_SIZE);
    setMemberLoadingMore(false);
  };

  const loadMoreMembers = () => {
    const next = memberPage + 1;
    setMemberPage(next);
    void loadMembers(next, true);
  };

  if (loading) return <div className="p-10 text-center text-sm">Đang tải…</div>;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  const refresh = () => setRefreshKey((k) => k + 1);

  const setStatus = async (id: string, status: "approved" | "rejected", note?: string) => {
    const patch = typeof note === "string" ? { status, admin_note: note.trim() || null } : { status };
    const { error } = await supabase
      .from("profiles")
      .update(patch as any)
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Đã cập nhật");
      refresh();
    }
  };

  const cleanupOrphans = async () => {
    if (!confirm("Dọn dẹp tất cả tài khoản đăng nhập không còn hồ sơ?")) return;
    const t = toast.loading("Đang dọn dẹp…");
    const { data, error } = await supabase.functions.invoke("admin-cleanup-orphans", { body: {} });
    toast.dismiss(t);
    if (error) {
      toast.error(error.message);
      return;
    }
    const d: any = data ?? {};
    toast.success(`Tìm thấy ${d.found ?? 0}, đã xóa ${d.deleted ?? 0} tài khoản`);
    refresh();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-extrabold">Quản trị</h1>

      <PendingSummary refreshKey={refreshKey} onChanged={refresh} />

      <Collapsible title="Thành viên" icon={Users} count={memberTotal}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc username…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border bg-card text-sm"
          />
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Không có kết quả</p>
        ) : (
          rows.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="w-full text-left p-3 bg-card rounded-xl flex items-center gap-3 hover:bg-accent transition"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-brand text-white grid place-items-center text-sm font-bold flex-shrink-0">
                {(r.full_name || r.username || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {r.full_name}
                  <span className="text-muted-foreground text-xs ml-1">@{r.username}</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  Tham gia {new Date(r.created_at).toLocaleDateString("vi-VN")}
                  {r.business ? ` · 🏢 ${r.business.name}` : ""}
                  {r.lastVisit ? ` · Vào lần cuối: ${timeAgo(r.lastVisit)}` : " · Chưa từng mở app"}
                </div>
              </div>
              <StatusBadge s={r.status} />
            </button>
          ))
        )}
        {memberHasMore && (
          <button
            onClick={loadMoreMembers}
            disabled={memberLoadingMore}
            className="w-full py-2 rounded-lg border text-sm font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            {memberLoadingMore ? "Đang tải…" : `Tải thêm (còn ${memberTotal - rows.length})`}
          </button>
        )}
      </Collapsible>

      <BusinessesSection refreshKey={refreshKey} onChanged={refresh} />
      <OffersSection refreshKey={refreshKey} onChanged={refresh} />
      <ExchangesSection refreshKey={refreshKey} onChanged={refresh} />
      <ReportsSection refreshKey={refreshKey} />
      <Collapsible title="Công cụ quản trị" icon={Sparkles}>
        <CreateMemberForm />
        <button
          onClick={() => setPreviewOnboarding(true)}
          className="w-full py-2 rounded-lg border border-dashed text-xs font-semibold text-muted-foreground hover:bg-accent flex items-center justify-center gap-1.5"
        >
          <Users className="w-3.5 h-3.5" /> Xem lại popup chào mừng thành viên mới
        </button>
        <button
          onClick={cleanupOrphans}
          className="w-full py-2 rounded-lg border border-dashed text-xs font-semibold text-muted-foreground hover:bg-accent flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" /> Dọn dẹp tài khoản cũ (orphan auth)
        </button>
        <Broadcast />
      </Collapsible>

      <MemberDetail row={selected} onClose={() => setSelected(null)} onChanged={refresh} onStatus={setStatus} />
      {previewOnboarding && <WelcomeOnboarding previewMode onPreviewClose={() => setPreviewOnboarding(false)} />}
    </div>
  );
}

function CreateMemberForm() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [realEmail, setRealEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ username: string; temp_password: string } | null>(null);

  const submit = async () => {
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-create-member", {
      body: { username, full_name: fullName, phone, real_email: realEmail },
    });
    setCreating(false);
    if (error || !data?.temp_password) {
      toast.error(data?.error ?? error?.message ?? "Tạo tài khoản thất bại");
      return;
    }
    setResult({ username: data.username, temp_password: data.temp_password });
    setUsername("");
    setFullName("");
    setPhone("");
    setRealEmail("");
  };

  return (
    <div className="space-y-2">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 text-sm font-semibold">
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <UserPlus className="w-4 h-4 text-primary" />
        <span>Tạo tài khoản thành viên mới</span>
      </button>
      {open && (
        <div className="space-y-2 pt-1">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username (chữ thường, số, gạch dưới)"
            className="w-full px-3 py-2 rounded-lg border bg-card text-sm"
          />
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Họ tên"
            className="w-full px-3 py-2 rounded-lg border bg-card text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="SĐT (tùy chọn)"
            className="w-full px-3 py-2 rounded-lg border bg-card text-sm"
          />
          <input
            value={realEmail}
            onChange={(e) => setRealEmail(e.target.value)}
            placeholder="Email thật (tùy chọn)"
            className="w-full px-3 py-2 rounded-lg border bg-card text-sm"
          />
          <button
            onClick={submit}
            disabled={creating || !username.trim() || !fullName.trim()}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
          >
            {creating ? "Đang tạo…" : "Tạo tài khoản"}
          </button>
        </div>
      )}
      <Dialog open={!!result} onOpenChange={(v) => !v && setResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đã tạo tài khoản @{result?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <code className="flex-1 font-mono font-bold text-lg">{result?.temp_password}</code>
              <button
                onClick={() => {
                  if (result) {
                    navigator.clipboard.writeText(result.temp_password);
                    toast.success("Đã sao chép");
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Gửi username <b>@{result?.username}</b> và mật khẩu tạm này cho thành viên để họ đăng nhập lần đầu.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PendingSummary({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [members, setMembers] = useState<{ id: string; full_name: string; username: string }[]>([]);
  const [biz, setBiz] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const [{ data: m }, { data: b }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, username").eq("status", "pending"),
      supabase.from("businesses").select("id, name").eq("status", "pending"),
    ]);
    setMembers(m ?? []);
    setBiz(b ?? []);
  };
  useEffect(() => {
    void load();
  }, [refreshKey]);

  const approveMember = async (id: string) => {
    const { error } = await supabase.from("profiles").update({ status: "approved" }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã duyệt");
    load();
    onChanged();
  };
  const rejectMember = async (id: string) => {
    const { error } = await supabase.from("profiles").update({ status: "rejected" }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã từ chối");
    load();
    onChanged();
  };
  const approveBiz = async (id: string) => {
    const { error } = await supabase.from("businesses").update({ status: "approved" }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã duyệt");
    load();
    onChanged();
  };
  const rejectBiz = async (id: string) => {
    await supabase.from("offers").delete().eq("business_id", id);
    const { error } = await supabase.from("businesses").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã từ chối và xóa");
    load();
    onChanged();
  };

  const total = members.length + biz.length;

  if (total === 0) {
    return (
      <div className="px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" /> Không có gì đang chờ duyệt
      </div>
    );
  }

  return (
    <section className="rounded-xl bg-amber-50 dark:bg-amber-950/30 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-amber-700 dark:text-amber-400 text-sm font-semibold"
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Bell className="w-4 h-4" />
        <span className="flex-1 text-left">Đang chờ duyệt ({total})</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-2 bg-card rounded-lg p-2">
              <div className="flex-1 min-w-0 text-xs">
                <div className="font-semibold truncate">{m.full_name}</div>
                <div className="text-muted-foreground">@{m.username} · Thành viên</div>
              </div>
              <button onClick={() => approveMember(m.id)} className="text-emerald-600" aria-label="Duyệt">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => rejectMember(m.id)} className="text-red-600" aria-label="Từ chối">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {biz.map((b) => (
            <div key={b.id} className="flex items-center gap-2 bg-card rounded-lg p-2">
              <div className="flex-1 min-w-0 text-xs">
                <div className="font-semibold truncate">{b.name}</div>
                <div className="text-muted-foreground">Doanh nghiệp</div>
              </div>
              <button onClick={() => approveBiz(b.id)} className="text-emerald-600" aria-label="Duyệt">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => rejectBiz(b.id)} className="text-red-600" aria-label="Từ chối">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MemberDetail({
  row,
  onClose,
  onChanged,
  onStatus,
}: {
  row: MemberRow | null;
  onClose: () => void;
  onChanged: () => void;
  onStatus: (id: string, s: "approved" | "rejected", note?: string) => void;
}) {
  // member fields
  const [fullName, setFN] = useState("");
  const [email, setE] = useState("");
  const [phone, setPh] = useState("");

  // business fields (if any)
  const [biz, setBiz] = useState<Business | null>(null);
  const [bName, setBN] = useState("");
  const [bType, setBT] = useState<BusinessType>("food");
  const [bDesc, setBD] = useState("");
  const [bOpen, setBO] = useState("");
  const [bClose, setBC] = useState("");
  const [bAddress, setBA] = useState("");
  const [bPhone, setBPh] = useState("");
  const [bFb, setBFb] = useState("");
  const [bWeb, setBW] = useState("");
  const [bFeatured, setBFeat] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [adminNote, setAdminNote] = useState("");

  const [offers, setOffers] = useState<Offer[]>([]);
  const [newOfferTitle, setNewOfferTitle] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [saving, setSaving] = useState(false);
  const [visits, setVisits] = useState<string[]>([]);
  const [visitsOpen, setVisitsOpen] = useState(false);

  useEffect(() => {
    if (!row) return;
    setFN(row.full_name);
    setE(row.email);
    setPh(row.phone);
    const b = row.business ?? null;
    setBiz(b);
    if (b) {
      setBN(b.name);
      setBT(b.type);
      setBD(b.description ?? "");
      setBO((b.hours_open ?? "07:00:00").slice(0, 5));
      setBC((b.hours_close ?? "22:00:00").slice(0, 5));
      setBA(b.address ?? "");
      setBPh(b.phone ?? "");
      setBFb(b.facebook_url ?? "");
      setBW(b.website_url ?? "");
      setBFeat(b.is_featured);
    }
    void load(row.id, b?.id);
  }, [row?.id]);

  const load = async (uid: string, bizId?: string) => {
    const { data: r } = await supabase
      .from("reviews")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setReviews((r ?? []) as Review[]);
    if (bizId) {
      const { data: o } = await supabase
        .from("offers")
        .select("*")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false });
      setOffers((o ?? []) as Offer[]);
    } else setOffers([]);
    const { data: v } = await supabase
      .from("login_events")
      .select("created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);
    setVisits((v ?? []).map((x: any) => x.created_at));
  };

  const saveProfile = async () => {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, email, phone }).eq("id", row.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã lưu hồ sơ");
    onChanged();
  };

  const saveBiz = async () => {
    if (!biz) return;
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({
        name: bName,
        type: bType,
        description: bDesc,
        hours_open: bOpen,
        hours_close: bClose,
        address: bAddress || null,
        phone: bPhone || null,
        facebook_url: bFb || null,
        website_url: bWeb || null,
        is_featured: bFeatured,
      })
      .eq("id", biz.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã lưu doanh nghiệp");
    onChanged();
  };

  const setBizStatus = async (s: "approved" | "rejected") => {
    if (!biz) return;
    if (s === "rejected") {
      await supabase.from("offers").delete().eq("business_id", biz.id);
      const { error } = await supabase.from("businesses").delete().eq("id", biz.id);
      if (error) toast.error(error.message);
      else {
        toast.success("Đã từ chối và xóa");
        setBiz(null);
        onChanged();
      }
      return;
    }
    const { error } = await supabase.from("businesses").update({ status: s }).eq("id", biz.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Đã cập nhật");
      onChanged();
    }
  };

  const delBiz = async () => {
    if (!biz || !confirm("Xóa doanh nghiệp này và toàn bộ ưu đãi?")) return;
    await supabase.from("offers").delete().eq("business_id", biz.id);
    const { error } = await supabase.from("businesses").delete().eq("id", biz.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã xóa doanh nghiệp");
    setBiz(null);
    onChanged();
  };

  const delMember = async () => {
    if (!row || !confirm("Xóa thành viên này? Tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.")) return;
    const { error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: row.id } });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã xóa thành viên");
    onChanged();
    onClose();
  };

  const [resetting, setResetting] = useState(false);
  const [bizOpen, setBizOpen] = useState(false);
  const [tempPw, setTempPw] = useState<string | null>(null);
  const resetPassword = async () => {
    if (!row) return;
    if (!confirm(`Đặt lại mật khẩu cho @${row.username}?`)) return;
    setResetting(true);
    const { data, error } = await supabase.functions.invoke("admin-reset-password", { body: { user_id: row.id } });
    setResetting(false);
    if (error || !data?.temp_password) {
      toast.error(error?.message ?? "Reset thất bại");
      return;
    }
    setTempPw(data.temp_password as string);
  };

  const addOffer = async () => {
    if (!biz || !newOfferTitle.trim()) return;
    const { error } = await supabase
      .from("offers")
      .insert({ business_id: biz.id, title: newOfferTitle.trim(), status: "active" });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewOfferTitle("");
    load(row!.id, biz.id);
  };
  const toggleOffer = async (o: Offer) => {
    await supabase
      .from("offers")
      .update({ status: o.status === "active" ? "inactive" : "active" })
      .eq("id", o.id);
    load(row!.id, biz!.id);
  };
  const delOffer = async (id: string) => {
    if (!confirm("Xóa ưu đãi?")) return;
    await supabase.from("offers").delete().eq("id", id);
    load(row!.id, biz!.id);
  };

  const delReview = async (id: string) => {
    if (!confirm("Xóa đánh giá?")) return;
    await supabase.from("reviews").delete().eq("id", id);
    load(row!.id, biz?.id);
  };

  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết thành viên</DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-brand text-white grid place-items-center text-xl font-bold">
                {row.full_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">@{row.username}</div>
                <div className="text-xs text-muted-foreground">
                  Tham gia: {new Date(row.created_at).toLocaleDateString("vi-VN")}
                </div>
                <StatusBadge s={row.status} />
              </div>
              <button
                onClick={delMember}
                className="w-8 h-8 rounded-full bg-muted text-destructive grid place-items-center"
                aria-label="Xóa thành viên"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {row.status === "pending" && !rejectMode && (
              <div className="space-y-2">
                {row.admin_note && (
                  <div className="text-[11px] text-muted-foreground italic">Ghi chú trước: {row.admin_note}</div>
                )}
                <input
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Ghi chú gửi thành viên (tùy chọn khi duyệt)"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-xs"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onStatus(row.id, "approved", adminNote);
                      setAdminNote("");
                    }}
                    className="flex-1 py-2 rounded-lg bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-1"
                  >
                    <Check className="w-4 h-4" /> Duyệt
                  </button>
                  <button
                    onClick={() => setRejectMode(true)}
                    className="flex-1 py-2 rounded-lg bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-1"
                  >
                    <X className="w-4 h-4" /> Từ chối
                  </button>
                </div>
              </div>
            )}
            {row.status === "pending" && rejectMode && (
              <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-xs font-bold text-destructive">Lý do từ chối (bắt buộc)</div>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={2}
                  placeholder="Mô tả ngắn lý do để thành viên hiểu…"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setRejectMode(false);
                      setAdminNote("");
                    }}
                    className="flex-1 py-2 rounded-lg border text-sm font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      if (!adminNote.trim()) {
                        toast.error("Vui lòng nhập lý do");
                        return;
                      }
                      onStatus(row.id, "rejected", adminNote);
                      setRejectMode(false);
                      setAdminNote("");
                    }}
                    className="flex-1 py-2 rounded-lg bg-red-500 text-white font-semibold text-sm"
                  >
                    Xác nhận từ chối
                  </button>
                </div>
              </div>
            )}

            <section className="space-y-2">
              <div className="text-xs font-bold text-muted-foreground">THÔNG TIN CÁ NHÂN</div>
              <input
                value={fullName}
                onChange={(e) => setFN(e.target.value)}
                placeholder="Họ tên"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              />
              <input
                value={email}
                onChange={(e) => setE(e.target.value)}
                placeholder="Email"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              />
              <input
                value={phone}
                onChange={(e) => setPh(e.target.value)}
                placeholder="SĐT"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              />
              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1"
              >
                <Save className="w-4 h-4" /> Lưu hồ sơ
              </button>
              <button
                onClick={resetPassword}
                disabled={resetting}
                className="w-full py-2 rounded-lg bg-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" /> {resetting ? "Đang reset…" : "Reset mật khẩu"}
              </button>
            </section>

            <Dialog open={!!tempPw} onOpenChange={(o) => !o && setTempPw(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mật khẩu tạm thời</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <code className="flex-1 font-mono font-bold text-lg">{tempPw}</code>
                    <button
                      onClick={() => {
                        if (tempPw) {
                          navigator.clipboard.writeText(tempPw);
                          toast.success("Đã sao chép");
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Vui lòng gửi cho thành viên và nhắc họ đổi mật khẩu sau khi đăng nhập.
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            {biz && (
              <section className="border-t pt-4 space-y-2">
                <button
                  onClick={() => setBizOpen((o) => !o)}
                  className="w-full flex items-center gap-2 font-bold text-sm"
                >
                  {bizOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="flex-1 text-left">{biz.name}</span>
                  <StatusBadge s={biz.status} />
                </button>

                {bizOpen && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setBFeat((v) => !v);
                        }}
                        className={`w-7 h-7 rounded-full grid place-items-center ${bFeatured ? "bg-yellow-400 text-white" : "bg-muted"}`}
                        aria-label="Nổi bật"
                      >
                        <Star className={`w-4 h-4 ${bFeatured ? "fill-white" : ""}`} />
                      </button>
                      <button
                        onClick={delBiz}
                        className="w-7 h-7 rounded-full bg-muted text-destructive grid place-items-center"
                        aria-label="Xóa doanh nghiệp"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {biz.cover_url && (
                      <div className="h-24 rounded-lg overflow-hidden">
                        <StoredImage path={biz.cover_url} alt={biz.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <input
                      value={bName}
                      onChange={(e) => setBN(e.target.value)}
                      placeholder="Tên doanh nghiệp"
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {BUSINESS_TYPES.map((t) => (
                        <button
                          key={t}
                          onClick={() => setBT(t)}
                          className={`px-2.5 py-1 rounded-full text-xs border ${bType === t ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}
                        >
                          {BUSINESS_TYPE_LABEL[t]}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={bDesc}
                      onChange={(e) => setBD(e.target.value)}
                      rows={2}
                      placeholder="Mô tả"
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={bOpen}
                        onChange={(e) => setBO(e.target.value)}
                        className="px-2 py-2 rounded-lg border bg-background text-sm"
                      />
                      <input
                        type="time"
                        value={bClose}
                        onChange={(e) => setBC(e.target.value)}
                        className="px-2 py-2 rounded-lg border bg-background text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={bAddress}
                        onChange={(e) => setBA(e.target.value)}
                        placeholder="Địa chỉ"
                        className="px-3 py-2 rounded-lg border bg-background text-sm"
                      />
                      <input
                        value={bPhone}
                        onChange={(e) => setBPh(e.target.value)}
                        placeholder="SĐT doanh nghiệp"
                        className="px-3 py-2 rounded-lg border bg-background text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={bFb}
                        onChange={(e) => setBFb(e.target.value)}
                        placeholder="Facebook URL"
                        className="px-3 py-2 rounded-lg border bg-background text-sm"
                      />
                      <input
                        value={bWeb}
                        onChange={(e) => setBW(e.target.value)}
                        placeholder="Website URL"
                        className="px-3 py-2 rounded-lg border bg-background text-sm"
                      />
                    </div>
                    <button
                      onClick={saveBiz}
                      disabled={saving}
                      className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1"
                    >
                      <Save className="w-4 h-4" /> {saving ? "Đang lưu…" : "Lưu doanh nghiệp"}
                    </button>
                    {biz.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setBizStatus("approved")}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-white font-semibold text-xs"
                        >
                          Duyệt doanh nghiệp
                        </button>
                        <button
                          onClick={() => setBizStatus("rejected")}
                          className="flex-1 py-1.5 rounded-lg bg-red-500 text-white font-semibold text-xs"
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                    <div className="pt-2 border-t space-y-1">
                      <div className="text-xs font-bold text-muted-foreground">Ưu đãi ({offers.length})</div>
                      {offers.map((o) => (
                        <div key={o.id} className="flex items-center gap-2 p-2 bg-accent rounded">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate">{o.title}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {o.status} · {o.claim_count ?? 0} lượt nhận
                            </div>
                          </div>
                          <button onClick={() => toggleOffer(o)} className="text-[10px] px-2 py-0.5 rounded bg-card">
                            {o.status === "active" ? "Tắt" : "Bật"}
                          </button>
                          <button onClick={() => delOffer(o.id)} className="text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-1">
                        <input
                          value={newOfferTitle}
                          onChange={(e) => setNewOfferTitle(e.target.value)}
                          placeholder="Thêm ưu đãi…"
                          className="flex-1 px-2 py-1.5 rounded border bg-background text-xs"
                        />
                        <button onClick={addOffer} className="px-3 rounded bg-primary text-primary-foreground text-xs">
                          Thêm
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {reviews.length > 0 && (
              <section className="space-y-1 border-t pt-4">
                <div className="text-xs font-bold text-muted-foreground">ĐÁNH GIÁ ({reviews.length})</div>
                {reviews.map((r) => (
                  <div key={r.id} className="flex items-start gap-2 p-2 bg-accent rounded">
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="text-yellow-600">{"★".repeat(r.rating)}</div>
                      {r.comment && <div className="text-muted-foreground line-clamp-2">{r.comment}</div>}
                    </div>
                    <button onClick={() => delReview(r.id)} className="text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </section>
            )}

            <section className="border-t pt-4 space-y-2">
              <button
                onClick={() => setVisitsOpen((o) => !o)}
                className="w-full flex items-center gap-2 font-bold text-sm"
              >
                {visitsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span>Nhật ký truy cập ({visits.length})</span>
              </button>
              {visitsOpen && (
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {visits.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Chưa từng mở app</p>
                  ) : (
                    visits.map((v, i) => (
                      <div key={i} className="text-xs text-muted-foreground p-2 bg-accent rounded flex justify-between">
                        <span>{new Date(v).toLocaleString("vi-VN")}</span>
                        <span>{timeAgo(v)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const REPORT_PAGE_SIZE = 50;

function ReportRow({
  r,
  onDeleted,
  onStatusChanged,
}: {
  r: Report & { reporter?: string | null; target_name?: string | null };
  onDeleted: () => void;
  onStatusChanged: (id: string, s: ReportStatus) => void;
}) {
  const [open, setOpen] = useState(false);

  const del = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Xóa báo cáo?")) return;
    await supabase.from("reports").delete().eq("id", r.id);
    onDeleted();
  };

  return (
    <div className="bg-card rounded-xl overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full p-3 text-left space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[11px] text-muted-foreground flex-1 min-w-0">
            {r.reporter || "Ẩn danh"} → <b className="text-foreground">{r.target_name || r.target_type}</b>
          </div>
          <ReportStatusBadge s={r.status} />
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {open ? r.description : `${r.description?.slice(0, 60)}${(r.description?.length ?? 0) > 60 ? "…" : ""}`} ·{" "}
          {timeAgo(r.created_at)}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {r.photo_url && (
            <div className="h-32 rounded-lg overflow-hidden bg-muted">
              <LightboxImage path={r.photo_url} alt="Ảnh báo cáo" className="w-full h-full object-cover" />
            </div>
          )}
          <ReportRepliesPanel
            reportId={r.id}
            canChangeStatus
            currentStatus={r.status}
            onStatusChange={(s) => onStatusChanged(r.id, s)}
          />
          <div className="flex gap-2 pt-1">
            <button onClick={del} className="text-xs px-3 py-1 rounded bg-muted text-destructive">
              Xóa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsSection({ refreshKey }: { refreshKey: number }) {
  const [list, setList] = useState<(Report & { reporter?: string | null; target_name?: string | null })[]>([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = async (pageNum: number, append: boolean) => {
    setLoadingMore(true);
    const from = pageNum * REPORT_PAGE_SIZE;
    const to = from + REPORT_PAGE_SIZE - 1;
    let query = supabase
      .from("reports")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (debouncedQ) query = query.ilike("description", `%${debouncedQ}%`);
    const { data: reports, count } = await query;
    setTotal(count ?? 0);
    const rows = (reports as Report[] | null) ?? [];
    const uids = [...new Set(rows.map((r) => r.user_id))];
    const bizIds = [...new Set(rows.filter((r) => r.target_type === "business").map((r) => r.target_id))];
    const offerIds = [...new Set(rows.filter((r) => r.target_type === "offer").map((r) => r.target_id))];
    const [profsRes, bizRes, offerRes] = await Promise.all([
      uids.length
        ? supabase.from("profiles").select("id, full_name").in("id", uids)
        : Promise.resolve({ data: [] } as any),
      bizIds.length
        ? supabase.from("businesses").select("id, name").in("id", bizIds)
        : Promise.resolve({ data: [] } as any),
      offerIds.length
        ? supabase.from("offers").select("id, title").in("id", offerIds)
        : Promise.resolve({ data: [] } as any),
    ]);
    const pm = new Map<string, string>();
    (profsRes.data ?? []).forEach((p: any) => pm.set(p.id, p.full_name));
    const bm = new Map<string, string>();
    (bizRes.data ?? []).forEach((b: any) => bm.set(b.id, b.name));
    const om = new Map<string, string>();
    (offerRes.data ?? []).forEach((o: any) => om.set(o.id, o.title));
    const newRows = rows.map((r) => ({
      ...r,
      reporter: pm.get(r.user_id) ?? null,
      target_name: r.target_type === "business" ? (bm.get(r.target_id) ?? null) : (om.get(r.target_id) ?? null),
    }));
    setList((prev) => (append ? [...prev, ...newRows] : newRows));
    setHasMore(newRows.length === REPORT_PAGE_SIZE);
    setLoadingMore(false);
  };
  useEffect(() => {
    setPage(0);
    void load(0, false);
  }, [refreshKey, debouncedQ]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    void load(next, true);
  };

  const onStatusChanged = (id: string, s: ReportStatus) => {
    setList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: s, resolved: s === "resolved" || s === "closed" } : r)),
    );
  };

  return (
    <Collapsible title="Báo cáo" icon={Flag} count={total}>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo nội dung báo cáo…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border bg-card text-sm"
        />
      </div>
      {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Chưa có báo cáo nào</p>}
      {list.map((r) => (
        <ReportRow key={r.id} r={r} onDeleted={() => load(0, false)} onStatusChanged={onStatusChanged} />
      ))}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-2 rounded-lg border text-sm font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          {loadingMore ? "Đang tải…" : `Tải thêm (còn ${total - list.length})`}
        </button>
      )}
    </Collapsible>
  );
}

function Broadcast() {
  const { user } = useAuth();
  const [title, setT] = useState("");
  const [body, setB] = useState("");
  const [loading, setL] = useState(false);
  const send = async () => {
    if (!title) {
      toast.error("Nhập tiêu đề");
      return;
    }
    if (!user) return;
    setL(true);
    const { data: profs } = await supabase.from("profiles").select("id").eq("status", "approved");
    if (profs?.length) {
      // Gửi TIN NHẮN THẬT từ admin tới từng thành viên — để bấm vào thông báo, vào Tin nhắn
      // sẽ thấy đúng nội dung. Trigger notify_new_message có sẵn tự tạo thông báo gộp
      // đúng nhóm "messages", không cần tự insert notifications nữa.
      const content = body ? `📢 ${title}\n${body}` : `📢 ${title}`;
      const rows = profs
        .filter((p: any) => p.id !== user.id)
        .map((p: any) => ({
          sender_id: user.id,
          receiver_id: p.id,
          content,
          // type "broadcast" riêng (không phải "text") để lọc khỏi hộp thư CỦA NGƯỜI GỬI
          // (xem MessagesInbox.load) — tránh 1 lần gửi N người tạo N hội thoại ảo cho admin.
          // Người nhận vẫn thấy bình thường vì filter chỉ áp dụng phía người gửi.
          type: "broadcast" as const,
        }));
      if (rows.length) await supabase.from("messages").insert(rows);
    }
    setL(false);
    setT("");
    setB("");
    toast.success("Đã gửi");
  };
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">📢 Phát thông báo</h3>
      <input
        value={title}
        onChange={(e) => setT(e.target.value)}
        placeholder="Tiêu đề"
        className="w-full px-3 py-2 rounded-lg border bg-card text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setB(e.target.value)}
        placeholder="Nội dung"
        rows={3}
        className="w-full px-3 py-2 rounded-lg border bg-card text-sm"
      />
      <button
        disabled={loading}
        onClick={send}
        className="w-full py-2.5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" /> Gửi cho tất cả thành viên
      </button>
    </div>
  );
}

function StatusBadge({ s }: { s?: string }) {
  if (!s || s === "approved") return null;
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  };
  const lbl: Record<string, string> = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối" };
  return (
    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold ${map[s] || "bg-muted"}`}>
      {lbl[s] || s}
    </span>
  );
}

function Collapsible({
  title,
  icon: Icon,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: any;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-t pt-4">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 font-bold">
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Icon className="w-4 h-4 text-primary" />
        <span>{title}</span>
        {count !== undefined && <span className="text-xs text-muted-foreground font-normal">({count})</span>}
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </section>
  );
}

const BIZ_PAGE_SIZE = 50;

function BusinessesSection({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [list, setList] = useState<(Business & { owner_name?: string | null })[]>([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = async (pageNum: number, append: boolean) => {
    setLoadingMore(true);
    const from = pageNum * BIZ_PAGE_SIZE;
    const to = from + BIZ_PAGE_SIZE - 1;
    let query = supabase
      .from("businesses")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (debouncedQ) query = query.ilike("name", `%${debouncedQ}%`);
    const { data: biz, count } = await query;
    setTotal(count ?? 0);
    const rows = (biz as Business[] | null) ?? [];
    const ownerIds = [...new Set(rows.map((b) => b.owner_id).filter(Boolean) as string[])];
    let map = new Map<string, string>();
    if (ownerIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ownerIds);
      (profs ?? []).forEach((p: any) => map.set(p.id, p.full_name));
    }
    const newRows = rows.map((b) => ({ ...b, owner_name: b.owner_id ? (map.get(b.owner_id) ?? null) : null }));
    setList((prev) => (append ? [...prev, ...newRows] : newRows));
    setHasMore(newRows.length === BIZ_PAGE_SIZE);
    setLoadingMore(false);
  };
  useEffect(() => {
    setPage(0);
    void load(0, false);
  }, [refreshKey, debouncedQ]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    void load(next, true);
  };

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    if (status === "rejected") {
      await supabase.from("offers").delete().eq("business_id", id);
      const { error } = await supabase.from("businesses").delete().eq("id", id);
      if (error) toast.error(error.message);
      else {
        toast.success("Đã từ chối và xóa");
        load(0, false);
        onChanged();
      }
      return;
    }
    const { error } = await supabase.from("businesses").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Đã cập nhật");
      load(0, false);
      onChanged();
    }
  };
  const togglePin = async (b: Business) => {
    const { error } = await supabase.from("businesses").update({ is_featured: !b.is_featured }).eq("id", b.id);
    if (error) toast.error(error.message);
    else {
      toast.success(b.is_featured ? "Đã bỏ ghim" : "Đã ghim");
      load(0, false);
    }
  };
  const del = async (id: string) => {
    if (!confirm("Xóa doanh nghiệp và toàn bộ ưu đãi?")) return;
    await supabase.from("offers").delete().eq("business_id", id);
    const { error } = await supabase.from("businesses").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Đã xóa");
      load(0, false);
      onChanged();
    }
  };

  return (
    <Collapsible title="Doanh nghiệp" icon={Building2} count={total}>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border bg-card text-sm"
        />
      </div>
      {list.map((b) => (
        <div key={b.id} className="p-2 bg-card rounded-xl flex items-center gap-2">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
            <StoredImage path={b.cover_url} alt={b.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate flex items-center gap-1">
              {b.is_featured && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
              {b.name}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {BUSINESS_TYPE_LABEL[b.type] || b.type} · Chủ: {b.owner_name || "—"}
            </div>
            <StatusBadge s={b.status} />
          </div>
          <div className="flex flex-col gap-1">
            {b.status === "pending" && (
              <>
                <button onClick={() => setStatus(b.id, "approved")} className="text-emerald-600" aria-label="Duyệt">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setStatus(b.id, "rejected")} className="text-red-600" aria-label="Từ chối">
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={() => togglePin(b)}
              className={b.is_featured ? "text-yellow-500" : "text-muted-foreground"}
              aria-label="Ghim"
            >
              <Star className={`w-4 h-4 ${b.is_featured ? "fill-yellow-400" : ""}`} />
            </button>
            <button onClick={() => del(b.id)} className="text-destructive" aria-label="Xóa">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      {list.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Không có kết quả</p>}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-2 rounded-lg border text-sm font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          {loadingMore ? "Đang tải…" : `Tải thêm (còn ${total - list.length})`}
        </button>
      )}
    </Collapsible>
  );
}

const OFFER_PAGE_SIZE = 50;

function OffersSection({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [list, setList] = useState<(Offer & { business_name?: string | null })[]>([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = async (pageNum: number, append: boolean) => {
    setLoadingMore(true);
    const from = pageNum * OFFER_PAGE_SIZE;
    const to = from + OFFER_PAGE_SIZE - 1;
    let query = supabase
      .from("offers")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (debouncedQ) query = query.ilike("title", `%${debouncedQ}%`);
    const { data: offers, count } = await query;
    setTotal(count ?? 0);
    const rows = (offers as Offer[] | null) ?? [];
    const bizIds = [...new Set(rows.map((o) => o.business_id))];
    let map = new Map<string, string>();
    if (bizIds.length) {
      const { data: biz } = await supabase.from("businesses").select("id, name").in("id", bizIds);
      (biz ?? []).forEach((b: any) => map.set(b.id, b.name));
    }
    const newRows = rows.map((o) => ({ ...o, business_name: map.get(o.business_id) ?? null }));
    setList((prev) => (append ? [...prev, ...newRows] : newRows));
    setHasMore(newRows.length === OFFER_PAGE_SIZE);
    setLoadingMore(false);
  };
  useEffect(() => {
    setPage(0);
    void load(0, false);
  }, [refreshKey, debouncedQ]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    void load(next, true);
  };

  const toggle = async (o: Offer) => {
    const next = o.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("offers").update({ status: next }).eq("id", o.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Đã cập nhật");
      load(0, false);
    }
  };
  const del = async (id: string) => {
    if (!confirm("Xóa ưu đãi?")) return;
    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Đã xóa");
      load(0, false);
      onChanged();
    }
  };

  return (
    <Collapsible title="Ưu đãi" icon={Tag} count={total}>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên ưu đãi…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border bg-card text-sm"
        />
      </div>
      {list.map((o) => (
        <div key={o.id} className="p-2 bg-card rounded-xl flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{o.title}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              🏢 {o.business_name || "—"} · {o.claim_count} lượt nhận
            </div>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${o.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
          >
            {o.status === "active" ? "Đang chạy" : "Tắt"}
          </span>
          <button onClick={() => toggle(o)} className="text-xs px-2 py-1 rounded border">
            {o.status === "active" ? "Tắt" : "Bật"}
          </button>
          <button onClick={() => del(o.id)} className="text-destructive" aria-label="Xóa">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      {list.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Không có kết quả</p>}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-2 rounded-lg border text-sm font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          {loadingMore ? "Đang tải…" : `Tải thêm (còn ${total - list.length})`}
        </button>
      )}
    </Collapsible>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 2: Exchanges management
// ──────────────────────────────────────────────────────────────────────────────
import { type Exchange as _Exchange } from "@/lib/types";

type ExchangeRow = _Exchange & { req_name?: string | null; rec_name?: string | null };

const EXCHANGE_PAGE_SIZE = 50;

function ExchangesSection({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [list, setList] = useState<ExchangeRow[]>([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [todayCompletedCount, setTodayCompletedCount] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = async (pageNum: number, append: boolean) => {
    setLoadingMore(true);
    const from = pageNum * EXCHANGE_PAGE_SIZE;
    const to = from + EXCHANGE_PAGE_SIZE - 1;
    // exchanges_view đã gộp sẵn req_name/rec_name (join businesses) — tìm kiếm được
    // thẳng bằng SQL ilike, không cần tự tra tên riêng nữa.
    let query = supabase
      .from("exchanges_view")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (debouncedQ) query = query.or(`req_name.ilike.%${debouncedQ}%,rec_name.ilike.%${debouncedQ}%`);
    const { data, count } = await query;
    setTotal(count ?? 0);
    const newRows = (data ?? []) as ExchangeRow[];
    setList((prev) => (append ? [...prev, ...newRows] : newRows));
    setHasMore(newRows.length === EXCHANGE_PAGE_SIZE);
    setLoadingMore(false);
  };

  const loadStats = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [{ count: pendingC }, { count: doneC }] = await Promise.all([
      supabase.from("exchanges").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("exchanges")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", todayStart.toISOString()),
    ]);
    setPendingCount(pendingC ?? 0);
    setTodayCompletedCount(doneC ?? 0);
  };

  useEffect(() => {
    setPage(0);
    void load(0, false);
    void loadStats();
  }, [refreshKey, debouncedQ]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    void load(next, true);
  };

  const remove = async (id: string) => {
    if (!confirm("Xóa trao đổi này?")) return;
    const { error } = await supabase.from("exchanges").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã xóa");
    load(0, false);
    loadStats();
    onChanged();
  };
  const setStatus = async (id: string, status: _Exchange["status"]) => {
    const patch: any = { status };
    if (status === "completed") patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from("exchanges").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã cập nhật");
    load(0, false);
    loadStats();
    onChanged();
  };

  return (
    <Collapsible title="Trao đổi" icon={Handshake} count={total}>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>
          Tổng: <b className="text-foreground">{total}</b>
        </span>
        <span>
          · Đang chờ: <b className="text-foreground">{pendingCount}</b>
        </span>
        <span>
          · Hoàn thành hôm nay: <b className="text-foreground">{todayCompletedCount}</b>
        </span>
      </div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên doanh nghiệp…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border bg-card text-sm"
        />
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">Không có kết quả</p>
      ) : (
        list.map((r) => (
          <div key={r.id} className="p-3 bg-card rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">
                  {r.req_name ?? "?"} → {r.rec_name ?? "?"}
                </div>
                <div className="text-muted-foreground">
                  {r.request_type} · {new Date(r.created_at).toLocaleDateString("vi-VN")}
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent font-semibold">{r.status}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.status !== "completed" && (
                <button
                  onClick={() => setStatus(r.id, "completed")}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold"
                >
                  Đánh dấu hoàn thành
                </button>
              )}
              {r.status !== "expired" && (
                <button
                  onClick={() => setStatus(r.id, "expired")}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-muted font-semibold"
                >
                  Hết hạn
                </button>
              )}
              <button
                onClick={() => remove(r.id)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-destructive/10 text-destructive font-semibold inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Xóa
              </button>
            </div>
          </div>
        ))
      )}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-2 rounded-lg border text-sm font-semibold text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          {loadingMore ? "Đang tải…" : `Tải thêm (còn ${total - list.length})`}
        </button>
      )}
    </Collapsible>
  );
}
