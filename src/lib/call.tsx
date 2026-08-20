import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// Voice call 1-1 — Giai đoạn 1 (chỉ STUN miễn phí, chưa có TURN).
// Kiến trúc: mỗi người "báo danh" nghe trên kênh Supabase Realtime riêng của
// mình (call:{userId}), giống hệt cơ chế online-users đã có. Người gọi tạo
// RTCPeerConnection, gửi "offer" tới kênh của người nhận; 2 bên trao đổi
// answer/ice qua broadcast — không ghi gì vào DB (tín hiệu chỉ tồn tại tức
// thời, không cần lưu). Vì chỉ dùng STUN công khai (miễn phí), một số trường
// hợp mạng NAT khó (~15-25%, hay gặp ở 4G/wifi công cộng VN) sẽ không kết nối
// được — báo lỗi rõ ràng thay vì treo màn hình, sẽ nâng cấp thêm TURN sau khi
// có traffic thật.
// ============================================================================

const ICE_SERVERS: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

const RING_TIMEOUT_MS = 30_000;

type CallPeerInfo = { id: string; full_name: string | null; avatar_url: string | null };

type CallState =
  | { status: "idle" }
  | { status: "calling"; callId: string; peer: CallPeerInfo }
  | { status: "incoming"; callId: string; peer: CallPeerInfo; offerSdp: RTCSessionDescriptionInit }
  | { status: "connected"; callId: string; peer: CallPeerInfo; startedAt: number };

interface CallCtxValue {
  state: CallState;
  startCall: (peer: CallPeerInfo) => void;
}

const CallCtx = createContext<CallCtxValue>({ state: { status: "idle" }, startCall: () => {} });

export function useCall() {
  return useContext(CallCtx);
}

// --- Chuông báo bằng Web Audio API (không cần file âm thanh, không tốn upload) ---
function useRingtone() {
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unlockedRef = useRef(false);

  useEffect(() => {
    // Trình duyệt chặn AudioContext tự phát nếu chưa có tương tác người dùng.
    // Mở khoá 1 lần khi người dùng chạm/bấm bất cứ đâu trong app.
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) ctxRef.current = new AC();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const beep = (freq: number, durationMs: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  };

  const start = (pattern: "ring" | "ringback") => {
    stop();
    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) ctxRef.current = new AC();
    }
    const play = () => {
      if (pattern === "ring") {
        beep(880, 350);
        setTimeout(() => beep(880, 350), 450);
      } else {
        beep(440, 900);
      }
    };
    play();
    intervalRef.current = setInterval(play, pattern === "ring" ? 2000 : 1600);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => stop, []);

  return { start, stop };
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user, profile, isApproved, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [state, setState] = useState<CallState>({ status: "idle" });
  const [muted, setMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const stateRef = useRef<CallState>(state);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, forceTick] = useState(0);
  const ringtone = useRingtone();

  stateRef.current = state;

  const canReceiveCalls = !!user && (isApproved || isAdmin);

  const clearRingTimeout = () => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  };

  const cleanupCall = () => {
    clearRingTimeout();
    ringtone.stop();
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    localStreamRef.current = null;
    pendingIceRef.current = [];
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setMuted(false);
  };

  const sendSignal = (peerId: string, event: string, payload: Record<string, unknown>) => {
    const ch = supabase.channel(`call:${peerId}`);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void ch.send({ type: "broadcast", event, payload }).finally(() => {
          setTimeout(() => supabase.removeChannel(ch), 800);
        });
      }
    });
  };

  const endCall = (notifyPeer: boolean, reason?: string) => {
    const s = stateRef.current;
    if (notifyPeer && s.status !== "idle") {
      sendSignal(s.peer.id, "end", { callId: s.callId, reason: reason ?? "hangup" });
    }
    cleanupCall();
    setState({ status: "idle" });
  };

  const setupPeerConnection = (peerId: string, callId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(peerId, "ice", { callId, candidate: e.candidate.toJSON() });
    };

    pc.ontrack = (e) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0];
        void remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[call] iceConnectionState:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        toast.error(t("call.connectionFailed"));
        endCall(true, "failed");
      }
    };
    pc.onconnectionstatechange = () => {
      console.log("[call] connectionState:", pc.connectionState);
    };
    pc.onicegatheringstatechange = () => {
      console.log("[call] iceGatheringState:", pc.iceGatheringState);
    };

    return pc;
  };

  const getMic = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      return stream;
    } catch {
      toast.error(t("call.micDenied"));
      return null;
    }
  };

  const startCall = async (peer: CallPeerInfo) => {
    if (!user || !profile) return;
    if (stateRef.current.status !== "idle") {
      toast.error(t("call.alreadyInCall"));
      return;
    }
    const callId = crypto.randomUUID();
    const stream = await getMic();
    if (!stream) return;

    setState({ status: "calling", callId, peer });
    ringtone.start("ringback");

    const pc = setupPeerConnection(peer.id, callId);
    stream.getTracks().forEach((tr) => pc.addTrack(tr, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignal(peer.id, "offer", {
      callId,
      sdp: offer,
      from: { id: user.id, full_name: profile.full_name, avatar_url: profile.avatar_url },
    });

    ringTimeoutRef.current = setTimeout(() => {
      if (stateRef.current.status === "calling") {
        toast(t("call.noAnswer"));
        endCall(true, "timeout");
      }
    }, RING_TIMEOUT_MS);
  };

  const acceptCall = async () => {
    const s = stateRef.current;
    if (s.status !== "incoming") return;
    clearRingTimeout();
    ringtone.stop();

    const stream = await getMic();
    if (!stream) {
      endCall(true, "no-mic");
      return;
    }

    const pc = setupPeerConnection(s.peer.id, s.callId);
    stream.getTracks().forEach((tr) => pc.addTrack(tr, stream));

    await pc.setRemoteDescription(s.offerSdp);
    for (const c of pendingIceRef.current) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* ignore stale candidate */
      }
    }
    pendingIceRef.current = [];

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal(s.peer.id, "answer", { callId: s.callId, sdp: answer });

    const startedAt = Date.now();
    setState({ status: "connected", callId: s.callId, peer: s.peer, startedAt });
    durationTimerRef.current = setInterval(() => forceTick((n) => n + 1), 1000);
  };

  const declineCall = () => {
    const s = stateRef.current;
    if (s.status !== "incoming") return;
    sendSignal(s.peer.id, "reject", { callId: s.callId });
    cleanupCall();
    setState({ status: "idle" });
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((tr) => (tr.enabled = !next));
    setMuted(next);
  };

  // --- Nghe tín hiệu trên kênh riêng của mình ---
  useEffect(() => {
    if (!canReceiveCalls || !user) return;
    const ch = supabase.channel(`call:${user.id}`);

    ch.on("broadcast", { event: "offer" }, ({ payload }) => {
      const { callId, sdp, from } = payload as {
        callId: string;
        sdp: RTCSessionDescriptionInit;
        from: CallPeerInfo;
      };
      if (stateRef.current.status !== "idle") {
        sendSignal(from.id, "busy", { callId });
        return;
      }
      pendingIceRef.current = [];
      setState({ status: "incoming", callId, peer: from, offerSdp: sdp });
      ringtone.start("ring");
      ringTimeoutRef.current = setTimeout(() => {
        if (stateRef.current.status === "incoming") {
          sendSignal(from.id, "reject", { callId, reason: "timeout" });
          cleanupCall();
          setState({ status: "idle" });
        }
      }, RING_TIMEOUT_MS);
    });

    ch.on("broadcast", { event: "answer" }, async ({ payload }) => {
      const { callId, sdp } = payload as { callId: string; sdp: RTCSessionDescriptionInit };
      const s = stateRef.current;
      if (s.status !== "calling" || s.callId !== callId || !pcRef.current) return;
      clearRingTimeout();
      ringtone.stop();
      await pcRef.current.setRemoteDescription(sdp);
      for (const c of pendingIceRef.current) {
        try {
          await pcRef.current.addIceCandidate(c);
        } catch {
          /* ignore */
        }
      }
      pendingIceRef.current = [];
      const startedAt = Date.now();
      setState({ status: "connected", callId, peer: s.peer, startedAt });
      durationTimerRef.current = setInterval(() => forceTick((n) => n + 1), 1000);
    });

    ch.on("broadcast", { event: "ice" }, async ({ payload }) => {
      const { callId, candidate } = payload as { callId: string; candidate: RTCIceCandidateInit };
      const s = stateRef.current;
      if (s.status === "idle" || s.callId !== callId) return;
      if (pcRef.current?.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(candidate);
        } catch {
          /* ignore */
        }
      } else {
        pendingIceRef.current.push(candidate);
      }
    });

    ch.on("broadcast", { event: "reject" }, ({ payload }) => {
      const { callId } = payload as { callId: string };
      const s = stateRef.current;
      if (s.status === "calling" && s.callId === callId) {
        toast(t("call.declined"));
        endCall(false);
      }
    });

    ch.on("broadcast", { event: "busy" }, ({ payload }) => {
      const { callId } = payload as { callId: string };
      const s = stateRef.current;
      if (s.status === "calling" && s.callId === callId) {
        toast(t("call.busy"));
        endCall(false);
      }
    });

    ch.on("broadcast", { event: "end" }, ({ payload }) => {
      const { callId } = payload as { callId: string };
      const s = stateRef.current;
      if (s.status !== "idle" && s.callId === callId) {
        toast(t("call.ended"));
        cleanupCall();
        setState({ status: "idle" });
      }
    });

    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [canReceiveCalls, user?.id]);

  useEffect(() => () => cleanupCall(), []);

  const elapsed = state.status === "connected" ? Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000)) : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <CallCtx.Provider value={{ state, startCall }}>
      {children}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      {state.status !== "idle" && (
        <div className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-sm flex flex-col items-center justify-center gap-6 px-6">
          <Avatar path={state.peer.avatar_url} name={state.peer.full_name} size={96} />
          <div className="text-center">
            <div className="text-xl font-bold">{state.peer.full_name || "…"}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {state.status === "calling" && t("call.calling")}
              {state.status === "incoming" && t("call.incoming")}
              {state.status === "connected" && `${mm}:${ss}`}
            </div>
          </div>

          {state.status === "incoming" ? (
            <div className="flex items-center gap-10 mt-4">
              <button
                onClick={declineCall}
                className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground grid place-items-center shadow-lg active:scale-95"
                aria-label={t("call.decline")}
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              <button
                onClick={acceptCall}
                className="w-16 h-16 rounded-full bg-emerald-500 text-white grid place-items-center shadow-lg active:scale-95"
                aria-label={t("call.accept")}
              >
                <Phone className="w-7 h-7" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-6 mt-4">
              {state.status === "connected" && (
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full grid place-items-center shadow active:scale-95 ${
                    muted ? "bg-accent text-foreground" : "bg-card border text-foreground"
                  }`}
                  aria-label={muted ? t("call.unmute") : t("call.mute")}
                >
                  {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
              )}
              <button
                onClick={() => endCall(true)}
                className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground grid place-items-center shadow-lg active:scale-95"
                aria-label={t("call.hangup")}
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </div>
          )}
        </div>
      )}
    </CallCtx.Provider>
  );
}
