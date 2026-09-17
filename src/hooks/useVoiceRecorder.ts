import { useCallback, useEffect, useRef, useState } from "react";

// Ghi âm tin nhắn thoại bằng MediaRecorder. Ưu tiên webm/opus (Chrome/Android),
// fallback audio/mp4 cho Safari/iOS. Trả về Blob + thời lượng (giây) khi dừng.
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const m of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {}
  }
  return undefined;
}

export interface VoiceRecorder {
  recording: boolean;
  paused: boolean;
  seconds: number;
  start: () => Promise<boolean>;
  stop: () => Promise<{ blob: Blob; seconds: number; mimeType: string } | null>;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
}

export function useVoiceRecorder(onPermissionError?: () => void): VoiceRecorder {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const pausedAtRef = useRef(0);
  const cancelledRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopTimer();
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setPaused(false);
    setSeconds(0);
  }, [stopTimer]);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    if (recorderRef.current) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start(250);
      recorderRef.current = rec;
      streamRef.current = stream;
      startedAtRef.current = Date.now();
      setSeconds(0);
      setPaused(false);
      setRecording(true);
      timerRef.current = setInterval(() => {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
      return true;
    } catch (e) {
      console.error("[voice] getUserMedia lỗi:", e);
      cleanup();
      onPermissionError?.();
      return false;
    }
  }, [cleanup, onPermissionError]);

  const stop = useCallback(async () => {
    const rec = recorderRef.current;
    if (!rec) return null;
    const elapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    const mimeType = rec.mimeType || "audio/webm";
    const blob = await new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: mimeType }));
      try {
        rec.stop();
      } catch {
        resolve(new Blob(chunksRef.current, { type: mimeType }));
      }
    });
    const wasCancelled = cancelledRef.current;
    cleanup();
    if (wasCancelled || blob.size === 0) return null;
    return { blob, seconds: elapsed, mimeType };
  }, [cleanup]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const rec = recorderRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {}
    }
    cleanup();
  }, [cleanup]);

  const pause = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== "recording") return;
    try {
      rec.pause();
    } catch {
      return;
    }
    pausedAtRef.current = Date.now();
    stopTimer();
    setPaused(true);
  }, [stopTimer]);

  const resume = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== "paused") return;
    try {
      rec.resume();
    } catch {
      return;
    }
    // Đẩy mốc bắt đầu tới để (now - startedAt) vẫn khớp số giây đã đếm trước khi tạm dừng.
    startedAtRef.current += Date.now() - pausedAtRef.current;
    setPaused(false);
    timerRef.current = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
  }, []);

  return { recording, paused, seconds, start, stop, cancel, pause, resume };
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
