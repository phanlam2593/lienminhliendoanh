import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./Logo";
import { setWelcomeActive } from "@/lib/pwa";

/**
 * Welcome Onboarding — 5-page swipeable popup shown ONCE per user
 * (persisted via profiles.has_seen_welcome). Suppresses install banner
 * & push permission prompts while open; releases them on close.
 */

const LOCAL_SEEN_KEY = "lmld:welcome-seen";
const PRIMARY = "#0891b2";
const EMERALD = "#10b981";

function formatVi(n: number) {
  try { return new Intl.NumberFormat("vi-VN").format(n); } catch { return String(n); }
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/* =========================================================
   SVG DEFS — mascots & props
   ========================================================= */
function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <g id="wo-blobCyan">
          <path d="M43,4 C66,4 82,22 82,50 C82,76 65,88 43,88 C21,88 4,76 4,50 C4,22 20,4 43,4Z" fill="#38cde4"/>
          <path d="M43,4 C66,4 82,22 82,50 C82,76 65,88 43,88 C30,88 18,84 11,75 C30,82 66,74 68,44 C69,24 58,10 43,4Z" fill="#0891b2" opacity=".25"/>
          <g className="wo-eye"><circle cx="30" cy="44" r="5.5" fill="#0f172a"/><circle cx="32" cy="42" r="2" fill="#fff"/></g>
          <g className="wo-eye"><circle cx="56" cy="44" r="5.5" fill="#0f172a"/><circle cx="58" cy="42" r="2" fill="#fff"/></g>
          <ellipse cx="22" cy="56" rx="6" ry="4" fill="#f9a8d4" opacity=".7"/>
          <ellipse cx="64" cy="56" rx="6" ry="4" fill="#f9a8d4" opacity=".7"/>
          <path d="M36,58 Q43,66 50,58" stroke="#0f172a" strokeWidth={3} fill="none" strokeLinecap="round"/>
        </g>
        <g id="wo-blobGreen">
          <path d="M43,4 C66,4 82,22 82,50 C82,76 65,88 43,88 C21,88 4,76 4,50 C4,22 20,4 43,4Z" fill="#4ade9c"/>
          <path d="M43,4 C66,4 82,22 82,50 C82,76 65,88 43,88 C30,88 18,84 11,75 C30,82 66,74 68,44 C69,24 58,10 43,4Z" fill="#059669" opacity=".25"/>
          <path d="M20,14 Q28,2 34,12 M52,10 Q58,0 66,12" stroke="#059669" strokeWidth={4} fill="none" strokeLinecap="round"/>
          <g className="wo-eye"><circle cx="30" cy="44" r="5.5" fill="#0f172a"/><circle cx="32" cy="42" r="2" fill="#fff"/></g>
          <g className="wo-eye"><circle cx="56" cy="44" r="5.5" fill="#0f172a"/><circle cx="58" cy="42" r="2" fill="#fff"/></g>
          <ellipse cx="22" cy="56" rx="6" ry="4" fill="#fda4af" opacity=".7"/>
          <ellipse cx="64" cy="56" rx="6" ry="4" fill="#fda4af" opacity=".7"/>
          <path d="M36,58 Q43,66 50,58" stroke="#0f172a" strokeWidth={3} fill="none" strokeLinecap="round"/>
        </g>
        <g id="wo-gift">
          <rect x="4" y="12" width="26" height="20" rx="3" fill="#fb7185"/>
          <rect x="2" y="8" width="30" height="7" rx="2.5" fill="#f43f5e"/>
          <rect x="14" y="8" width="6" height="24" fill="#fde68a"/>
          <path d="M17,8 C11,8 8,2 13,1 C16,0.5 17,4 17,8 C17,4 18,0.5 21,1 C26,2 23,8 17,8Z" fill="#fde68a"/>
        </g>
        <g id="wo-heart">
          <path d="M15,26 C4,18 0,10 4,5 C8,0 14,2 15,7 C16,2 22,0 26,5 C30,10 26,18 15,26Z" fill="#fb7185"/>
          <circle cx="10" cy="8" r="2.5" fill="#fff" opacity=".6"/>
        </g>
        <g id="wo-thumb">
          <rect x="2" y="12" width="7" height="13" rx="2" fill="#0891b2"/>
          <path d="M10,13 L14,4 C15,1.5 19,2.5 18.5,5.5 L17,12 L24,12 C27,12 27,16 25,16.5 C27,17.5 26.5,20.5 24.5,21 C26,22 25,24.5 23,25 L12,25 L10,23Z" fill="#38cde4"/>
        </g>
        <g id="wo-plusfx">
          <circle cx="13" cy="13" r="12" fill="#4ade9c"/>
          <path d="M13,7 V19 M7,13 H19" stroke="#fff" strokeWidth={3.5} strokeLinecap="round"/>
        </g>
        <g id="wo-shop">
          <rect x="12" y="42" width="106" height="58" rx="8" fill="#fff"/>
          <rect x="12" y="42" width="106" height="58" rx="8" fill="#0891b2" opacity=".06"/>
          <rect x="6" y="22" width="118" height="14" rx="5" fill="#0891b2"/>
          <g>
            <path d="M6,34 a8,8 0 0 0 16,0Z" fill="#0891b2"/><path d="M22,34 a8,8 0 0 0 16,0Z" fill="#67e8f9"/>
            <path d="M38,34 a8,8 0 0 0 16,0Z" fill="#0891b2"/><path d="M54,34 a8,8 0 0 0 16,0Z" fill="#67e8f9"/>
            <path d="M70,34 a8,8 0 0 0 16,0Z" fill="#0891b2"/><path d="M86,34 a8,8 0 0 0 16,0Z" fill="#67e8f9"/>
            <path d="M102,34 a8,8 0 0 0 16,0Z" fill="#0891b2"/>
          </g>
          <rect x="42" y="8" width="46" height="16" rx="6" fill="#10b981"/>
          <circle cx="52" cy="16" r="3" fill="#fff"/>
          <rect x="58" y="13" width="24" height="2.5" rx="1.25" fill="#fff"/>
          <rect x="58" y="18" width="16" height="2.5" rx="1.25" fill="#fff" opacity=".7"/>
          <rect x="26" y="58" width="26" height="42" rx="5" fill="#0e7490"/>
          <circle cx="46" cy="80" r="2.5" fill="#fde68a"/>
          <rect x="64" y="58" width="42" height="26" rx="5" fill="#a5f3fc"/>
          <path d="M64,71 H106 M85,58 V84" stroke="#fff" strokeWidth={2.5}/>
          <rect x="79" y="88" width="14" height="9" rx="2" fill="#fb7185"/>
        </g>
        <g id="wo-miniM">
          <path d="M20,2 C31,2 38,10 38,22 C38,34 30,40 20,40 C10,40 2,34 2,22 C2,10 9,2 20,2Z" fill="#38cde4"/>
          <circle cx="14" cy="20" r="2.8" fill="#0f172a"/>
          <circle cx="26" cy="20" r="2.8" fill="#0f172a"/>
          <path d="M15,27 Q20,31 25,27" stroke="#0f172a" strokeWidth={2} fill="none" strokeLinecap="round"/>
        </g>
        <g id="wo-miniF">
          <path d="M20,2 C31,2 38,10 38,22 C38,34 30,40 20,40 C10,40 2,34 2,22 C2,10 9,2 20,2Z" fill="#fbbf24"/>
          <path d="M8,10 Q20,-4 32,10 L32,16 Q20,8 8,16Z" fill="#f59e0b"/>
          <circle cx="14" cy="21" r="2.8" fill="#0f172a"/>
          <circle cx="26" cy="21" r="2.8" fill="#0f172a"/>
          <path d="M15,28 Q20,32 25,28" stroke="#0f172a" strokeWidth={2} fill="none" strokeLinecap="round"/>
          <ellipse cx="9" cy="26" rx="3" ry="2" fill="#fda4af" opacity=".8"/>
          <ellipse cx="31" cy="26" rx="3" ry="2" fill="#fda4af" opacity=".8"/>
        </g>
      </defs>
    </svg>
  );
}

const Blob = ({ variant, className, style }: { variant: "cyan" | "green"; className?: string; style?: any }) => (
  <svg viewBox="0 0 86 92" className={className} style={style} aria-hidden>
    <use href={variant === "cyan" ? "#wo-blobCyan" : "#wo-blobGreen"} />
  </svg>
);

/* =========================================================
   Scenes
   ========================================================= */
function SceneClouds() {
  return (
    <>
      <span className="wo-cloud wo-cl1" />
      <span className="wo-cloud wo-cl2" />
    </>
  );
}

function Scene1() {
  return (
    <div className="wo-scene wo-s1">
      <SceneClouds />
      <div className="wo-blob wo-abs-a"><Blob variant="cyan" className="wo-bob" /></div>
      <div className="wo-blob wo-abs-b"><Blob variant="green" className="wo-bob wo-rev" /></div>
      <svg viewBox="0 0 34 34" className="wo-fly wo-gift"><use href="#wo-gift"/></svg>
      <svg viewBox="0 0 30 30" className="wo-fly wo-heartfly"><use href="#wo-heart"/></svg>
      <div className="wo-badge">Cho là nhận, nhận cũng là cho</div>
    </div>
  );
}

const TicketIcons = {
  coffee: (
    <svg viewBox="0 0 24 24" width={24} height={24}>
      <rect x="4" y="8" width="14" height="11" rx="2" fill="#fff7ed" stroke="#f59e0b" strokeWidth={1.5}/>
      <path d="M18 10h2a2 2 0 0 1 0 4h-2" stroke="#f59e0b" strokeWidth={1.5} fill="none"/>
      <path d="M8 4c0 2 2 2 2 4M12 4c0 2 2 2 2 4" stroke="#f59e0b" strokeWidth={1.5} fill="none" strokeLinecap="round"/>
    </svg>
  ),
  spa: (
    <svg viewBox="0 0 24 24" width={24} height={24}>
      <circle cx="12" cy="12" r="10" fill="#fdf2f8"/>
      <path d="M12 5c2 3 2 5 0 8-2-3-2-5 0-8z" fill="#ec4899"/>
      <path d="M6 13c3-1 5-1 7 1-3 1-5 1-7-1zM18 13c-3-1-5-1-7 1 3 1 5 1 7-1z" fill="#ec4899" opacity=".7"/>
    </svg>
  ),
  noodle: (
    <svg viewBox="0 0 24 24" width={24} height={24}>
      <path d="M3 12h18l-1 6a3 3 0 0 1-3 2H7a3 3 0 0 1-3-2z" fill="#f0fdf4" stroke="#10b981" strokeWidth={1.5}/>
      <path d="M7 12c1-3 3-4 5-4M11 12c0-2 2-3 4-3" stroke="#10b981" strokeWidth={1.5} fill="none" strokeLinecap="round"/>
    </svg>
  ),
};

function Ticket({ pos, icon, title, code }: { pos: "t1" | "t2" | "t3"; icon: React.ReactNode; title: string; code: string }) {
  return (
    <div className={`wo-ticket wo-${pos}`}>
      <div className="wo-ticket-ic">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold text-slate-900 truncate">{title}</div>
      </div>
      <div className="wo-dash">{code}</div>
    </div>
  );
}

function Scene2() {
  return (
    <div className="wo-scene wo-s2">
      <SceneClouds />
      <Ticket pos="t1" icon={TicketIcons.coffee} title="Cafe nhà B – Giảm 10% · Mua 5 tặng 1" code="CF10" />
      <Ticket pos="t2" icon={TicketIcons.spa} title="Spa nhà C – -10% buổi sáng" code="SPA10" />
      <Ticket pos="t3" icon={TicketIcons.noodle} title="Quán ăn nhà D – Ưu đãi 150k bao ăn" code="AN150" />
    </div>
  );
}

function Scene3({ active }: { active: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) { setCount(0); return; }
    if (prefersReducedMotion()) { setCount(10000); return; }
    let n = 0;
    const id = setInterval(() => {
      n = Math.min(10000, n + 137);
      setCount(n);
      if (n >= 10000) clearInterval(id);
    }, 24);
    return () => clearInterval(id);
  }, [active]);
  return (
    <div className="wo-scene wo-s3">
      <SceneClouds />
      <svg viewBox="0 0 130 110" className="wo-shopsvg" aria-hidden><use href="#wo-shop"/></svg>
      <svg viewBox="0 0 40 44" className="wo-mini wo-m1"><use href="#wo-miniM"/></svg>
      <svg viewBox="0 0 40 44" className="wo-mini wo-m2"><use href="#wo-miniF"/></svg>
      <svg viewBox="0 0 40 44" className="wo-mini wo-m3"><use href="#wo-miniF"/></svg>
      <svg viewBox="0 0 40 44" className="wo-mini wo-m4"><use href="#wo-miniM"/></svg>
      <div className="wo-count">{formatVi(count)} khách tiềm năng</div>
    </div>
  );
}

function Scene4() {
  return (
    <div className="wo-scene wo-s4">
      <SceneClouds />
      <div className="wo-blob wo-abs-a"><Blob variant="cyan" className="wo-bob" /></div>
      <div className="wo-blob wo-abs-b"><Blob variant="green" className="wo-bob wo-rev" /></div>
      <svg viewBox="0 0 30 30" className="wo-fx wo-f1"><use href="#wo-heart"/></svg>
      <svg viewBox="0 0 26 26" className="wo-fx wo-f2"><use href="#wo-plusfx"/></svg>
      <svg viewBox="0 0 26 26" className="wo-fx wo-f3"><use href="#wo-thumb"/></svg>
      <span className="wo-tag wo-ta">🎥 Bạn</span>
      <span className="wo-tag wo-tb">Cộng đồng 💚</span>
    </div>
  );
}

function Scene5({ active }: { active: boolean }) {
  const confetti = useMemo(() => {
    const colors = ["#0891b2", "#10b981", "#fbbf24", "#fb7185", "#67e8f9"];
    return Array.from({ length: 16 }, (_, i) => ({
      left: 4 + Math.random() * 92,
      dur: 2.6 + Math.random() * 2.4,
      delay: Math.random() * 3,
      color: colors[i % colors.length],
    }));
  }, []);
  return (
    <div className="wo-scene wo-s5">
      <div className="wo-blob wo-abs-a"><Blob variant="cyan" className="wo-bob" /></div>
      <div className="wo-blob wo-abs-b"><Blob variant="green" className="wo-bob wo-rev" /></div>
      {active && confetti.map((c, i) => (
        <span
          key={i}
          className="wo-conf"
          style={{
            left: `${c.left}%`,
            background: c.color,
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* =========================================================
   Slide content
   ========================================================= */
function FlowChip({ children }: { children: React.ReactNode }) {
  return <div className="wo-chip">{children}</div>;
}
function FlowArrow({ two = false }: { two?: boolean }) {
  return <div className="wo-arw">{two ? "⇅" : "⬇"}</div>;
}

function Slide({ index, active, memberNumber }: { index: number; active: boolean; memberNumber: number }) {
  const key = active ? `active-${index}` : `idle-${index}`;
  if (index === 0) {
    return (
      <div key={key} className={`wo-slide ${active ? "wo-active" : ""}`}>
        <Scene1 />
        <h2 className="wo-h2">
          Chào mừng <span className="wo-hl">thành viên thứ {formatVi(memberNumber)}</span> của cộng đồng!
        </h2>
        <p className="wo-kao">Cám ơn bạn đã tham gia Liên Minh! *\(^^)/*</p>
        <div className="wo-duo">
          <div className="wo-line">🎁 Ở đây, tất cả thành viên đều là <b>khách hàng tiềm năng</b> của bạn!</div>
          <div className="wo-line">💝 Ở đây, tất cả doanh nghiệp đều có <b>ưu đãi dành riêng</b> cho bạn!</div>
        </div>
        <p className="wo-closing">Để Liên Minh giới thiệu sơ cho bạn nhé 👇</p>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div key={key} className={`wo-slide ${active ? "wo-active" : ""}`}>
        <Scene2 />
        <h2 className="wo-h2">Bạn là <span className="wo-hl">thành viên</span>?<br/>Đi đâu cũng nhận được ưu đãi</h2>
        <div className="wo-flow">
          <FlowChip>Nhận mã ưu đãi trong app</FlowChip>
          <FlowArrow />
          <FlowChip>Đưa cho doanh nghiệp</FlowChip>
        </div>
        <p className="wo-simple">Đơn giản vậy thôi!</p>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div key={key} className={`wo-slide ${active ? "wo-active" : ""}`}>
        <Scene3 active={active} />
        <h2 className="wo-h2">Bạn đang <span className="wo-hl">kinh doanh</span><br/>bất kì loại hình nào?</h2>
        <div className="wo-flow">
          <FlowChip>Đăng ưu đãi có lợi cho bạn</FlowChip>
          <FlowArrow />
          <FlowChip>Cả cộng đồng là khách của bạn</FlowChip>
        </div>
        <p className="wo-simple">Đơn giản vậy thôi!</p>
      </div>
    );
  }
  if (index === 3) {
    return (
      <div key={key} className={`wo-slide ${active ? "wo-active" : ""}`}>
        <Scene4 />
        <h2 className="wo-h2">Bạn là <span className="wo-hl">người sáng tạo nội dung</span>?<br/>
          <span className="text-xs font-medium text-slate-500">(TikToker, YouTuber, streamer...)</span>
        </h2>
        <div className="wo-flow">
          <FlowChip>Bạn like, follow, share cộng đồng</FlowChip>
          <FlowArrow two />
          <FlowChip>Cộng đồng like, follow, share bạn</FlowChip>
        </div>
        <p className="wo-simple">Đơn giản vậy thôi!</p>
      </div>
    );
  }
  return (
    <div key={key} className={`wo-slide ${active ? "wo-active" : ""}`}>
      <Scene5 active={active} />
      <h2 className="wo-h2"><span className="wo-hl">Bạn luôn có thứ để cho,<br/>và luôn có thứ để nhận</span></h2>
      <p className="wo-kao">📲 Cài App vào màn hình chính và bật thông báo để giữ kết nối nhé!</p>
    </div>
  );
}

/* =========================================================
   Main component
   ========================================================= */
export function WelcomeOnboarding() {
  const { user, profile, refresh } = useAuth();
  const [page, setPage] = useState(0);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const dragging = useRef(false);

  // Decide whether to show
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.has_seen_welcome) {
      setVisible(false);
      return;
    }
    try {
      if (localStorage.getItem(LOCAL_SEEN_KEY) === profile.id) {
        // Cache says already seen — sync DB just in case, don't show
        setVisible(false);
        void supabase.from("profiles").update({ has_seen_welcome: true }).eq("id", profile.id);
        return;
      }
    } catch {}
    setVisible(true);
  }, [user?.id, profile?.id, profile?.has_seen_welcome]);

  // Manage the "welcome active" flag that gates install banner + push
  useEffect(() => {
    if (visible) setWelcomeActive(true);
    return () => {
      if (visible) setWelcomeActive(false);
    };
  }, [visible]);

  // Lock body scroll
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [visible]);

  const close = async () => {
    if (closing) return;
    setClosing(true);
    try { localStorage.setItem(LOCAL_SEEN_KEY, profile?.id ?? ""); } catch {}
    setWelcomeActive(false);
    if (profile?.id) {
      await supabase.from("profiles").update({ has_seen_welcome: true }).eq("id", profile.id);
      await refresh();
    }
    setVisible(false);
    setClosing(false);
  };

  const go = (i: number) => setPage(Math.max(0, Math.min(4, i)));

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; dragging.current = true; };
  const onTouchMove = (_e: React.TouchEvent) => {};
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!dragging.current || startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    dragging.current = false;
    startX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) go(page + 1);
    else go(page - 1);
  };

  if (!visible || !profile) return null;

  const memberNumber = profile.member_number ?? 1;
  const isLast = page === 4;

  return (
    <div className="wo-root" role="dialog" aria-modal="true" aria-label="Chào mừng thành viên mới">
      <SvgDefs />
      {/* Header */}
      <div className="wo-header">
        <div className="flex items-center gap-2 min-w-0">
          <Logo size={28} />
          <div className="text-[13px] font-bold text-slate-800 truncate">Liên Minh Liên Doanh</div>
        </div>
        <button
          onClick={close}
          className="text-[12px] font-semibold text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-full flex items-center gap-1"
          aria-label="Bỏ qua"
        >
          Bỏ qua <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Track */}
      <div
        className="wo-body"
        ref={trackRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="wo-track" style={{ transform: `translateX(-${page * 100}%)` }}>
          {[0,1,2,3,4].map((i) => (
            <div key={i} className="wo-page">
              <Slide index={i} active={page === i} memberNumber={memberNumber} />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="wo-footer">
        <div className="wo-dots" role="tablist" aria-label="Trang">
          {[0,1,2,3,4].map((i) => (
            <button
              key={i}
              className={`wo-dot ${page === i ? "wo-dot-active" : ""}`}
              onClick={() => go(i)}
              aria-label={`Đến trang ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={() => (isLast ? close() : go(page + 1))}
          className="wo-cta"
        >
          {isLast ? "Bắt đầu!" : "Tiếp tục"}
        </button>
      </div>

      <style>{`
        .wo-root {
          position: fixed; inset: 0; z-index: 200; background: #f8fafc;
          display: flex; flex-direction: column;
          animation: wo-fadein .2s ease-out;
        }
        @keyframes wo-fadein { from { opacity: 0 } to { opacity: 1 } }
        .wo-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; border-bottom: 1px solid #e2e8f0; background: #fff;
        }
        .wo-body { flex: 1; overflow: hidden; position: relative; }
        .wo-track {
          display: flex; height: 100%;
          transition: transform .35s cubic-bezier(.22,1,.36,1);
          will-change: transform;
        }
        .wo-page { flex: 0 0 100%; height: 100%; overflow-y: auto; }
        .wo-slide {
          min-height: 100%;
          padding: 12px 18px 24px;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          gap: 10px;
        }
        .wo-footer {
          padding: 12px 18px calc(12px + env(safe-area-inset-bottom));
          border-top: 1px solid #e2e8f0; background: #fff;
          display: flex; flex-direction: column; gap: 10px; align-items: center;
        }
        .wo-dots { display: flex; gap: 6px; }
        .wo-dot {
          width: 8px; height: 8px; border-radius: 99px; background: #cbd5e1;
          transition: all .2s;
        }
        .wo-dot-active { background: linear-gradient(135deg,#0891b2,#10b981); width: 22px; }
        .wo-cta {
          width: 100%; padding: 13px 20px; border-radius: 14px;
          background: linear-gradient(135deg,#0891b2,#10b981);
          color: #fff; font-weight: 800; font-size: 15px;
          box-shadow: 0 6px 18px rgba(8,145,178,.32);
          transition: transform .1s;
        }
        .wo-cta:active { transform: scale(.97); }

        /* Scene common */
        .wo-scene {
          width: 100%; max-width: 330px; height: 200px; position: relative;
          margin: 4px 0 10px;
          background:
            radial-gradient(circle at 30% 20%, #ecfeff 0%, transparent 55%),
            radial-gradient(circle at 75% 75%, #d1fae5 0%, transparent 50%);
          border-radius: 24px; overflow: hidden;
        }
        .wo-cloud { position: absolute; background: #fff; opacity: .8; border-radius: 99px; }
        .wo-cl1 { width: 52px; height: 16px; top: 18px; left: 20px; animation: wo-drift 9s ease-in-out infinite alternate; }
        .wo-cl2 { width: 38px; height: 12px; top: 34px; right: 26px; animation: wo-drift 11s ease-in-out infinite alternate-reverse; }
        @keyframes wo-drift { from { transform: translateX(0) } to { transform: translateX(14px) } }

        .wo-blob { position: absolute; width: 86px; height: 92px; }
        .wo-abs-a { left: 16px; top: 66px; }
        .wo-abs-b { right: 16px; top: 66px; }
        .wo-bob { animation: wo-bob 2.4s ease-in-out infinite; }
        .wo-rev { animation-delay: 1.2s; }
        @keyframes wo-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        .wo-eye { transform-origin: center; animation: wo-blink 3.4s infinite; }
        @keyframes wo-blink { 0%,92%,100% { transform: scaleY(1) } 95% { transform: scaleY(.08) } }

        .wo-fly { position: absolute; top: 88px; }
        .wo-gift { width: 34px; height: 34px; left: 96px; opacity: 0; animation: wo-flyR 3s ease-in-out infinite; }
        .wo-heartfly { width: 30px; height: 30px; right: 96px; opacity: 0; animation: wo-flyL 3s ease-in-out infinite 1.5s; }
        @keyframes wo-flyR {
          0% { opacity: 0; transform: translateX(0) scale(.5) rotate(-8deg) }
          14% { opacity: 1; transform: translateX(4px) scale(1) }
          48% { opacity: 1; transform: translateX(112px) rotate(8deg) }
          62% { opacity: 0; transform: translateX(126px) scale(.5) }
          100% { opacity: 0 }
        }
        @keyframes wo-flyL {
          0% { opacity: 0; transform: translateX(0) scale(.5) rotate(8deg) }
          14% { opacity: 1; transform: translateX(-4px) scale(1) }
          48% { opacity: 1; transform: translateX(-112px) rotate(-8deg) }
          62% { opacity: 0; transform: translateX(-126px) scale(.5) }
          100% { opacity: 0 }
        }
        .wo-badge {
          position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
          background: #fff; border: 1.5px solid #10b981; color: #047857;
          font-size: 12px; font-weight: 800; border-radius: 99px; padding: 6px 14px;
          animation: wo-glow 3s ease-in-out infinite; white-space: nowrap;
        }
        @keyframes wo-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,.35) }
          50% { box-shadow: 0 0 0 9px rgba(16,185,129,0) }
        }

        /* Scene 2 tickets */
        .wo-ticket {
          position: absolute; left: 50%; width: 264px; transform: translateX(-50%);
          background: #fff; border-radius: 14px; padding: 10px 14px 10px 12px;
          display: flex; align-items: center; gap: 10px; text-align: left;
          box-shadow: 0 5px 14px rgba(15,23,42,.08); opacity: 0;
        }
        .wo-ticket::before, .wo-ticket::after {
          content: ""; position: absolute; width: 14px; height: 14px; border-radius: 50%;
          background: #f0fdfa; top: 50%; transform: translateY(-50%);
        }
        .wo-ticket::before { left: -7px; } .wo-ticket::after { right: -7px; }
        .wo-ticket-ic { flex-shrink: 0; }
        .wo-dash {
          border-left: 1.5px dashed #e2e8f0; align-self: stretch; padding-left: 10px;
          display: grid; place-items: center; font-size: 10px; font-weight: 800; color: #0891b2;
        }
        .wo-t1 { top: 8px; } .wo-t2 { top: 74px; } .wo-t3 { top: 140px; }
        .wo-active .wo-ticket { animation: wo-pop .55s cubic-bezier(.22,1.3,.4,1) forwards; }
        .wo-active .wo-t1 { animation-delay: .1s; }
        .wo-active .wo-t2 { animation-delay: .3s; }
        .wo-active .wo-t3 { animation-delay: .5s; }
        @keyframes wo-pop {
          from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(.92) }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1) }
        }

        /* Scene 3 shop */
        .wo-shopsvg { position: absolute; left: 50%; top: 30px; transform: translateX(-50%); width: 130px; }
        .wo-mini { position: absolute; width: 40px; height: 44px; opacity: 0; }
        .wo-m1 { left: 6%; top: 40px; animation: wo-hopR 3s ease-in infinite .2s; }
        .wo-m2 { left: 2%; top: 112px; animation: wo-hopR 3s ease-in infinite 1.2s; }
        .wo-m3 { right: 6%; top: 40px; animation: wo-hopL 3s ease-in infinite .7s; }
        .wo-m4 { right: 2%; top: 112px; animation: wo-hopL 3s ease-in infinite 1.7s; }
        @keyframes wo-hopR {
          0% { opacity: 0; transform: translate(0,0) } 12% { opacity: 1 }
          30% { transform: translate(28px,-12px) } 48% { transform: translate(56px,0) }
          66% { transform: translate(84px,-12px) }
          80% { opacity: 1; transform: translate(104px,-2px) scale(.9) }
          92% { opacity: 0; transform: translate(116px,-4px) scale(.4) } 100% { opacity: 0 }
        }
        @keyframes wo-hopL {
          0% { opacity: 0; transform: translate(0,0) } 12% { opacity: 1 }
          30% { transform: translate(-28px,-12px) } 48% { transform: translate(-56px,0) }
          66% { transform: translate(-84px,-12px) }
          80% { opacity: 1; transform: translate(-104px,-2px) scale(.9) }
          92% { opacity: 0; transform: translate(-116px,-4px) scale(.4) } 100% { opacity: 0 }
        }
        .wo-count {
          position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
          background: #fff; border: 1.5px solid #0891b2; border-radius: 99px;
          padding: 7px 16px; font-size: 12.5px; font-weight: 800; color: #0891b2;
          white-space: nowrap;
        }

        /* Scene 4 */
        .wo-tag {
          position: absolute; font-size: 10.5px; font-weight: 800;
          background: #fff; border-radius: 99px; padding: 3px 10px;
          box-shadow: 0 2px 6px rgba(15,23,42,.08); white-space: nowrap;
        }
        .wo-ta { left: 20px; top: 168px; color: #0891b2; }
        .wo-tb { right: 20px; top: 168px; color: #059669; }
        .wo-fx { position: absolute; width: 26px; opacity: 0; }
        .wo-f1 { left: 110px; top: 70px; animation: wo-fxR 2.6s ease-in-out infinite 0s; }
        .wo-f2 { left: 110px; top: 108px; animation: wo-fxR 2.6s ease-in-out infinite .9s; }
        .wo-f3 { right: 110px; top: 88px; animation: wo-fxL 2.6s ease-in-out infinite 1.4s; }
        @keyframes wo-fxR {
          0% { opacity: 0; transform: translateX(0) scale(.4) }
          16% { opacity: 1; transform: translateX(6px) scale(1) }
          54% { opacity: 1; transform: translateX(92px) translateY(-8px) }
          72% { opacity: 0; transform: translateX(106px) scale(.4) } 100% { opacity: 0 }
        }
        @keyframes wo-fxL {
          0% { opacity: 0; transform: translateX(0) scale(.4) }
          16% { opacity: 1; transform: translateX(-6px) scale(1) }
          54% { opacity: 1; transform: translateX(-92px) translateY(-8px) }
          72% { opacity: 0; transform: translateX(-106px) scale(.4) } 100% { opacity: 0 }
        }

        /* Scene 5 confetti */
        .wo-conf {
          position: absolute; top: -12px; width: 8px; height: 12px;
          border-radius: 2px; opacity: .9; animation-name: wo-fall;
          animation-timing-function: linear; animation-iteration-count: infinite;
        }
        @keyframes wo-fall {
          0% { transform: translateY(-10px) rotate(0) }
          100% { transform: translateY(220px) rotate(320deg) }
        }

        /* Typography & flow */
        .wo-h2 {
          font-size: 20px; font-weight: 900; line-height: 1.25; color: #0f172a;
          margin: 4px 4px 2px;
        }
        .wo-hl { background: linear-gradient(135deg,#0891b2,#10b981); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .wo-kao { font-size: 13.5px; font-weight: 700; color: #10b981; }
        .wo-duo { display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 330px; }
        .wo-line {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
          padding: 10px 13px; font-size: 12.5px; font-weight: 600; text-align: left;
          box-shadow: 0 3px 10px rgba(15,23,42,.05); color: #0f172a;
        }
        .wo-closing { font-size: 12.5px; color: #64748b; font-weight: 600; margin-top: 4px; }
        .wo-flow { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-top: 4px; }
        .wo-chip {
          background: #fff; border: 1px solid #e2e8f0; border-radius: 99px;
          padding: 9px 18px; font-size: 12.5px; font-weight: 700;
          box-shadow: 0 3px 10px rgba(15,23,42,.05); color: #0f172a;
        }
        .wo-arw {
          color: #10b981; font-weight: 800; font-size: 20px;
          animation: wo-nudge 1.6s ease-in-out infinite;
        }
        @keyframes wo-nudge { 0%,100% { transform: translateY(0) } 50% { transform: translateY(3px) } }
        .wo-simple { font-size: 13px; font-weight: 800; color: #0891b2; margin-top: 6px; }

        /* Per-page entrance replay */
        .wo-active .wo-h2 { animation: wo-in .4s ease-out both; }
        .wo-active .wo-duo, .wo-active .wo-flow, .wo-active .wo-line, .wo-active .wo-chip {
          animation: wo-in .5s ease-out both;
        }
        .wo-active .wo-kao, .wo-active .wo-closing, .wo-active .wo-simple {
          animation: wo-in .55s ease-out both;
        }
        @keyframes wo-in {
          from { opacity: 0; transform: translateY(8px) }
          to { opacity: 1; transform: translateY(0) }
        }

        @media (prefers-reduced-motion: reduce) {
          .wo-bob, .wo-eye, .wo-cloud, .wo-fly, .wo-mini, .wo-fx, .wo-conf, .wo-arw, .wo-badge {
            animation: none !important;
          }
          .wo-ticket { opacity: 1 !important; animation: none !important; }
          .wo-active .wo-h2, .wo-active .wo-duo, .wo-active .wo-flow,
          .wo-active .wo-line, .wo-active .wo-chip, .wo-active .wo-kao,
          .wo-active .wo-closing, .wo-active .wo-simple { animation: none !important; }
          .wo-fly, .wo-mini, .wo-fx { opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}
