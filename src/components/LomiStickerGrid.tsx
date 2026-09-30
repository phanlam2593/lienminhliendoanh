import { LOMI_STICKERS, stickerUrl } from "@/lib/lomiStickers";

// Lưới chọn sticker Lomi — dùng chung cho Tin nhắn, Nhóm, Cộng đồng (qua GifPicker) và khung chat Lomi.
export function LomiStickerGrid({ onPick, className }: { onPick: (id: string) => void; className?: string }) {
  return (
    <div className={className ?? "grid grid-cols-5 gap-1 p-2 max-h-48 overflow-y-auto"}>
      {LOMI_STICKERS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onPick(s.id)}
          title={s.label}
          aria-label={s.label}
          className="aspect-square rounded-xl p-1 active:scale-90 transition hover:bg-muted"
        >
          <img src={stickerUrl(s.id)} alt={s.label} className="h-full w-full object-contain" loading="lazy" />
        </button>
      ))}
    </div>
  );
}
