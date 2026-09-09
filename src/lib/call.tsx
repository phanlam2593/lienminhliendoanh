import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, RotateCw, Volume2, Volume1 } from "lucide-react";
import { toast } from "sonner";

const STUN_ONLY: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

// Giai đoạn 2: lấy thêm TURN credentials (Cloudflare Realtime) trước mỗi cuộc gọi —
// cần thiết cho các cặp NAT "khó" (mạng di động, xuyên quốc gia) mà STUN một mình
// không vượt qua được. Nếu lấy TURN thất bại vì lý do gì đó, tự động lùi về chỉ dùng
// STUN (giống Giai đoạn 1 cũ) để cuộc gọi vẫn có cơ hội chạy thay vì treo cứng.
async function getIceServers(): Promise<RTCIceServer[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      console.error("[call] Không có access token, dùng STUN-only (không lấy TURN)");
      return STUN_ONLY;
    }
    const res = await fetch("https://ewquysvcjuqdkfieeuxd.supabase.co/functions/v1/get-turn-credentials", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error("[call] get-turn-credentials lỗi, dùng STUN-only. status=", res.status);
      return STUN_ONLY;
    }
    const data = await res.json();
    if (!Array.isArray(data.iceServers) || !data.iceServers.length) {
      console.error("[call] get-turn-credentials không có iceServers hợp lệ, dùng STUN-only:", data);
      return STUN_ONLY;
    }
    return data.iceServers;
  } catch (err) {
    console.error("[call] Lỗi khi lấy TURN credentials, dùng STUN-only:", err);
    return STUN_ONLY;
  }
}

const RING_TIMEOUT_MS = 30_000;

// setSinkId (chọn thiết bị xuất âm thanh) chỉ hỗ trợ ở 1 số trình duyệt (Chrome/Edge
// desktop+Android, Safari 18.4+ cả macOS/iOS; Firefox chưa hỗ trợ) — kiểm tra 1 lần,
// ẨN nút bật loa ngoài hoàn toàn nếu trình duyệt không hỗ trợ, thay vì hiện nút vô dụng.
const SPEAKER_TOGGLE_SUPPORTED =
  typeof window !== "undefined" && typeof (window as any).HTMLMediaElement?.prototype?.setSinkId === "function";

type CallPeerInfo = { id: string; full_name: string | null; avatar_url: string | null };

type CallState =
  | { status: "idle" }
  | { status: "calling"; callId: string; peer: CallPeerInfo; video: boolean }
  | {
      status: "incoming";
      callId: string;
      peer: CallPeerInfo;
      offerSdp?: RTCSessionDescriptionInit;
      viaLateDetection?: boolean;
      video: boolean;
    }
  | { status: "connected"; callId: string; peer: CallPeerInfo; startedAt: number; video: boolean };

interface CallCtxValue {
  state: CallState;
  startCall: (peer: CallPeerInfo, opts?: { asAnswerToCallId?: string; video?: boolean }) => void;
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
  const nav = useNavigate();
  const [state, setState] = useState<CallState>({ status: "idle" });
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const facingModeRef = useRef<"user" | "environment">("user");
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const stateRef = useRef<CallState>(state);
  const amICallerRef = useRef(false);
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
    remoteStreamRef.current = null;
    pendingIceRef.current = [];
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (SPEAKER_TOGGLE_SUPPORTED) {
      // Trả sinkId về "default" giữa các cuộc gọi — nếu không, cuộc gọi sau vẫn "dính"
      // thiết bị xuất âm mà cuộc gọi trước đã đổi sang (có thể đã rút/không còn phát).
      [remoteAudioRef.current, remoteVideoRef.current].forEach((el) => {
        if (el) void (el as any).setSinkId("default").catch(() => {});
      });
    }
    setMuted(false);
    setCameraOff(false);
    setSpeakerOn(false);
    facingModeRef.current = "user";
    closeOutboundChannel();
  };

  const outboundRef = useRef<{
    peerId: string;
    channel: ReturnType<typeof supabase.channel>;
    ready: boolean;
    closing: boolean;
    queue: { event: string; payload: Record<string, unknown> }[];
  } | null>(null);

  // Dùng LẠI 1 kênh duy nhất cho toàn bộ tín hiệu (offer/answer/ice) của 1 cuộc gọi,
  // thay vì tạo kênh mới cho mỗi tin nhắn — tránh bắn hàng loạt kênh trùng tên cùng
  // lúc khi ICE candidate dồn dập (đây là nguyên nhân candidate bị rớt trước đó).
  const sendSignal = (peerId: string, event: string, payload: Record<string, unknown>) => {
    let ob = outboundRef.current;
    if (!ob || ob.peerId !== peerId || ob.closing) {
      if (ob) supabase.removeChannel(ob.channel);
      const channel = supabase.channel(`call:${peerId}`);
      ob = { peerId, channel, ready: false, closing: false, queue: [] };
      outboundRef.current = ob;
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED" && outboundRef.current === ob) {
          ob!.ready = true;
          const pending = ob!.queue;
          ob!.queue = [];
          pending.forEach((m) => void channel.send({ type: "broadcast", event: m.event, payload: m.payload }));
        }
      });
    }
    if (ob.ready) {
      void ob.channel.send({ type: "broadcast", event, payload });
    } else {
      ob.queue.push({ event, payload });
    }
  };

  const closeOutboundChannel = () => {
    const ob = outboundRef.current;
    if (!ob) return;
    // Đánh dấu "đang đóng" ngay — để nếu ngay sau đó có cuộc gọi MỚI tới ĐÚNG người
    // này (VD kịch bản "đụng độ": vừa huỷ cuộc gọi cũ, lập tức kết nối lại với cùng
    // người đó), sendSignal biết phải tạo kênh hoàn toàn mới thay vì tưởng nhầm dùng
    // lại được kênh cũ sắp bị xoá — nếu không, kênh sẽ bị xoá giữa chừng trong lúc
    // cuộc gọi mới đang dùng nó, gây mất tín hiệu ICE khiến "kết nối được nhưng câm".
    // Trễ việc xoá thật + null hoá tham chiếu 1 nhịp để tín hiệu cuối (VD "reject")
    // kịp gửi đi trước khi dọn dẹp.
    ob.closing = true;
    setTimeout(() => {
      if (outboundRef.current === ob) outboundRef.current = null;
      supabase.removeChannel(ob.channel);
    }, 600);
  };

  // Ghi lại kết quả cuộc gọi vào bảng `calls` — dùng upsert theo callId nên bên nào
  // ghi trước cũng được, bên còn lại (nếu có ghi) sẽ merge đè lên đúng 1 dòng, không
  // tạo trùng. Nếu cuộc gọi đã kết nối thật (status "connected") thì luôn tính là
  // "answered" bất kể lý do kết thúc gọi hàm này là gì.
  const logCall = async (status: "answered" | "missed" | "declined" | "busy") => {
    const s = stateRef.current;
    if (s.status === "idle" || !user) return;
    const iAmCaller = amICallerRef.current;
    const callerId = iAmCaller ? user.id : s.peer.id;
    const calleeId = iAmCaller ? s.peer.id : user.id;
    const isConnected = s.status === "connected";
    const durationSeconds = isConnected ? Math.max(0, Math.floor((Date.now() - s.startedAt) / 1000)) : null;
    try {
      await supabase.from("calls").upsert(
        {
          id: s.callId,
          caller_id: callerId,
          callee_id: calleeId,
          status: isConnected ? "answered" : status,
          call_type: s.video ? "video" : "voice",
          answered_at: isConnected ? new Date(s.startedAt).toISOString() : null,
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        } as any,
        { onConflict: "id" },
      );
    } catch {
      /* không chặn luồng kết thúc cuộc gọi nếu ghi log lỗi */
    }
    // Báo thẳng cho khung chat (nếu đang mở với đúng người này) biết cuộc gọi vừa có
    // kết quả — để nó tự làm mới lại bong bóng cuộc gọi ngay lập tức, không phụ thuộc
    // Realtime của bảng "calls" (không chắc chắn/độ trễ khó lường) và không bắt phải
    // thoát ra vào lại mới thấy cập nhật.
    window.dispatchEvent(new CustomEvent("call:logged", { detail: { peerId: s.peer.id } }));
  };

  const endCall = (notifyPeer: boolean, reason?: string) => {
    const s = stateRef.current;
    if (notifyPeer && s.status !== "idle") {
      sendSignal(s.peer.id, "end", { callId: s.callId, reason: reason ?? "hangup" });
    }
    if (s.status !== "idle") {
      const status =
        s.status === "connected"
          ? "answered"
          : reason === "declined"
            ? "declined"
            : reason === "busy"
              ? "busy"
              : "missed";
      void logCall(status);
      // Kết thúc cuộc gọi (dù bằng cách nào) thì đưa thẳng vào khung chat với người đó
      // luôn — dù trước đó đang ở trang bất kỳ (VD Trang chủ) khi bắt/kết thúc cuộc gọi.
      nav(`/tin-nhan/${s.peer.id}`);
    }
    cleanupCall();
    setState({ status: "idle" });
  };

  const setupPeerConnection = (peerId: string, callId: string, iceServers: RTCIceServer[], video: boolean) => {
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(peerId, "ice", { callId, candidate: e.candidate.toJSON() });
    };

    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0];
      if (video) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
          void remoteVideoRef.current.play().catch(() => {});
        }
      } else if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0];
        void remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        toast.error(t("call.connectionFailed"));
        endCall(true, "failed");
      }
    };

    return pc;
  };

  // video=false: chỉ xin mic (gọi thoại, hành vi cũ). video=true: xin cả camera —
  // nếu bị từ chối/lỗi thì HUỶ CUỘC GỌI LUÔN, không âm thầm lùi về gọi thoại (để
  // người dùng biết rõ vì sao và có thể thử lại đúng ý mình).
  const getMedia = async (video: boolean): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video ? { facingMode: facingModeRef.current } : false,
      });
      localStreamRef.current = stream;
      return stream;
    } catch {
      toast.error(video ? t("call.cameraDenied") : t("call.micDenied"));
      return null;
    }
  };

  const startCall = async (peer: CallPeerInfo, opts?: { asAnswerToCallId?: string; video?: boolean }) => {
    if (!user || !profile) return;
    if (stateRef.current.status !== "idle") {
      toast.error(t("call.alreadyInCall"));
      return;
    }
    // "Trả lời" qua đường trễ (opts.asAnswerToCallId): dùng LẠI đúng callId gốc thay vì
    // tạo cuộc gọi mới — giữ đúng chiều "ai gọi ai" trong DB (không bị đảo ngược), và
    // tránh tạo ra 1 dòng "ringing" mồ côi không bao giờ được cập nhật.
    const isAnswering = !!opts?.asAnswerToCallId;
    const isVideo = !!opts?.video;
    const callId = opts?.asAnswerToCallId ?? crypto.randomUUID();
    const stream = await getMedia(isVideo);
    if (!stream) return;

    amICallerRef.current = !isAnswering;
    setState({ status: "calling", callId, peer, video: isVideo });
    ringtone.start("ringback");

    const iceServers = await getIceServers();
    const pc = setupPeerConnection(peer.id, callId, iceServers, isVideo);
    stream.getTracks().forEach((tr) => pc.addTrack(tr, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignal(peer.id, "offer", {
      callId,
      sdp: offer,
      video: isVideo,
      from: { id: user.id, full_name: profile.full_name, avatar_url: profile.avatar_url },
    });

    if (!isAnswering) {
      // Ghi lại "đang đổ chuông" vào DB (không chỉ tín hiệu tức thời qua broadcast) — để
      // nếu người nhận đang tắt app, họ vẫn biết qua push + tự phát hiện lại khi mở app
      // lên. Chỉ ghi khi đây thực sự là cuộc gọi MỚI — nếu là trả lời qua đường trễ thì
      // dòng "ringing" đã được ghi từ lúc người gọi bắt đầu rồi, không ghi lại nữa.
      void supabase
        .from("calls")
        .insert({
          id: callId,
          caller_id: user.id,
          callee_id: peer.id,
          status: "ringing",
          call_type: isVideo ? "video" : "voice",
        } as any)
        .then(({ error }) => {
          if (error) console.error("[call] LỖI insert ringing:", error.message, error);
        });
    }

    ringTimeoutRef.current = setTimeout(() => {
      if (stateRef.current.status === "calling") {
        toast(t("call.noAnswer"));
        endCall(true, "timeout");
      }
    }, RING_TIMEOUT_MS);
  };

  const connectAsCallee = async (
    callId: string,
    peer: CallPeerInfo,
    offerSdp: RTCSessionDescriptionInit,
    video: boolean,
  ) => {
    clearRingTimeout();
    ringtone.stop();

    const stream = await getMedia(video);
    if (!stream) {
      endCall(true, video ? "no-camera" : "no-mic");
      return;
    }

    const iceServers = await getIceServers();
    const pc = setupPeerConnection(peer.id, callId, iceServers, video);
    stream.getTracks().forEach((tr) => pc.addTrack(tr, stream));

    await pc.setRemoteDescription(offerSdp);
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
    sendSignal(peer.id, "answer", { callId, sdp: answer });

    const startedAt = Date.now();
    setState({ status: "connected", callId, peer, startedAt, video });
    durationTimerRef.current = setInterval(() => forceTick((n) => n + 1), 1000);
  };

  const acceptCall = async () => {
    const s = stateRef.current;
    if (s.status !== "incoming") return;
    nav(`/tin-nhan/${s.peer.id}`);

    if (s.viaLateDetection) {
      // Phát hiện qua đường trễ (mở app sau khi chuông đã reo, không bắt được offer
      // sống qua kênh realtime) — "Nghe" ở đây nghĩa là gọi ngược lại cho người đó ngay,
      // nhưng dùng LẠI đúng callId gốc (giữ đúng chiều "ai gọi ai" trong DB). Nếu họ vẫn
      // đang mở app chờ (trạng thái "calling"), nhánh xử lý "đụng độ" trong offer handler
      // bên dưới sẽ tự nhận ra và nối 2 bên lại làm 1 — không cần SDP cũ.
      const peer = s.peer;
      const originalCallId = s.callId;
      const isVideo = s.video;
      cleanupCall();
      stateRef.current = { status: "idle" };
      setState({ status: "idle" });
      await startCall(peer, { asAnswerToCallId: originalCallId, video: isVideo });
      return;
    }

    if (!s.offerSdp) return;
    await connectAsCallee(s.callId, s.peer, s.offerSdp, s.video);
  };

  const declineCall = () => {
    const s = stateRef.current;
    if (s.status !== "incoming") return;
    sendSignal(s.peer.id, "reject", { callId: s.callId });
    void logCall("declined");
    nav(`/tin-nhan/${s.peer.id}`);
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

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraOff;
    stream.getVideoTracks().forEach((tr) => (tr.enabled = !next));
    setCameraOff(next);
  };

  // Đổi camera trước/sau: xin lại getUserMedia với facingMode ngược lại rồi
  // replaceTrack ngay trên sender hiện có — tránh phải tái đàm phán SDP (renegotiation)
  // giữa chừng cuộc gọi, vốn có thể làm rớt kết nối đang chạy.
  const switchCamera = async () => {
    const stream = localStreamRef.current;
    const pc = pcRef.current;
    const oldTrack = stream?.getVideoTracks()[0];
    if (!stream || !pc || !oldTrack) return;
    const nextFacingMode = facingModeRef.current === "user" ? "environment" : "user";
    // Dừng camera CŨ trước khi xin camera MỚI — đa số máy (đặc biệt Android) chỉ cho 1
    // MediaStream giữ camera cùng lúc; xin stream mới khi cái cũ còn "sống" sẽ lỗi
    // (NotReadableError/OverconstrainedError), bị hứng nhầm vào catch chung và hiện
    // sai thành "cần quyền camera" dù quyền đã cấp từ trước (case Kir báo r27).
    oldTrack.stop();
    stream.removeTrack(oldTrack);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: nextFacingMode },
      });
      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) return;
      facingModeRef.current = nextFacingMode;
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newTrack);
      stream.addTrack(newTrack);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        void localVideoRef.current.play().catch(() => {});
      }
    } catch {
      toast.error(t("call.cameraDenied"));
    }
  };

  // Bật/tắt loa ngoài: tìm thiết bị audiooutput có label khớp "speaker" (loa ngoài) so
  // với thiết bị mặc định/tai nghe (earpiece/receiver) qua enumerateDevices(), rồi
  // setSinkId lên CẢ audio+video ref (chỉ 1 trong 2 đang thật sự phát tuỳ voice/video
  // call). Không tìm thấy thiết bị "speaker" riêng (VD trên desktop, hoặc label không rõ)
  // thì lùi về deviceId "default" — vẫn đổi state UI để nút không đứng im, dù việc đổi
  // thiết bị thật có thể không có tác dụng rõ rệt trên máy đó.
  const toggleSpeaker = async () => {
    if (!SPEAKER_TOGGLE_SUPPORTED) return;
    const next = !speakerOn;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices.filter((d) => d.kind === "audiooutput");
      const speakerDev = outputs.find((d) => /speaker/i.test(d.label));
      const earpieceDev = outputs.find((d) => /earpiece|receiver/i.test(d.label));
      const sinkId = next ? (speakerDev?.deviceId ?? "default") : (earpieceDev?.deviceId ?? "default");
      const targets = [remoteAudioRef.current, remoteVideoRef.current].filter((el): el is HTMLMediaElement => !!el);
      await Promise.all(targets.map((el) => (el as any).setSinkId(sinkId)));
      setSpeakerOn(next);
    } catch {
      toast.error(t("call.speakerUnsupported"));
    }
  };

  // --- Nghe tín hiệu trên kênh riêng của mình ---
  useEffect(() => {
    if (!canReceiveCalls || !user) return;
    const ch = supabase.channel(`call:${user.id}`);

    ch.on("broadcast", { event: "offer" }, ({ payload }) => {
      const { callId, sdp, from, video } = payload as {
        callId: string;
        sdp: RTCSessionDescriptionInit;
        from: CallPeerInfo;
        video?: boolean;
      };
      const isVideo = !!video;
      const cur = stateRef.current;

      // "Đụng độ": mình đang gọi ĐÚNG người này, mà họ cũng đang gọi lại mình cùng lúc
      // (thường do họ không thấy chuông đổ nên tự bấm gọi lại, hoặc đang "Nghe" 1 cuộc
      // gọi phát hiện qua đường trễ). Thay vì báo "bận" vô lý, coi như họ vừa bắt máy:
      // huỷ lượt gọi đi của mình và kết nối thẳng bằng offer mới của họ.
      if (cur.status === "calling" && cur.peer.id === from.id) {
        cleanupCall();
        // KHÔNG đổi amICallerRef ở đây nữa — nếu callId khớp với cuộc gọi mình đang chủ
        // động gọi đi (tức đối phương đang "trả lời" qua đường trễ bằng đúng callId gốc),
        // mình vẫn đúng là người gọi ban đầu, giữ nguyên vai trò để chiều "ai gọi ai"
        // trong DB/nhật ký cuộc gọi không bị đảo ngược.
        // Cập nhật callId NGAY (không đợi connectAsCallee xử lý xong) — nếu không, các
        // ICE candidate của đối phương đến trong lúc đang thương lượng (xin quyền mic,
        // lấy TURN...) sẽ bị handler "ice" âm thầm bỏ qua vì so sánh với callId CŨ, gây
        // đúng hiện tượng "kết nối được nhưng câm".
        stateRef.current = { status: "calling", callId, peer: from, video: isVideo };
        setState({ status: "calling", callId, peer: from, video: isVideo });
        void connectAsCallee(callId, from, sdp, isVideo);
        return;
      }

      if (cur.status !== "idle") {
        sendSignal(from.id, "busy", { callId });
        return;
      }
      pendingIceRef.current = [];
      amICallerRef.current = false;
      setState({ status: "incoming", callId, peer: from, offerSdp: sdp, video: isVideo });
      ringtone.start("ring");
      ringTimeoutRef.current = setTimeout(() => {
        if (stateRef.current.status === "incoming") {
          sendSignal(from.id, "reject", { callId, reason: "timeout" });
          void logCall("missed");
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
      setState({ status: "connected", callId, peer: s.peer, startedAt, video: s.video });
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
        endCall(false, "declined");
      }
    });

    ch.on("broadcast", { event: "busy" }, ({ payload }) => {
      const { callId } = payload as { callId: string };
      const s = stateRef.current;
      if (s.status === "calling" && s.callId === callId) {
        toast(t("call.busy"));
        endCall(false, "busy");
      }
    });

    ch.on("broadcast", { event: "end" }, ({ payload }) => {
      const { callId } = payload as { callId: string };
      const s = stateRef.current;
      if (s.status !== "idle" && s.callId === callId) {
        toast(t("call.ended"));
        void logCall(s.status === "connected" ? "answered" : "missed");
        cleanupCall();
        setState({ status: "idle" });
      }
    });

    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [canReceiveCalls, user?.id]);

  // --- Phát hiện cuộc gọi qua đường trễ: mở app lên (từ thông báo hoặc mở icon bình
  // thường) trong lúc có người đang gọi mà lỡ không bắt được offer sống qua kênh
  // realtime (do app đang đóng lúc họ gọi). Kiểm tra 1 lần khi vừa có quyền nhận cuộc
  // gọi — nếu có, tự nhảy thẳng vào màn hình Nghe/Từ chối, không cần vào lịch sử rồi
  // gọi lại thủ công.
  useEffect(() => {
    if (!canReceiveCalls || !user) return;

    const checkPendingRinging = async () => {
      if (stateRef.current.status !== "idle") return;
      const cutoffIso = new Date(Date.now() - RING_TIMEOUT_MS).toISOString();
      const { data, error } = await supabase
        .from("calls")
        .select("id, caller_id, created_at, call_type")
        .eq("callee_id", user.id)
        .eq("status", "ringing")
        .gt("created_at", cutoffIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("[call] LỖI kiểm tra cuộc gọi đang đổ chuông:", error.message);
        return;
      }
      if (!data || stateRef.current.status !== "idle") return;

      const { data: callerProfile } = await supabase
        .from("profiles_public")
        .select("id, full_name, avatar_url")
        .eq("id", data.caller_id)
        .maybeSingle();
      const peer: CallPeerInfo = callerProfile
        ? { id: callerProfile.id, full_name: callerProfile.full_name, avatar_url: callerProfile.avatar_url }
        : { id: data.caller_id, full_name: null, avatar_url: null };

      amICallerRef.current = false;
      setState({
        status: "incoming",
        callId: data.id,
        peer,
        viaLateDetection: true,
        video: (data as any).call_type === "video",
      });
      ringtone.start("ring");
      const remainingMs = Math.max(3000, RING_TIMEOUT_MS - (Date.now() - new Date(data.created_at).getTime()));
      ringTimeoutRef.current = setTimeout(() => {
        if (stateRef.current.status === "incoming") {
          void logCall("missed");
          cleanupCall();
          setState({ status: "idle" });
        }
      }, remainingMs);
    };

    void checkPendingRinging();

    // Kiểm tra lại mỗi khi tab/app quay lại trạng thái hiển thị (VD: người dùng vừa
    // minimize/chuyển app khác rồi quay lại) — không chỉ lúc component vừa mount, vì
    // component có thể vẫn đang tồn tại (không unmount) suốt lúc app bị ẩn đi, nên hiệu
    // ứng mount-only trước đây sẽ không tự chạy lại.
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkPendingRinging();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReceiveCalls, user?.id]);

  useEffect(() => () => cleanupCall(), []);

  // Gắn lại stream vào thẻ <video> mỗi khi state đổi — đảm bảo chắc chắn dù thẻ
  // <video> chỉ được mount SAU khi stream đã có sẵn (thứ tự mount/ontrack không cố
  // định), thay vì chỉ gán 1 lần lúc getMedia()/ontrack chạy.
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      void localVideoRef.current.play().catch(() => {});
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      void remoteVideoRef.current.play().catch(() => {});
    }
  }, [state]);

  const elapsed = state.status === "connected" ? Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000)) : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const isVideoMode = (state.status === "calling" || state.status === "connected") && state.video;

  return (
    <CallCtx.Provider value={{ state, startCall }}>
      {children}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      {state.status !== "idle" && (
        <div
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-6 ${
            isVideoMode ? "bg-black overflow-hidden" : "bg-background/98 backdrop-blur-sm"
          }`}
        >
          {isVideoMode ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover bg-black"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`absolute top-4 right-4 w-28 h-40 rounded-xl object-cover border-2 border-white/30 shadow-lg bg-black/60 z-10 ${
                  cameraOff ? "hidden" : ""
                }`}
              />
              <div className="absolute top-6 left-0 right-0 text-center text-white z-10 px-6">
                <div className="text-lg font-bold drop-shadow">{state.peer.full_name || "…"}</div>
                <div className="text-sm opacity-90 drop-shadow mt-1">
                  {state.status === "calling" && t("call.calling")}
                  {state.status === "connected" && `${mm}:${ss}`}
                </div>
              </div>
            </>
          ) : (
            <>
              <Avatar path={state.peer.avatar_url} name={state.peer.full_name} size={96} />
              <div className="text-center">
                <div className="text-xl font-bold">{state.peer.full_name || "…"}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {state.status === "calling" && t("call.calling")}
                  {state.status === "incoming" && (state.video ? t("call.incomingVideo") : t("call.incoming"))}
                  {state.status === "connected" && `${mm}:${ss}`}
                </div>
              </div>
            </>
          )}

          {state.status === "incoming" ? (
            <div className={`flex items-center gap-10 mt-4 ${isVideoMode ? "z-10" : ""}`}>
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
            <div className={`flex items-center gap-6 mt-4 ${isVideoMode ? "absolute bottom-10 z-10" : ""}`}>
              {state.status === "connected" && (
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full grid place-items-center shadow active:scale-95 ${
                    muted
                      ? "bg-accent text-foreground"
                      : isVideoMode
                        ? "bg-white/20 text-white backdrop-blur"
                        : "bg-card border text-foreground"
                  }`}
                  aria-label={muted ? t("call.unmute") : t("call.mute")}
                >
                  {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
              )}
              {state.status === "connected" && SPEAKER_TOGGLE_SUPPORTED && (
                <button
                  onClick={toggleSpeaker}
                  className={`w-14 h-14 rounded-full grid place-items-center shadow active:scale-95 ${
                    speakerOn
                      ? "bg-accent text-foreground"
                      : isVideoMode
                        ? "bg-white/20 text-white backdrop-blur"
                        : "bg-card border text-foreground"
                  }`}
                  aria-label={speakerOn ? t("call.speakerOff") : t("call.speakerOn")}
                >
                  {speakerOn ? <Volume2 className="w-6 h-6" /> : <Volume1 className="w-6 h-6" />}
                </button>
              )}
              {isVideoMode && (
                <button
                  onClick={toggleCamera}
                  className={`w-14 h-14 rounded-full grid place-items-center shadow active:scale-95 ${
                    cameraOff ? "bg-accent text-foreground" : "bg-white/20 text-white backdrop-blur"
                  }`}
                  aria-label={cameraOff ? t("call.cameraOn") : t("call.cameraOff")}
                >
                  {cameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
              )}
              <button
                onClick={() => endCall(true)}
                className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground grid place-items-center shadow-lg active:scale-95"
                aria-label={t("call.hangup")}
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              {isVideoMode && (
                <button
                  onClick={switchCamera}
                  className="w-14 h-14 rounded-full grid place-items-center shadow active:scale-95 bg-white/20 text-white backdrop-blur"
                  aria-label={t("call.switchCamera")}
                >
                  <RotateCw className="w-6 h-6" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </CallCtx.Provider>
  );
}
