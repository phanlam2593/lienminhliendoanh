import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Handshake, Check, X, Clock, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import type { Business, Exchange, ExchangeStatus } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/Avatar";
import { Link } from "react-router-dom";

const REQ_TYPES = [
  "Follow Facebook",
  "Follow TikTok",
  "Follow Instagram",
  "Subscribe YouTube",
  "Like Page",
  "Share Post",
  "Khác",
];

const ACTIVE: ExchangeStatus[] = ["pending", "accepted", "requester_done", "receiver_done"];

function useStatusColor(): Record<ExchangeStatus, { dot: string; chip: string; label: string }> {
  const { t } = useLanguage();
  return {
    pending: {
      dot: "bg-amber-400",
      chip: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
      label: t("exchange.statusPending"),
    },
    accepted: {
      dot: "bg-sky-400",
      chip: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
      label: t("exchange.statusAccepted"),
    },
    requester_done: {
      dot: "bg-sky-500",
      chip: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
      label: t("exchange.statusRequesterDone"),
    },
    receiver_done: {
      dot: "bg-sky-500",
      chip: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
      label: t("exchange.statusReceiverDone"),
    },
    completed: {
      dot: "bg-emerald-500",
      chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
      label: t("exchange.statusCompleted"),
    },
    rejected: {
      dot: "bg-rose-500",
      chip: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
      label: t("exchange.statusRejected"),
    },
    expired: { dot: "bg-muted-foreground", chip: "bg-muted text-muted-foreground", label: t("exchange.statusExpired") },
  };
}

// Step index 0-5 for progress dots
const STATUS_STEP: Record<ExchangeStatus, number> = {
  pending: 1,
  accepted: 2,
  requester_done: 3,
  receiver_done: 4,
  completed: 6,
  rejected: 0,
  expired: 0,
};

export function ExchangeSection({ business }: { business: Business }) {
  const { t } = useLanguage();
  const { user, isApproved } = useAuth();
  const [myBusinesses, setMyBusinesses] = useState<Business[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string>("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [bizMap, setBizMap] = useState<Map<string, Business>>(new Map());
  const [tab, setTab] = useState<"active" | "completed" | "rejected">("active");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Exchange | null>(null);

  const isOwnerSelf = !!user && user.id === business.owner_id;
  const canExchange = !!user && isApproved && !isOwnerSelf && myBusinesses.length > 0;

  const myBizIds = useMemo(() => myBusinesses.map((b) => b.id), [myBusinesses]);
  const myPendingByBiz = useMemo(() => {
    const m = new Map<string, number>();
    exchanges.forEach((e) => {
      if (e.status === "pending" && myBizIds.includes(e.requester_id)) {
        m.set(e.requester_id, (m.get(e.requester_id) ?? 0) + 1);
      }
    });
    return m;
  }, [exchanges, myBizIds]);
  const selectedPending = myPendingByBiz.get(selectedReqId) ?? 0;
  const limitReached = selectedPending >= 5;

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user?.id, business.id]);

  const load = async () => {
    try {
      await supabase.rpc("expire_stale_exchanges" as any);
    } catch {}
    const { data: mine } = await supabase.from("businesses").select("*").eq("owner_id", user!.id);
    const mineList = (mine ?? []) as Business[];
    setMyBusinesses(mineList);
    if (mineList.length && !selectedReqId) setSelectedReqId(mineList[0].id);

    const mineIds = mineList.map((b) => b.id);
    if (mineIds.length === 0) {
      setExchanges([]);
      return;
    }
    const isViewingOwnBiz = mineIds.includes(business.id);
    const orFilter = isViewingOwnBiz
      ? `requester_id.eq.${business.id},receiver_id.eq.${business.id}`
      : [
          `and(requester_id.in.(${mineIds.join(",")}),receiver_id.eq.${business.id})`,
          `and(receiver_id.in.(${mineIds.join(",")}),requester_id.eq.${business.id})`,
        ].join(",");

    const { data } = await supabase
      .from("exchanges")
      .select("*")
      .or(orFilter)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Exchange[];
    setExchanges(list);

    const bizIds = new Set<string>();
    list.forEach((e) => {
      bizIds.add(e.requester_id);
      bizIds.add(e.receiver_id);
    });
    if (bizIds.size) {
      const { data: bs } = await supabase
        .from("businesses")
        .select("*")
        .in("id", [...bizIds]);
      const m = new Map<string, Business>();
      (bs ?? []).forEach((b: any) => m.set(b.id, b));
      setBizMap(m);
    }
  };

  const counts = {
    active: exchanges.filter((e) => ACTIVE.includes(e.status)).length,
    completed: exchanges.filter((e) => e.status === "completed").length,
    rejected: exchanges.filter((e) => e.status === "rejected" || e.status === "expired").length,
  };

  const visible = exchanges.filter((e) =>
    tab === "active"
      ? ACTIVE.includes(e.status)
      : tab === "completed"
        ? e.status === "completed"
        : e.status === "rejected" || e.status === "expired",
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-1.5">
          <Handshake className="w-4 h-4 text-primary" /> {t("exchange.title")}
        </h2>
        {canExchange && (
          <button
            onClick={() => !limitReached && setOpen(true)}
            disabled={limitReached}
            title={limitReached ? t("exchange.limitReached") : undefined}
            className="text-xs px-3 py-1.5 rounded-full bg-gradient-brand text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("exchange.sendRequest")}
          </button>
        )}
      </div>

      {!user && <p className="text-xs text-muted-foreground">{t("exchange.needLogin")}</p>}
      {user && !isOwnerSelf && myBusinesses.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("exchange.needBusiness")}</p>
      )}
      {canExchange && limitReached && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300">{t("exchange.limitReached")}</p>
      )}

      <div className="flex gap-1 border-b">
        <TabBtn active={tab === "active"} onClick={() => setTab("active")}>
          {t("exchange.tabActive")} ({counts.active})
        </TabBtn>
        <TabBtn active={tab === "completed"} onClick={() => setTab("completed")}>
          {t("exchange.tabCompleted")} ({counts.completed})
        </TabBtn>
        <TabBtn active={tab === "rejected"} onClick={() => setTab("rejected")}>
          {t("exchange.tabRejected")} ({counts.rejected})
        </TabBtn>
      </div>
      <div className="space-y-2">
        {visible.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          visible.map((e) => (
            <ExchangeCard
              key={e.id}
              e={e}
              bizMap={bizMap}
              myBusinessIds={myBizIds}
              onChanged={load}
              onOpen={() => setDetail(e)}
            />
          ))
        )}
      </div>

      <CreateExchangeDialog
        open={open}
        onOpenChange={setOpen}
        myBusinesses={myBusinesses}
        selectedReqId={selectedReqId}
        setSelectedReqId={setSelectedReqId}
        receiver={business}
        onCreated={load}
      />

      <ExchangeDetailDialog
        exchange={detail}
        bizMap={bizMap}
        onClose={() => setDetail(null)}
        myBusinessIds={myBizIds}
        onChanged={load}
      />
    </section>
  );
}

function EmptyState({ tab }: { tab: "active" | "completed" | "rejected" }) {
  const { t } = useLanguage();
  const msg = {
    active: t("exchange.emptyActive"),
    completed: t("exchange.emptyCompleted"),
    rejected: t("exchange.emptyRejected"),
  }[tab];
  return <div className="text-xs text-muted-foreground py-6 text-center bg-muted/30 rounded-xl">{msg}</div>;
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

function CreateExchangeDialog({
  open,
  onOpenChange,
  myBusinesses,
  selectedReqId,
  setSelectedReqId,
  receiver,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  myBusinesses: Business[];
  selectedReqId: string;
  setSelectedReqId: (v: string) => void;
  receiver: Business;
  onCreated: () => void;
}) {
  const { t } = useLanguage();
  const [reqType, setReqType] = useState(REQ_TYPES[0]);
  const [wantText, setWantText] = useState("");
  const [giveText, setGiveText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!selectedReqId) {
      setErr(t("exchange.selectBusinessErr"));
      return;
    }
    if (!wantText.trim() || !giveText.trim()) {
      setErr(t("exchange.fillAllErr"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("exchanges").insert({
      requester_id: selectedReqId,
      receiver_id: receiver.id,
      request_type: reqType,
      request_description: wantText.trim(),
      return_description: giveText.trim(),
    } as any);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    toast.success(t("exchange.requestSent"));
    setWantText("");
    setGiveText("");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("exchange.withWhom", { name: receiver.name })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {myBusinesses.length > 1 && (
            <div>
              <div className="text-xs font-semibold mb-1">{t("exchange.yourBusiness")}</div>
              <select
                value={selectedReqId}
                onChange={(e) => setSelectedReqId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              >
                {myBusinesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <div className="text-xs font-semibold mb-1">{t("exchange.reqTypeLabel")}</div>
            <select
              value={reqType}
              onChange={(e) => setReqType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
            >
              {REQ_TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs font-semibold mb-1">{t("exchange.wantLabel")}</div>
            <input
              value={wantText}
              onChange={(e) => setWantText(e.target.value)}
              placeholder={t("exchange.wantPlaceholder")}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
            />
          </div>
          <div>
            <div className="text-xs font-semibold mb-1">{t("exchange.giveLabel")}</div>
            <input
              value={giveText}
              onChange={(e) => setGiveText(e.target.value)}
              placeholder={t("exchange.givePlaceholder")}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
            />
          </div>
          {err && <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{err}</div>}
          <button
            onClick={submit}
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold text-sm disabled:opacity-50"
          >
            {busy ? t("exchange.sending") : t("exchange.sendRequestBtn")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${i <= step ? "bg-primary w-4" : "bg-muted w-2"}`}
        />
      ))}
    </div>
  );
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const { t } = useLanguage();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return <span className="text-[10px] text-rose-500">{t("exchange.statusExpired")}</span>;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return (
    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
      <Clock className="w-3 h-3" />{" "}
      {days > 0 ? t("exchange.daysLeft", { n: days }) : t("exchange.hoursLeft", { n: hours })}
    </span>
  );
}

function ExchangeCard({
  e,
  bizMap,
  myBusinessIds,
  onChanged,
  onOpen,
}: {
  e: Exchange;
  bizMap: Map<string, Business>;
  myBusinessIds: string[];
  onChanged: () => void;
  onOpen: () => void;
}) {
  const { t } = useLanguage();
  const STATUS_COLOR = useStatusColor();
  const [busy, setBusy] = useState(false);
  const iAmRequester = myBusinessIds.includes(e.requester_id);
  const mineId = iAmRequester ? e.requester_id : e.receiver_id;
  const otherId = iAmRequester ? e.receiver_id : e.requester_id;
  const mine = bizMap.get(mineId);
  const other = bizMap.get(otherId);
  const sc = STATUS_COLOR[e.status];

  const update = async (patch: Partial<Exchange>) => {
    setBusy(true);
    const { error } = await supabase
      .from("exchanges")
      .update(patch as any)
      .eq("id", e.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChanged();
  };

  const accept = () => update({ status: "accepted" });
  const reject = () => update({ status: "rejected" });
  const requesterMarkDone = () =>
    update({ status: "requester_done", requester_completed_at: new Date().toISOString() });
  const receiverConfirmAndDo = () =>
    update({ status: "receiver_done", receiver_completed_at: new Date().toISOString() });
  const requesterConfirmCompletion = () => update({ status: "completed", completed_at: new Date().toISOString() });
  const receiverRejectDone = () => update({ status: "accepted", requester_completed_at: null });

  let action: React.ReactNode = null;
  if (e.status === "pending" && !iAmRequester) {
    action = (
      <div className="flex gap-2">
        <ActionBtn variant="primary" disabled={busy} onClick={accept}>
          <Check className="w-3.5 h-3.5" /> {t("exchange.accept")}
        </ActionBtn>
        <ActionBtn variant="ghost" disabled={busy} onClick={reject}>
          <X className="w-3.5 h-3.5" /> {t("exchange.reject")}
        </ActionBtn>
      </div>
    );
  } else if (e.status === "accepted" && iAmRequester) {
    action = (
      <ActionBtn variant="primary" disabled={busy} onClick={requesterMarkDone}>
        <Check className="w-3.5 h-3.5" /> {t("exchange.iAmDone")}
      </ActionBtn>
    );
  } else if (e.status === "requester_done" && !iAmRequester) {
    action = (
      <div className="flex gap-2">
        <ActionBtn variant="primary" disabled={busy} onClick={receiverConfirmAndDo}>
          <Check className="w-3.5 h-3.5" /> {t("exchange.confirmAndDone")}
        </ActionBtn>
        <ActionBtn variant="ghost" disabled={busy} onClick={receiverRejectDone}>
          <X className="w-3.5 h-3.5" /> {t("exchange.notDoneYet")}
        </ActionBtn>
      </div>
    );
  } else if (e.status === "receiver_done" && iAmRequester) {
    action = (
      <ActionBtn variant="primary" disabled={busy} onClick={requesterConfirmCompletion}>
        <Check className="w-3.5 h-3.5" /> {t("exchange.confirmComplete")}
      </ActionBtn>
    );
  }

  return (
    <div className="p-3 rounded-2xl bg-card shadow-sm space-y-2 border hover:border-primary/40 transition-colors">
      <button onClick={onOpen} className="w-full text-left flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Avatar path={mine?.cover_url} name={mine?.name} size={32} />
          <span className="text-base">🤝</span>
          <Avatar path={other?.cover_url} name={other?.name} size={32} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">
            {mine?.name || "DN"} <span className="text-muted-foreground">·</span> {other?.name || "DN"}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">{e.request_type}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 ${sc.chip}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} /> {sc.label}
        </span>
        {ACTIVE.includes(e.status) && <Countdown expiresAt={e.expires_at} />}
      </div>
      {ACTIVE.includes(e.status) && <StepDots step={STATUS_STEP[e.status]} />}
      {action}
    </div>
  );
}

function ExchangeDetailDialog({
  exchange,
  bizMap,
  onClose,
  myBusinessIds,
  onChanged,
}: {
  exchange: Exchange | null;
  bizMap: Map<string, Business>;
  onClose: () => void;
  myBusinessIds: string[];
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  const STATUS_COLOR = useStatusColor();
  const [busy, setBusy] = useState(false);
  if (!exchange) return null;
  const e = exchange;
  const iAmRequester = myBusinessIds.includes(e.requester_id);
  const reqBiz = bizMap.get(e.requester_id);
  const recBiz = bizMap.get(e.receiver_id);
  const sc = STATUS_COLOR[e.status];

  const update = async (patch: Partial<Exchange>) => {
    setBusy(true);
    const { error } = await supabase
      .from("exchanges")
      .update(patch as any)
      .eq("id", e.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChanged();
    onClose();
  };

  const timeline: { at: string | null; label: string }[] = [
    { at: e.created_at, label: t("exchange.tlSent") },
    {
      at: e.status === "rejected" || e.status === "expired" ? e.updated_at : null,
      label: e.status === "rejected" ? t("exchange.tlRejected") : t("exchange.tlExpired"),
    },
    { at: e.requester_completed_at, label: t("exchange.tlReqDone") },
    { at: e.receiver_completed_at, label: t("exchange.tlRecDone") },
    { at: e.completed_at, label: t("exchange.tlCompleted") },
  ].filter((x) => x.at && x.label);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("exchange.detailTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <BusinessMini biz={reqBiz} role={t("exchange.roleRequester")} />
            <div className="text-2xl">🤝</div>
            <BusinessMini biz={recBiz} role={t("exchange.roleReceiver")} />
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-1 rounded-full font-semibold inline-flex items-center gap-1 ${sc.chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} /> {sc.label}
            </span>
            {ACTIVE.includes(e.status) && <StepDots step={STATUS_STEP[e.status]} />}
          </div>

          <div className="space-y-1 text-sm">
            <div>
              <b>{t("exchange.typeLabel")}</b> {e.request_type}
            </div>
            <div>
              <b>
                {reqBiz?.name || t("exchange.roleRequester")} {t("exchange.wants")}
              </b>{" "}
              {e.request_description}
            </div>
            <div>
              <b>
                {reqBiz?.name || t("exchange.roleRequester")} {t("exchange.givesBack")}
              </b>{" "}
              {e.return_description}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold mb-1.5">{t("exchange.history")}</div>
            <ol className="space-y-1.5 border-l-2 border-primary/30 pl-3">
              {timeline.map((tl, i) => (
                <li key={i} className="text-xs">
                  <div className="font-medium">{tl.label}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {tl.at ? new Date(tl.at).toLocaleString("vi-VN") : ""}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {ACTIVE.includes(e.status) && (
            <div className="flex flex-col gap-2 pt-2 border-t">
              {e.status === "pending" && !iAmRequester && (
                <>
                  <ActionBtn variant="primary" disabled={busy} onClick={() => update({ status: "accepted" })}>
                    <Check className="w-3.5 h-3.5" /> {t("exchange.accept")}
                  </ActionBtn>
                  <ActionBtn variant="ghost" disabled={busy} onClick={() => update({ status: "rejected" })}>
                    <X className="w-3.5 h-3.5" /> {t("exchange.reject")}
                  </ActionBtn>
                </>
              )}
              {e.status === "accepted" && iAmRequester && (
                <ActionBtn
                  variant="primary"
                  disabled={busy}
                  onClick={() => update({ status: "requester_done", requester_completed_at: new Date().toISOString() })}
                >
                  <Check className="w-3.5 h-3.5" /> {t("exchange.iAmDone")}
                </ActionBtn>
              )}
              {e.status === "requester_done" && !iAmRequester && (
                <>
                  <ActionBtn
                    variant="primary"
                    disabled={busy}
                    onClick={() => update({ status: "receiver_done", receiver_completed_at: new Date().toISOString() })}
                  >
                    <Check className="w-3.5 h-3.5" /> {t("exchange.confirmAndDone")}
                  </ActionBtn>
                  <ActionBtn
                    variant="ghost"
                    disabled={busy}
                    onClick={() => update({ status: "accepted", requester_completed_at: null })}
                  >
                    <X className="w-3.5 h-3.5" /> {t("exchange.notDoneYet")}
                  </ActionBtn>
                </>
              )}
              {e.status === "receiver_done" && iAmRequester && (
                <ActionBtn
                  variant="primary"
                  disabled={busy}
                  onClick={() => update({ status: "completed", completed_at: new Date().toISOString() })}
                >
                  <Check className="w-3.5 h-3.5" /> {t("exchange.confirmComplete")}
                </ActionBtn>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BusinessMini({ biz, role }: { biz?: Business; role: string }) {
  if (!biz) return <div className="flex-1 text-center text-xs text-muted-foreground">{role}</div>;
  return (
    <Link
      to={`/dn/${biz.id}`}
      className="flex-1 flex flex-col items-center text-center gap-1 hover:text-primary min-w-0"
    >
      <Avatar path={biz.cover_url} name={biz.name} size={48} />
      <div className="text-[10px] uppercase font-semibold text-muted-foreground">{role}</div>
      <div className="text-xs font-bold truncate w-full">{biz.name}</div>
    </Link>
  );
}

function ActionBtn({
  children,
  variant,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  variant: "primary" | "ghost";
  disabled?: boolean;
  onClick: () => void;
}) {
  const base =
    "inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold disabled:opacity-50";
  const cls = variant === "primary" ? `${base} bg-primary text-primary-foreground` : `${base} border bg-background`;
  return (
    <button disabled={disabled} onClick={onClick} className={cls}>
      {disabled ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : children}
    </button>
  );
}
