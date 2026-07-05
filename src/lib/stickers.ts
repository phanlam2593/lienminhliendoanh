export const STICKER_PACKS = [
  {
    id: "tiger",
    label: "🐯 Hổ",
    files: Array.from({ length: 30 }, (_, i) => `tiger_${String(i + 1).padStart(2, "0")}.png`),
  },
  {
    id: "chicken",
    label: "🐔 Gà",
    files: Array.from({ length: 30 }, (_, i) => `chicken_${String(i + 1).padStart(2, "0")}.png`),
  },
];

// Nhận diện sticker PNG (khớp cả tiger_XX.png và chicken_XX.png) vs sticker emoji cũ
export const isStickerFile = (content: string) => /^\w+_\d{2}\.png$/.test(content);
