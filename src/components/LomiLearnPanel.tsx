// ─────────────────────────────────────────────────────────────────────────────
// QUẢN TRỊ → LOMI HỌC HỎI (01/10, theo ý Kir)
//  • ⁉️ Báo cáo: câu người dùng bấm ⁉️ (Lomi chưa biết / sai / lạc đề) → admin "Dạy Lomi" hoặc "Bỏ qua".
//  • Lomi bí: câu Lomi tự ghi nhận là chưa trả lời được (gộp trùng, đếm số lần hỏi).
//  • Đã dạy: các câu trả lời admin đã dạy — bật/tắt, sửa, xoá. Lomi dùng ngay cho mọi người
//    (máy người dùng tải lại danh sách mỗi 5 phút / mỗi lần mở trang Lomi).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { learnKey } from "@/lib/lomiLearn";
import { cn } from "@/lib/utils";

const db = supabase as any;

type Feedback = { id: string; question: string; answer: string; reason: string; note: string | null; status: string; created_at: string };
type Unanswered = { key: string; sample: string; ask_count: number; last_at: string };
type Taught = { id: string; key: string; question: string; answer: string; active: boolean; hits: number; updated_at: string };
type View = "feedback" | "unanswered" | "taught";
type TeachSrc = { feedbackId?: string; unansweredKey?: string; taughtId?: string };

const REASON: Record<string, string> = {
  unknown: "🤔 Lomi chưa biết",
  wrong: "❌ Trả lời sai",
  offtopic: "🙃 Lạc đề",
  other: "💬 Khác",
};
const fmt = (s: string) => new Date(s).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

export function LomiLearnPanel() {
  const [view, setView] = useState<View>("feedback");
  const [fb, setFb] = useState<Feedback[] | null>(null);
  const [un, setUn] = useState<Unanswered[] | null>(null);
  const [tg, setTg] = useState<Taught[] | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [teach, setTeach] = useState<{ q: string; a: string; src: TeachSrc } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadFb = async () => {
    let q = db.from("lomi_feedback").select("*").order("created_at", { ascending: false }).limit(200);
    q = showDone ? q.neq("status", "new") : q.eq("status", "new");
    const { data } = await q;
    setFb(data ?? []);
  };
  const loadUn = async () => {
    const { data } = await db.from("lomi_unanswered").select("key, sample, ask_count, last_at").order("ask_count", { ascending: false }).order("last_at", { ascending: false }).limit(200);
    setUn(data ?? []);
  };
  const loadTg = async () => {
    const { data } = await db.from("lomi_taught").select("*").order("updated_at", { ascending: false }).limit(500);
    setTg(data ?? []);
  };
  useEffect(() => {
    void loadFb();
  }, [showDone]);
  useEffect(() => {
    void loadUn();
    void loadTg();
  }, []);

  const dismiss = async (id: string) => {
    const { error } = await db.from("lomi_feedback").update({ status: "dismissed" }).eq("id", id);
    if (error) return void toast.error(error.message);
    setFb((p) => p?.filter((x) => x.id !== id) ?? p);
  };
  const delUn = async (key: string) => {
    const { error } = await db.from("lomi_unanswered").delete().eq("key", key);
    if (error) return void toast.error(error.message);
    setUn((p) => p?.filter((x) => x.key !== key) ?? p);
  };
  const toggleTg = async (t: Taught) => {
    const { error } = await db.from("lomi_taught").update({ active: !t.active, updated_at: new Date().toISOString() }).eq("id", t.id);
    if (error) return void toast.error(error.message);
    setTg((p) => p?.map((x) => (x.id === t.id ? { ...x, active: !t.active } : x)) ?? p);
  };
  const delTg = async (t: Taught) => {
    const { error } = await db.from("lomi_taught").delete().eq("id", t.id);
    if (error) return void toast.error(error.message);
    setTg((p) => p?.filter((x) => x.id !== t.id) ?? p);
  };

  const save = async () => {
    if (!teach) return;
    const lines = teach.q
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    const answer = teach.a.trim();
    if (!lines.length || !answer) return void toast.error("Cần ít nhất 1 câu hỏi và câu trả lời");
    const key = learnKey(lines[0]);
    if (key.length < 2) return void toast.error("Câu hỏi quá ngắn");
    setSaving(true);
    const row = { key, question: lines.join("\n").slice(0, 500), answer: answer.slice(0, 4000), active: true, updated_at: new Date().toISOString() };
    const { error } = teach.src.taughtId
      ? await db.from("lomi_taught").update(row).eq("id", teach.src.taughtId)
      : await db.from("lomi_taught").upsert(row, { onConflict: "key" });
    if (error) {
      setSaving(false);
      return void toast.error(error.message);
    }
    if (teach.src.feedbackId) await db.from("lomi_feedback").update({ status: "taught" }).eq("id", teach.src.feedbackId);
    if (teach.src.unansweredKey) await db.from("lomi_unanswered").delete().eq("key", teach.src.unansweredKey);
    // Các câu "bí" trùng với cách hỏi vừa dạy cũng xoá luôn.
    const keys = lines.map(learnKey).filter((k) => k.length >= 2);
    if (keys.length) await db.from("lomi_unanswered").delete().in("key", keys);
    setSaving(false);
    setTeach(null);
    toast.success("Đã dạy Lomi 🎓 Lomi sẽ trả lời câu này cho mọi người");
    void loadFb();
    void loadUn();
    void loadTg();
  };

  const tabs: [View, string, number | undefined][] = [
    ["feedback", "💡 Người dùng gửi", showDone ? undefined : fb?.length],
    ["unanswered", "🤔 Lomi bí", un?.length],
    ["taught", "🎓 Đã dạy", tg?.length],
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Người dùng bấm 💡 Dạy Lomi dưới câu Lomi chưa biết → hiện ở đây. Bấm <b>Dạy Lomi</b>, viết câu trả lời đúng — Lomi sẽ dùng câu đó cho mọi người.
      </p>
      <div className="flex gap-1.5 overflow-x-auto">
        {tabs.map(([k, label, n]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className={cn(
              "px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap border transition",
              view === k ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent",
            )}
          >
            {label}
            {n ? ` (${n})` : ""}
          </button>
        ))}
      </div>

      {view === "feedback" && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Xem câu đã xử lý
          </label>
          {!fb ? (
            <Skel />
          ) : !fb.length ? (
            <Empty text={showDone ? "Chưa có câu nào đã xử lý" : "Chưa có báo cáo mới 🎉"} />
          ) : (
            fb.map((f) => (
              <div key={f.id} className="bg-card border rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full bg-muted font-semibold">{REASON[f.reason] ?? f.reason}</span>
                  <span className="ml-auto">{fmt(f.created_at)}</span>
                  {f.status !== "new" && <span>{f.status === "taught" ? "✅ đã dạy" : "🚫 bỏ qua"}</span>}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Hỏi: </span>
                  <b>{f.question}</b>
                </div>
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Lomi đã trả lời</summary>
                  <div className="mt-1 whitespace-pre-wrap bg-muted rounded-lg p-2">{f.answer}</div>
                </details>
                {f.note && (
                  <div className="text-xs bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">
                    💬 Người dùng góp ý: <span className="whitespace-pre-wrap">{f.note}</span>
                  </div>
                )}
                {f.status === "new" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTeach({ q: f.question, a: f.note ?? "", src: { feedbackId: f.id } })}
                      className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      🎓 Dạy Lomi
                    </button>
                    <button onClick={() => void dismiss(f.id)} className="h-8 px-3 rounded-lg border text-xs">
                      Bỏ qua
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {view === "unanswered" && (
        <div className="space-y-2">
          {!un ? (
            <Skel />
          ) : !un.length ? (
            <Empty text="Lomi chưa bí câu nào 🎉" />
          ) : (
            un.map((u) => (
              <div key={u.key} className="bg-card border rounded-xl p-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold break-words">{u.sample}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {u.ask_count} lần hỏi · {fmt(u.last_at)}
                  </div>
                </div>
                <button
                  onClick={() => setTeach({ q: u.sample, a: "", src: { unansweredKey: u.key } })}
                  className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0"
                >
                  Dạy
                </button>
                <button onClick={() => void delUn(u.key)} className="h-8 px-2 rounded-lg border text-xs flex-shrink-0" aria-label="Xoá">
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {view === "taught" && (
        <div className="space-y-2">
          <button
            onClick={() => setTeach({ q: "", a: "", src: {} })}
            className="w-full h-9 rounded-xl border border-dashed text-sm font-semibold text-primary"
          >
            + Dạy Lomi câu mới
          </button>
          {!tg ? (
            <Skel />
          ) : !tg.length ? (
            <Empty text="Chưa dạy câu nào" />
          ) : (
            tg.map((t) => (
              <div key={t.id} className={cn("bg-card border rounded-xl p-3 space-y-1.5", !t.active && "opacity-60")}>
                <div className="text-sm font-semibold whitespace-pre-wrap">{t.question}</div>
                <div className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{t.answer}</div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                  <span>Đã dùng {t.hits} lần</span>
                  <button onClick={() => void toggleTg(t)} className="ml-auto font-semibold text-primary">
                    {t.active ? "Tắt" : "Bật"}
                  </button>
                  <button onClick={() => setTeach({ q: t.question, a: t.answer, src: { taughtId: t.id } })} className="font-semibold text-primary">
                    Sửa
                  </button>
                  <button onClick={() => void delTg(t)} className="font-semibold text-destructive">
                    Xoá
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={!!teach} onOpenChange={(o) => !o && !saving && setTeach(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🎓 Dạy Lomi</DialogTitle>
          </DialogHeader>
          {teach && (
            <div className="space-y-3">
              <div>
                <div className="text-xs font-semibold mb-1">Câu hỏi — mỗi dòng một cách hỏi khác nhau</div>
                <textarea
                  value={teach.q}
                  onChange={(e) => setTeach({ ...teach, q: e.target.value })}
                  rows={3}
                  placeholder={"vd: giá vàng hôm nay\ngiá vàng bao nhiêu"}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm resize-none"
                />
              </div>
              <div>
                <div className="text-xs font-semibold mb-1">Lomi sẽ trả lời</div>
                <textarea
                  value={teach.a}
                  onChange={(e) => setTeach({ ...teach, a: e.target.value })}
                  rows={6}
                  placeholder="Viết giọng Lomi: thân thiện, ngắn gọn, có emoji nha 😊"
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                />
              </div>
              <button
                disabled={saving}
                onClick={() => void save()}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
              >
                {saving ? "Đang lưu…" : "Lưu & dạy Lomi"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Skel() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="text-center text-sm text-muted-foreground py-8">{text}</div>;
}
