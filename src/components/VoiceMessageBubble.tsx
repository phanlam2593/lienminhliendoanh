import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { getSignedUrl } from "@/lib/upload";
import { formatDuration } from "@/hooks/useVoiceRecorder";

// Bong bóng tin nhắn thoại: nút play/pause + thời lượng. Thời lượng lấy từ content
// (số giây lúc gửi) nên không cần tải file audio trước khi hiển thị.
export function VoiceMessageBubble({
  path,
  seconds,
  mine = false,
  label,
}: {
  path: string | null;
  seconds: number;
  mine?: boolean;
  label: string;
}) {
  const [url, setUrl] = useState("");
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    if (!path) return;
    getSignedUrl(path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [path]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-2xl min-w-[130px] ${
        mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"
      }`}
    >
      <button
        onClick={toggle}
        disabled={!url}
        aria-label={label}
        className={`w-8 h-8 rounded-full grid place-items-center shrink-0 disabled:opacity-50 ${
          mine ? "bg-primary-foreground/20" : "bg-primary text-primary-foreground"
        }`}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className="flex items-end gap-[2px] h-4 flex-1">
        {[6, 10, 14, 8, 12, 16, 9, 13, 7, 11].map((h, i) => (
          <span
            key={i}
            style={{ height: `${h}px` }}
            className={`w-[3px] rounded-full ${mine ? "bg-primary-foreground/50" : "bg-primary/40"}`}
          />
        ))}
      </div>
      <span className="text-[11px] font-medium shrink-0 tabular-nums">{formatDuration(seconds)}</span>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  );
}
