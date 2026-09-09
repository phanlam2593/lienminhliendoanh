import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, X, Flame, Users, MessageCircle, Plus, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { NeedType, SwipeNeed, SwipeMatch } from "@/lib/types";

// Bảng swipe_needs/swipe_actions/swipe_matches được tạo trực tiếp qua SQL (không qua
// Lovable migration UI) nên CHƯA có trong types.ts generated — dùng (supabase as any)
// để bỏ qua kiểm tra type nghiêm ngặt của Database generic CHỈ cho 3 bảng này.
const db = supabase as any;

type ViewTab = "swipe" | "mine" | "matches";

interface OwnerInfo {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

type MatchRow = SwipeMatch & {
  otherUser: OwnerInfo | null;
  myNeed: SwipeNeed | null;
  otherNeed: SwipeNeed | null;
};

export default function Quet() {
  const { user, isApproved } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigate();

  const [tab, setTab] = useState<ViewTab>("swipe");
  const [typeFilter, setTypeFilter] = useState<NeedType | "all">("all");

  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<SwipeNeed[]>([]);
  const [owners, setOwners] = useState<Record<string, OwnerInfo>>({});

  const [myNeeds, setMyNeeds] = useState<SwipeNeed[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formType, setFormType] = useState<NeedType>("trao_doi");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formRole, setFormRole] = useState<"seeker" | "hirer">("seeker");
  const [formMode, setFormMode] = useState<"playmate" | "trade">("playmate");

  const myId = user?.id;

  const loadCandidates = async () => {
    if (!myId) return;
    setLoading(true);
    const { data: swiped } = await db.from("swipe_actions").select("need_id").eq("actor_id", myId);
    const swipedIds: string[] = (swiped ?? []).map((s: any) => s.need_id);

    let q = db.from("swipe_needs").select("*").eq("is_active", true).neq("user_id", myId);
    if (typeFilter !== "all") q = q.eq("need_type", typeFilter);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(50);
    if (error) {
      toast.error(t("common.error"));
      setLoading(false);
      return;
    }
    const filtered: SwipeNeed[] = (data ?? []).filter((n: SwipeNeed) => !swipedIds.includes(n.id));
    setCandidates(filtered);

    const ownerIds = Array.from(new Set(filtered.filter((n) => n.need_type !== "lam_quen").map((n) => n.user_id)));
    if (ownerIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles_public")
        .select("id, username, full_name, avatar_url")
        .in("id", ownerIds);
      const map: Record<string, OwnerInfo> = {};
      (profs ?? []).forEach((p: any) => (map[p.id] = p));
      setOwners(map);
    }
    setLoading(false);
  };

  const loadMyNeeds = async () => {
    if (!myId) return;
    const { data } = await db
      .from("swipe_needs")
      .select("*")
      .eq("user_id", myId)
      .order("created_at", { ascending: false });
    setMyNeeds(data ?? []);
  };

  const loadMatches = async () => {
    if (!myId) return;
    const { data } = await db
      .from("swipe_matches")
      .select("*")
      .or(`user_a.eq.${myId},user_b.eq.${myId}`)
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    if (rows.length === 0) {
      setMatches([]);
      return;
    }
    const needIds = Array.from(new Set(rows.flatMap((r: any) => [r.need_id_a, r.need_id_b])));
    const otherIds = Array.from(new Set(rows.map((r: any) => (r.user_a === myId ? r.user_b : r.user_a))));
    const [{ data: needs }, { data: profs }] = await Promise.all([
      db.from("swipe_needs").select("*").in("id", needIds),
      supabase.from("profiles_public").select("id, username, full_name, avatar_url").in("id", otherIds),
    ]);
    const needMap: Record<string, SwipeNeed> = {};
    (needs ?? []).forEach((n: SwipeNeed) => (needMap[n.id] = n));
    const profMap: Record<string, OwnerInfo> = {};
    (profs ?? []).forEach((p: any) => (profMap[p.id] = p));

    setMatches(
      rows.map((r: any) => {
        const otherUserId = r.user_a === myId ? r.user_b : r.user_a;
        const myNeedId = r.user_a === myId ? r.need_id_a : r.need_id_b;
        const otherNeedId = r.user_a === myId ? r.need_id_b : r.need_id_a;
        return {
          ...r,
          otherUser: profMap[otherUserId] ?? null,
          myNeed: needMap[myNeedId] ?? null,
          otherNeed: needMap[otherNeedId] ?? null,
        };
      }),
    );
  };

  useEffect(() => {
    if (!myId) return;
    void loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, typeFilter]);

  useEffect(() => {
    if (!myId) return;
    if (tab === "mine") void loadMyNeeds();
    if (tab === "matches") void loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, tab]);

  const act = async (need: SwipeNeed, action: "like" | "pass") => {
    if (!myId) return;
    setCandidates((prev) => prev.filter((n) => n.id !== need.id));
    const { error } = await db.from("swipe_actions").insert({ need_id: need.id, actor_id: myId, action });
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    if (action === "like") {
      const { data: newMatch } = await db
        .from("swipe_matches")
        .select("id")
        .or(`need_id_a.eq.${need.id},need_id_b.eq.${need.id}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (newMatch) toast.success(t("quet.matchToast"));
    }
  };

  const createNeed = async () => {
    if (!myId || !formTitle.trim()) return;
    setSaving(true);
    const details: Record<string, string> = {};
    if (formType === "tim_viec") details.role = formRole;
    if (formType === "game") details.mode = formMode;
    const { error } = await db.from("swipe_needs").insert({
      user_id: myId,
      need_type: formType,
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      area: formArea.trim() || null,
      details,
    });
    setSaving(false);
    if (error) {
      toast.error(t("common.error"));
      return;
    }
    setCreateOpen(false);
    setFormTitle("");
    setFormDesc("");
    setFormArea("");
    toast.success(t("common.saved"));
    void loadMyNeeds();
  };

  const toggleActive = async (need: SwipeNeed) => {
    setMyNeeds((prev) => prev.map((n) => (n.id === need.id ? { ...n, is_active: !n.is_active } : n)));
    await db.from("swipe_needs").update({ is_active: !need.is_active }).eq("id", need.id);
  };

  const deleteNeed = async (need: SwipeNeed) => {
    setMyNeeds((prev) => prev.filter((n) => n.id !== need.id));
    await db.from("swipe_needs").delete().eq("id", need.id);
  };

  const topCard = candidates[0];
  const topOwner = topCard ? owners[topCard.user_id] : null;

  if (!isApproved) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
        {t("quet.loginRequired")}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold flex items-center gap-1.5">
          <Flame className="w-5 h-5 text-primary" /> {t("quet.title")}
        </h1>
        <div className="flex items-center gap-1 rounded-full bg-muted p-1 text-xs font-semibold">
          {(["swipe", "mine", "matches"] as ViewTab[]).map((v) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={cn(
                "px-3 py-1.5 rounded-full transition",
                tab === v ? "bg-card shadow-soft text-primary" : "text-muted-foreground",
              )}
            >
              {v === "swipe" ? t("quet.tabSwipe") : v === "mine" ? t("quet.tabMine") : t("quet.tabMatches")}
            </button>
          ))}
        </div>
      </div>

      {tab === "swipe" && (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
            {(["all", "trao_doi", "lam_quen", "tim_viec", "game"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setTypeFilter(v)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border",
                  typeFilter === v
                    ? "bg-gradient-brand text-primary-foreground border-transparent"
                    : "bg-card text-muted-foreground",
                )}
              >
                {v === "all" ? t("quet.filterAll") : t(`quet.type.${v}`)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="h-[420px] rounded-2xl bg-muted animate-pulse" />
          ) : !topCard ? (
            <div className="h-[420px] rounded-2xl border border-dashed grid place-items-center text-center px-6 text-sm text-muted-foreground">
              <div>
                <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
                {t("quet.noMoreCards")}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative h-[420px] rounded-2xl overflow-hidden bg-card border shadow-soft">
                <div className="absolute inset-0 p-5 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    {topCard.need_type === "lam_quen" ? (
                      <div className="w-11 h-11 rounded-full bg-muted grid place-items-center">
                        <Users className="w-5 h-5 text-muted-foreground" />
                      </div>
                    ) : (
                      <Avatar path={topOwner?.avatar_url} name={topOwner?.full_name || topOwner?.username} size={44} />
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">
                        {topCard.need_type === "lam_quen"
                          ? t("quet.anonymous")
                          : topOwner?.full_name || topOwner?.username || "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{t(`quet.type.${topCard.need_type}`)}</div>
                    </div>
                  </div>
                  <div className="font-extrabold text-lg mb-1">{topCard.title}</div>
                  {topCard.area && <div className="text-xs text-muted-foreground mb-2">📍 {topCard.area}</div>}
                  {topCard.description && (
                    <div className="text-sm text-muted-foreground flex-1 overflow-y-auto">{topCard.description}</div>
                  )}
                  {topCard.need_type === "tim_viec" && (topCard.details as any)?.role && (
                    <div className="text-[11px] font-semibold text-primary mt-2">
                      {(topCard.details as any).role === "hirer" ? t("quet.roleHirer") : t("quet.roleSeeker")}
                    </div>
                  )}
                  {topCard.need_type === "game" && (topCard.details as any)?.mode && (
                    <div className="text-[11px] font-semibold text-primary mt-2">
                      {(topCard.details as any).mode === "trade" ? t("quet.modeTrade") : t("quet.modePlaymate")}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-2">{t("quet.contactHidden")}</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => act(topCard, "pass")}
                  aria-label={t("quet.pass")}
                  className="w-14 h-14 rounded-full border-2 border-muted-foreground/30 grid place-items-center text-muted-foreground active:scale-95 transition"
                >
                  <X className="w-6 h-6" />
                </button>
                <button
                  onClick={() => act(topCard, "like")}
                  aria-label={t("quet.like")}
                  className="w-14 h-14 rounded-full bg-gradient-brand text-primary-foreground grid place-items-center shadow-brand active:scale-95 transition"
                >
                  <Heart className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "mine" && (
        <div className="space-y-3">
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full py-2.5 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> {t("quet.createNeed")}
          </button>
          {myNeeds.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">{t("quet.emptyMyNeeds")}</div>
          ) : (
            myNeeds.map((n) => (
              <div key={n.id} className="rounded-xl border bg-card p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-primary">{t(`quet.type.${n.need_type}`)}</div>
                  <div className="font-bold text-sm truncate">{n.title}</div>
                  {n.area && <div className="text-xs text-muted-foreground">📍 {n.area}</div>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch checked={n.is_active} onCheckedChange={() => toggleActive(n)} />
                  <button onClick={() => deleteNeed(n)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "matches" && (
        <div className="space-y-2">
          {matches.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">{t("quet.emptyMatches")}</div>
          ) : (
            matches.map((m) => (
              <button
                key={m.id}
                onClick={() => m.otherUser && nav(`/tin-nhan/${m.otherUser.id}`)}
                className="w-full flex items-center gap-3 rounded-xl border bg-card p-3 text-left hover:bg-accent/40"
              >
                <Avatar path={m.otherUser?.avatar_url} name={m.otherUser?.full_name || m.otherUser?.username} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">
                    {m.otherUser?.full_name || m.otherUser?.username || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{m.otherNeed?.title}</div>
                </div>
                <MessageCircle className="w-4 h-4 text-primary" />
              </button>
            ))
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("quet.createNeed")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold mb-1">{t("quet.selectType")}</div>
              <Select value={formType} onValueChange={(v) => setFormType(v as NeedType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trao_doi">{t("quet.type.trao_doi")}</SelectItem>
                  <SelectItem value="lam_quen">{t("quet.type.lam_quen")}</SelectItem>
                  <SelectItem value="tim_viec">{t("quet.type.tim_viec")}</SelectItem>
                  <SelectItem value="game">{t("quet.type.game")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formType === "tim_viec" && (
              <Select value={formRole} onValueChange={(v) => setFormRole(v as "seeker" | "hirer")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seeker">{t("quet.roleSeeker")}</SelectItem>
                  <SelectItem value="hirer">{t("quet.roleHirer")}</SelectItem>
                </SelectContent>
              </Select>
            )}
            {formType === "game" && (
              <Select value={formMode} onValueChange={(v) => setFormMode(v as "playmate" | "trade")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="playmate">{t("quet.modePlaymate")}</SelectItem>
                  <SelectItem value="trade">{t("quet.modeTrade")}</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Input placeholder={t("quet.needTitle")} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            <Textarea
              placeholder={t("quet.needDescription")}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={3}
            />
            <Input placeholder={t("quet.needArea")} value={formArea} onChange={(e) => setFormArea(e.target.value)} />
            <button
              onClick={createNeed}
              disabled={saving || !formTitle.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-brand text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {t("common.save")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
