import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Profile, Business, Offer, Review, Report, ReportStatus } from "@/lib/types";
import { BUSINESS_TYPE_LABEL, BUSINESS_TYPES, BusinessType } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Trash2, Send, Save, Search, Star, Flag, ChevronDown, ChevronRight, Building2, Tag, Users, Sparkles } from "lucide-react";
import { StoredImage } from "@/components/StoredImage";
import { ReportRepliesPanel, ReportStatusBadge } from "@/components/ReportRepliesPanel";

interface MemberRow extends Profile {
  business?: Business | null;
  activeOffers: number;
  reviewCount: number;
  suggestionCount: number;
  claimCount: number;
}

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, refreshKey]);

  const load = async () => {
    const [{ data: profs }, { data: biz }, { data: offers }, { data: reviews }, { data: sugs }, { data: claims }] =
      await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("businesses").select("*"),
        supabase.from("offers").select("id, business_id, status"),
        supabase.from("reviews").select("id, user_id"),
        supabase.from("suggestions").select("id, user_id"),
        supabase.from("offer_claims").select("id, user_id"),
      ]);
    const bizByOwner = new Map<string, Business>();
    (biz as Business[] | null)?.forEach((b) => {
      if (b.owner_id) bizByOwner.set(b.owner_id, b);
    });
    const activeByBiz = new Map<string, number>();
    (offers ?? []).forEach((o: any) => {
      if (o.status !== "active") return;
      activeByBiz.set(o.business_id, (activeByBiz.get(o.business_id) ?? 0) + 1);
    });
    const reviewByUser = new Map<string, number>();
    (reviews ?? []).forEach((r: any) => reviewByUser.set(r.user_id, (reviewByUser.get(r.user_id) ?? 0) + 1));
    const sugByUser = new Map<string, number>();
    (sugs ?? []).forEach((s: any) => sugByUser.set(s.user_id, (sugByUser.get(s.user_id) ?? 0) + 1));
    const claimByUser = new Map<string, number>();
    (claims ?? []).forEach((c: any) => claimByUser.set(c.user_id, (claimByUser.get(c.user_id) ?? 0) + 1));

    setRows(
      ((profs as Profile[] | null) ?? []).map((p) => {
        const b = bizByOwner.get(p.id) ?? null;
        return {
          ...p,
          business: b,
          activeOffers: b ? (activeByBiz.get(b.id) ?? 0) : 0,
          reviewCount: reviewByUser.get(p.id) ?? 0,
          suggestionCount: sugByUser.get(p.id) ?? 0,
          claimCount: claimByUser.get(p.id) ?? 0,
        };
      }),
    );
  };

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return rows;
    return rows.filter(
      (r) =>
        r.full_name?.toLowerCase().includes(k) ||
        r.username?.toLowerCase().includes(k) ||
        r.business?.name?.toLowerCase().includes(k),
    );
  }, [rows, search]);

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
    if (error) { toast.error(error.message); return; }
    const d: any = data ?? {};
    toast.success(`Tìm thấy ${d.found ?? 0}, đã xóa ${d.deleted ?? 0} tài khoản`);
    refresh();
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-extrabold">Quản trị</h1>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên thành viên hoặc tên doanh nghiệp…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-card text-sm"
        />
      </div>

      <button
        onClick={cleanupOrphans}
        className="w-full py-2 rounded-lg border border-dashed text-xs font-semibold text-muted-foreground hover:bg-accent flex items-center justify-center gap-1.5"
      >
        <Sparkles className="w-3.5 h-3.5" /> Dọn dẹp tài khoản cũ (orphan auth)
      </button>

      <Collapsible title="Thành viên" icon={Users} count={filtered.length} defaultOpen>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Không có kết quả</p>
        ) : (
          filtered.map((r) => (
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
                </div>
              </div>
              <StatusBadge s={r.status} />
            </button>
          ))
        )}
      </Collapsible>

      <BusinessesSection refreshKey={refreshKey} onChanged={refresh} />
      <OffersSection refreshKey={refreshKey} onChanged={refresh} />
      <ReportsSection refreshKey={refreshKey} />
      <Broadcast />

      <MemberDetail row={selected} onClose={() => setSelected(null)} onChanged={refresh} onStatus={setStatus} />
    </div>
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
    const { data: r } = await supabase.from("reviews").select("*").eq("user_id", uid).order("created_at", { ascending: false });
    setReviews((r ?? []) as Review[]);
    if (bizId) {
      const { data: o } = await supabase
        .from("offers")
        .select("*")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false });
      setOffers((o ?? []) as Offer[]);
    } else setOffers([]);
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
    if (error) { toast.error(error.message); return; }
    toast.success("Đã xóa doanh nghiệp");
    setBiz(null);
    onChanged();
  };

  const delMember = async () => {
    if (!row || !confirm("Xóa thành viên này? Tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.")) return;
    const { error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: row.id } });
    if (error) { toast.error(error.message); return; }
    toast.success("Đã xóa thành viên");
    onChanged();
    onClose();
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
            </section>

            {biz && (
              <section className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-muted-foreground">DOANH NGHIỆP</div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setBFeat((v) => !v);
                      }}
                      className={`w-7 h-7 rounded-full grid place-items-center ${bFeatured ? "bg-yellow-400 text-white" : "bg-muted"}`}
                      aria-label="Nổi bật"
                    >
                      <Star className={`w-4 h-4 ${bFeatured ? "fill-white" : ""}`} />
                    </button>
                    <StatusBadge s={biz.status} />
                    <button
                      onClick={delBiz}
                      className="w-7 h-7 rounded-full bg-muted text-destructive grid place-items-center"
                      aria-label="Xóa DN"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {biz.cover_url && (
                  <div className="h-24 rounded-lg overflow-hidden">
                    <StoredImage path={biz.cover_url} alt={biz.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <input
                  value={bName}
                  onChange={(e) => setBN(e.target.value)}
                  placeholder="Tên DN"
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
                <input
                  value={bAddress}
                  onChange={(e) => setBA(e.target.value)}
                  placeholder="Địa chỉ"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                />
                <input
                  value={bPhone}
                  onChange={(e) => setBPh(e.target.value)}
                  placeholder="SĐT DN"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                />
                <input
                  value={bFb}
                  onChange={(e) => setBFb(e.target.value)}
                  placeholder="Facebook URL"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                />
                <input
                  value={bWeb}
                  onChange={(e) => setBW(e.target.value)}
                  placeholder="Website URL"
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                />
                <button
                  onClick={saveBiz}
                  disabled={saving}
                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1"
                >
                  <Save className="w-4 h-4" /> Lưu DN
                </button>
                {biz.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBizStatus("approved")}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-white font-semibold text-xs"
                    >
                      Duyệt DN
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

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReportsSection({ refreshKey }: { refreshKey: number }) {
  const [list, setList] = useState<(Report & { reporter?: string | null; target_name?: string | null })[]>([]);

  const load = async () => {
    const { data: reports } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    const rows = (reports ?? []) as Report[];
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
    setList(
      rows.map((r) => ({
        ...r,
        reporter: pm.get(r.user_id) ?? null,
        target_name: r.target_type === "business" ? (bm.get(r.target_id) ?? null) : (om.get(r.target_id) ?? null),
      })),
    );
  };
  useEffect(() => {
    load();
  }, [refreshKey]);

  const del = async (id: string) => {
    if (!confirm("Xóa báo cáo?")) return;
    await supabase.from("reports").delete().eq("id", id);
    load();
  };
  const onStatusChanged = (id: string, s: ReportStatus) => {
    setList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: s, resolved: s === "resolved" || s === "closed" } : r)),
    );
  };

  return (
    <section className="space-y-2 border-t pt-4">
      <h2 className="font-bold flex items-center gap-2">
        <Flag className="w-4 h-4 text-destructive" /> Báo cáo ({list.length})
      </h2>
      {list.length === 0 && <p className="text-sm text-muted-foreground">Chưa có báo cáo nào</p>}
      {list.map((r) => (
        <div key={r.id} className="p-3 bg-card rounded-xl space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[11px] text-muted-foreground flex-1 min-w-0">
              {r.reporter || "Ẩn danh"} → <b>{r.target_name || r.target_type}</b> ·{" "}
              {new Date(r.created_at).toLocaleString("vi-VN")}
            </div>
            <ReportStatusBadge s={r.status} />
          </div>
          <div className="text-sm">{r.description}</div>
          {r.photo_url && (
            <div className="h-32 rounded-lg overflow-hidden bg-muted">
              <StoredImage path={r.photo_url} alt="Ảnh báo cáo" className="w-full h-full object-cover" />
            </div>
          )}
          <ReportRepliesPanel
            reportId={r.id}
            canChangeStatus
            currentStatus={r.status}
            onStatusChange={(s) => onStatusChanged(r.id, s)}
          />
          <div className="flex gap-2 pt-1">
            <button onClick={() => del(r.id)} className="text-xs px-3 py-1 rounded bg-muted text-destructive">
              Xóa
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

function Broadcast() {
  const [title, setT] = useState("");
  const [body, setB] = useState("");
  const [loading, setL] = useState(false);
  const send = async () => {
    if (!title) {
      toast.error("Nhập tiêu đề");
      return;
    }
    setL(true);
    const { data: profs } = await supabase.from("profiles").select("id").eq("status", "approved");
    if (profs?.length) {
      const rows = profs.map((p: any) => ({
        user_id: p.id,
        type: "admin_message" as const,
        title,
        body,
        target_type: "system" as const,
      }));
      await supabase.from("notifications").insert(rows);
    }
    setL(false);
    setT("");
    setB("");
    toast.success("Đã gửi");
  };
  return (
    <section className="space-y-2 border-t pt-4">
      <h2 className="font-bold">Phát thông báo</h2>
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
    </section>
  );
}

function StatusBadge({ s }: { s?: string }) {
  if (!s) return null;
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

function Collapsible({ title, icon: Icon, count, children }: { title: string; icon: any; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="border-t pt-4">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 font-bold">
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Icon className="w-4 h-4 text-primary" />
        <span>{title}</span>
        <span className="text-xs text-muted-foreground font-normal">({count})</span>
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </section>
  );
}

function BusinessesSection({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [list, setList] = useState<(Business & { owner_name?: string | null })[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data: biz } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });
    const rows = (biz as Business[] | null) ?? [];
    const ownerIds = [...new Set(rows.map(b => b.owner_id).filter(Boolean) as string[])];
    let map = new Map<string, string>();
    if (ownerIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ownerIds);
      (profs ?? []).forEach((p: any) => map.set(p.id, p.full_name));
    }
    setList(rows.map(b => ({ ...b, owner_name: b.owner_id ? map.get(b.owner_id) ?? null : null })));
  };
  useEffect(() => { load(); }, [refreshKey]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return list;
    return list.filter(b =>
      b.name.toLowerCase().includes(k) ||
      (BUSINESS_TYPE_LABEL[b.type] || "").toLowerCase().includes(k)
    );
  }, [list, q]);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("businesses").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Đã cập nhật"); load(); onChanged(); }
  };
  const togglePin = async (b: Business) => {
    const { error } = await supabase.from("businesses").update({ is_featured: !b.is_featured }).eq("id", b.id);
    if (error) toast.error(error.message); else { toast.success(b.is_featured ? "Đã bỏ ghim" : "Đã ghim"); load(); }
  };
  const del = async (id: string) => {
    if (!confirm("Xóa doanh nghiệp và toàn bộ ưu đãi?")) return;
    await supabase.from("offers").delete().eq("business_id", id);
    const { error } = await supabase.from("businesses").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Đã xóa"); load(); onChanged(); }
  };

  return (
    <Collapsible title="Doanh nghiệp" icon={Building2} count={filtered.length}>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm theo tên hoặc loại…" className="w-full pl-9 pr-3 py-2 rounded-lg border bg-card text-sm" />
      </div>
      {filtered.map(b => (
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
                <button onClick={() => setStatus(b.id, "approved")} className="text-emerald-600" aria-label="Duyệt"><Check className="w-4 h-4" /></button>
                <button onClick={() => setStatus(b.id, "rejected")} className="text-red-600" aria-label="Từ chối"><X className="w-4 h-4" /></button>
              </>
            )}
            <button onClick={() => togglePin(b)} className={b.is_featured ? "text-yellow-500" : "text-muted-foreground"} aria-label="Ghim">
              <Star className={`w-4 h-4 ${b.is_featured ? "fill-yellow-400" : ""}`} />
            </button>
            <button onClick={() => del(b.id)} className="text-destructive" aria-label="Xóa"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      ))}
      {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Không có kết quả</p>}
    </Collapsible>
  );
}

function OffersSection({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [list, setList] = useState<(Offer & { business_name?: string | null })[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data: offers } = await supabase.from("offers").select("*").order("created_at", { ascending: false });
    const rows = (offers as Offer[] | null) ?? [];
    const bizIds = [...new Set(rows.map(o => o.business_id))];
    let map = new Map<string, string>();
    if (bizIds.length) {
      const { data: biz } = await supabase.from("businesses").select("id, name").in("id", bizIds);
      (biz ?? []).forEach((b: any) => map.set(b.id, b.name));
    }
    setList(rows.map(o => ({ ...o, business_name: map.get(o.business_id) ?? null })));
  };
  useEffect(() => { load(); }, [refreshKey]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return list;
    return list.filter(o => o.title.toLowerCase().includes(k) || (o.business_name || "").toLowerCase().includes(k));
  }, [list, q]);

  const toggle = async (o: Offer) => {
    const next = o.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("offers").update({ status: next }).eq("id", o.id);
    if (error) toast.error(error.message); else { toast.success("Đã cập nhật"); load(); }
  };
  const del = async (id: string) => {
    if (!confirm("Xóa ưu đãi?")) return;
    const { error } = await supabase.from("offers").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Đã xóa"); load(); onChanged(); }
  };

  return (
    <Collapsible title="Ưu đãi" icon={Tag} count={filtered.length}>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm theo ưu đãi hoặc DN…" className="w-full pl-9 pr-3 py-2 rounded-lg border bg-card text-sm" />
      </div>
      {filtered.map(o => (
        <div key={o.id} className="p-2 bg-card rounded-xl flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{o.title}</div>
            <div className="text-[11px] text-muted-foreground truncate">🏢 {o.business_name || "—"} · {o.claim_count} lượt nhận</div>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${o.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
            {o.status === "active" ? "Đang chạy" : "Tắt"}
          </span>
          <button onClick={() => toggle(o)} className="text-xs px-2 py-1 rounded border">
            {o.status === "active" ? "Tắt" : "Bật"}
          </button>
          <button onClick={() => del(o.id)} className="text-destructive" aria-label="Xóa"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Không có kết quả</p>}
    </Collapsible>
  );
}
