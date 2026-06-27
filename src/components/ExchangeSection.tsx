import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Handshake, Check, X, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Business, Exchange, ExchangeStatus } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/Avatar";
import { Link } from "react-router-dom";

const REQ_TYPES = [
  "Follow Facebook", "Follow TikTok", "Follow Instagram",
  "Subscribe YouTube", "Like Page", "Share Post", "Khác",
];

const ACTIVE: ExchangeStatus[] = ["pending", "accepted", "requester_done", "receiver_done"];

export function ExchangeSection({ business }: { business: Business }) {
  const { user, isApproved } = useAuth();
  const [myBusinesses, setMyBusinesses] = useState<Business[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string>("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [bizMap, setBizMap] = useState<Map<string, Business>>(new Map());
  const [tab, setTab] = useState<"active" | "completed" | "rejected">("active");
  const [open, setOpen] = useState(false);

  const isOwnerSelf = !!user && user.id === business.owner_id;
  const canExchange = !!user && isApproved && !isOwnerSelf && myBusinesses.length > 0;

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user?.id, business.id]);

  const load = async () => {
    // expire stale first (best-effort)
    await supabase.rpc("expire_stale_exchanges").catch(() => {});
    const { data: mine } = await supabase.from("businesses").select("*").eq("owner_id", user!.id);
    const mineList = (mine ?? []) as Business[];
    setMyBusinesses(mineList);
    if (mineList.length && !selectedReqId) setSelectedReqId(mineList[0].id);

    const mineIds = mineList.map((b) => b.id);
    if (mineIds.length === 0) { setExchanges([]); return; }
    // Exchanges where my biz is involved AND the other side is THIS business
    const { data } = await supabase
      .from("exchanges")
      .select("*")
      .or(
        [
          `and(requester_id.in.(${mineIds.join(",")}),receiver_id.eq.${business.id})`,
          `and(receiver_id.in.(${mineIds.join(",")}),requester_id.eq.${business.id})`,
        ].join(",")
      )
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Exchange[];
    setExchanges(list);

    const bizIds = new Set<string>();
    list.forEach((e) => { bizIds.add(e.requester_id); bizIds.add(e.receiver_id); });
    if (bizIds.size) {
      const { data: bs } = await supabase.from("businesses").select("*").in("id", [...bizIds]);
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
    tab === "active" ? ACTIVE.includes(e.status)
    : tab === "completed" ? e.status === "completed"
    : (e.status === "rejected" || e.status === "expired")
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-1.5"><Handshake className="w-4 h-4 text-primary" /> Trao đổi hỗ trợ</h2>
        {canExchange && (
          <button onClick={() => setOpen(true)} className="text-xs px-3 py-1.5 rounded-full bg-gradient-brand text-primary-foreground font-semibold">
            Gửi yêu cầu trao đổi
          </button>
        )}
      </div>

      {!user && <p className="text-xs text-muted-foreground">Đăng nhập để gửi yêu cầu trao đổi hỗ trợ.</p>}
      {user && !isOwnerSelf && myBusinesses.length === 0 && (
        <p className="text-xs text-muted-foreground">Bạn cần có hồ sơ doanh nghiệp để gửi yêu cầu trao đổi.</p>
      )}

      {exchanges.length > 0 && (
        <>
          <div className="flex gap-1 border-b">
            <TabBtn active={tab === "active"} onClick={() => setTab("active")}>Đang chờ ({counts.active})</TabBtn>
            <TabBtn active={tab === "completed"} onClick={() => setTab("completed")}>Hoàn thành ({counts.completed})</TabBtn>
            <TabBtn active={tab === "rejected"} onClick={() => setTab("rejected")}>Đã từ chối ({counts.rejected})</TabBtn>
          </div>
          <div className="space-y-2">
            {visible.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Không có trao đổi nào.</p>
            ) : visible.map((e) => (
              <ExchangeCard key={e.id} e={e} bizMap={bizMap} myBusinessIds={myBusinesses.map((b) => b.id)} onChanged={load} />
            ))}
          </div>
        </>
      )}

      <CreateExchangeDialog
        open={open}
        onOpenChange={setOpen}
        myBusinesses={myBusinesses}
        selectedReqId={selectedReqId}
        setSelectedReqId={setSelectedReqId}
        receiver={business}
        onCreated={load}
      />
    </section>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
      {children}
    </button>
  );
}

function CreateExchangeDialog({
  open, onOpenChange, myBusinesses, selectedReqId, setSelectedReqId, receiver, onCreated,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  myBusinesses: Business[]; selectedReqId: string; setSelectedReqId: (v: string) => void;
  receiver: Business; onCreated: () => void;
}) {
  const [reqType, setReqType] = useState(REQ_TYPES[0]);
  const [wantText, setWantText] = useState("");
  const [giveText, setGiveText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!selectedReqId) { toast.error("Chọn doanh nghiệp của bạn"); return; }
    if (!wantText.trim() || !giveText.trim()) { toast.error("Vui lòng điền đầy đủ thông tin"); return; }
    setBusy(true);
    const { error } = await supabase.from("exchanges").insert({
      requester_id: selectedReqId,
      receiver_id: receiver.id,
      request_type: reqType,
      request_description: wantText.trim(),
      return_description: giveText.trim(),
    } as any);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Đã gửi yêu cầu trao đổi");
    setWantText(""); setGiveText("");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Trao đổi với {receiver.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {myBusinesses.length > 1 && (
            <div>
              <div className="text-xs font-semibold mb-1">Doanh nghiệp của bạn</div>
              <select value={selectedReqId} onChange={(e) => setSelectedReqId(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm">
                {myBusinesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <div className="text-xs font-semibold mb-1">Loại yêu cầu</div>
            <select value={reqType} onChange={(e) => setReqType(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background text-sm">
              {REQ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs font-semibold mb-1">Bạn muốn nhận gì?</div>
            <input value={wantText} onChange={(e) => setWantText(e.target.value)} placeholder="Ví dụ: Follow TikTok của tôi" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
          </div>
          <div>
            <div className="text-xs font-semibold mb-1">Bạn sẽ làm gì đổi lại?</div>
            <input value={giveText} onChange={(e) => setGiveText(e.target.value)} placeholder="Ví dụ: Tôi sẽ follow Facebook của bạn" className="w-full px-3 py-2 rounded-lg border bg-background text-sm" />
          </div>
          <button onClick={submit} disabled={busy} className="w-full py-2.5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold text-sm disabled:opacity-50">
            {busy ? "Đang gửi…" : "Gửi yêu cầu"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExchangeCard({
  e, bizMap, myBusinessIds, onChanged,
}: { e: Exchange; bizMap: Map<string, Business>; myBusinessIds: string[]; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const iAmRequester = myBusinessIds.includes(e.requester_id);
  const otherId = iAmRequester ? e.receiver_id : e.requester_id;
  const other = bizMap.get(otherId);

  const update = async (patch: Partial<Exchange>) => {
    setBusy(true);
    const { error } = await supabase.from("exchanges").update(patch as any).eq("id", e.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    onChanged();
  };

  const accept = () => update({ status: "accepted" });
  const reject = () => update({ status: "rejected" });
  const requesterMarkDone = () => update({ status: "requester_done", requester_completed_at: new Date().toISOString() });
  const receiverMarkDone = () => update({ status: "receiver_done", receiver_completed_at: new Date().toISOString() });
  const receiverConfirm = () => update({ status: "accepted" }); // back to accepted: receiver now must do their part. Better: stay receiver_done? we'll do explicit
  const receiverConfirmAndDo = receiverMarkDone;
  const requesterConfirmCompletion = () => update({ status: "completed", completed_at: new Date().toISOString() });
  const receiverRejectDone = () => update({ status: "accepted", requester_completed_at: null }); // revert

  let body: React.ReactNode = null;
  if (e.status === "pending") {
    body = iAmRequester
      ? <Hint icon={<Clock className="w-3.5 h-3.5" />}>Đang chờ phản hồi…</Hint>
      : <div className="flex gap-2">
          <ActionBtn variant="primary" disabled={busy} onClick={accept}><Check className="w-3.5 h-3.5" /> Chấp nhận</ActionBtn>
          <ActionBtn variant="ghost" disabled={busy} onClick={reject}><X className="w-3.5 h-3.5" /> Từ chối</ActionBtn>
        </div>;
  } else if (e.status === "accepted") {
    body = iAmRequester
      ? <div className="space-y-1">
          <Hint>Bạn cần thực hiện yêu cầu của đối phương trước.</Hint>
          <ActionBtn variant="primary" disabled={busy} onClick={requesterMarkDone}><Check className="w-3.5 h-3.5" /> Tôi đã hoàn thành</ActionBtn>
        </div>
      : <Hint icon={<Clock className="w-3.5 h-3.5" />}>Đang chờ đối phương thực hiện…</Hint>;
  } else if (e.status === "requester_done") {
    body = iAmRequester
      ? <Hint icon={<Clock className="w-3.5 h-3.5" />}>Đang chờ đối phương xác nhận…</Hint>
      : <div className="space-y-1">
          <Hint>Hãy kiểm tra và xác nhận họ đã thực hiện.</Hint>
          <div className="flex gap-2">
            <ActionBtn variant="primary" disabled={busy} onClick={receiverConfirmAndDo}><Check className="w-3.5 h-3.5" /> Xác nhận & Tôi đã hoàn thành</ActionBtn>
            <ActionBtn variant="ghost" disabled={busy} onClick={receiverRejectDone}><X className="w-3.5 h-3.5" /> Chưa thực hiện</ActionBtn>
          </div>
        </div>;
  } else if (e.status === "receiver_done") {
    body = iAmRequester
      ? <div className="space-y-1">
          <Hint>Hãy kiểm tra và xác nhận đối phương đã hoàn thành.</Hint>
          <ActionBtn variant="primary" disabled={busy} onClick={requesterConfirmCompletion}><Check className="w-3.5 h-3.5" /> Xác nhận hoàn thành</ActionBtn>
        </div>
      : <Hint icon={<Clock className="w-3.5 h-3.5" />}>Đang chờ đối phương xác nhận…</Hint>;
  }

  return (
    <div className="p-3 rounded-xl bg-card shadow-sm space-y-2 border">
      <div className="flex items-center gap-2">
        <Avatar path={other?.cover_url} name={other?.name} size={28} />
        <Link to={`/dn/${otherId}`} className="flex-1 min-w-0 text-sm font-semibold truncate hover:text-primary">
          {other?.name || "Doanh nghiệp"}
        </Link>
        <StatusBadge s={e.status} />
      </div>
      <div className="text-xs text-muted-foreground">
        <div><b className="text-foreground">Loại:</b> {e.request_type}</div>
        <div><b className="text-foreground">{iAmRequester ? "Bạn muốn:" : "Họ muốn:"}</b> {e.request_description}</div>
        <div><b className="text-foreground">{iAmRequester ? "Bạn đổi:" : "Họ đổi:"}</b> {e.return_description}</div>
        <div className="text-[10px] mt-1">Tạo {new Date(e.created_at).toLocaleDateString("vi-VN")}</div>
      </div>
      {body}
    </div>
  );
}

function Hint({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return <div className="text-xs text-muted-foreground inline-flex items-center gap-1">{icon}{children}</div>;
}

function ActionBtn({ children, variant, disabled, onClick }: { children: React.ReactNode; variant: "primary" | "ghost"; disabled?: boolean; onClick: () => void }) {
  const base = "inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold disabled:opacity-50";
  const cls = variant === "primary" ? `${base} bg-primary text-primary-foreground` : `${base} border bg-background`;
  return <button disabled={disabled} onClick={onClick} className={cls}>{disabled ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : children}</button>;
}

function StatusBadge({ s }: { s: ExchangeStatus }) {
  const map: Record<ExchangeStatus, { t: string; c: string }> = {
    pending: { t: "Chờ phản hồi", c: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
    accepted: { t: "Đã chấp nhận", c: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" },
    requester_done: { t: "Người gửi đã xong", c: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" },
    receiver_done: { t: "Người nhận đã xong", c: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" },
    completed: { t: "Hoàn thành", c: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
    rejected: { t: "Đã từ chối", c: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200" },
    expired: { t: "Đã hết hạn", c: "bg-muted text-muted-foreground" },
  };
  const m = map[s];
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${m.c}`}>{m.t}</span>;
}
