// 30 sticker PNG đặt trong public/stickers/ (tiger_01.png → tiger_30.png)
export const STICKERS = Array.from({ length: 30 }, (_, i) => `s${String(i + 1).padStart(2, "0")}.png`);

// Tin nhắn sticker cũ lưu emoji (trước khi có PNG) — nhận diện để render đúng cả 2 loại
export const isStickerFile = (content: string) => /^s\d{2}\.png$/.test(content);
