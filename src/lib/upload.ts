import { supabase } from "@/integrations/supabase/client";

export const MAX_SIZE = 5 * 1024 * 1024;
export const ACCEPT = "image/jpeg,image/png,image/webp";

export function validateImage(file: File): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Chỉ chấp nhận JPG, PNG, WEBP";
  if (file.size > MAX_SIZE) return "Ảnh tối đa 5MB";
  return null;
}

// QUAN TRỌNG (hiệu năng + chi phí ở quy mô lớn): ảnh chụp thẳng từ điện thoại thường
// 3-8MB, tải thẳng lên vừa tốn dung lượng lưu trữ Supabase, vừa tốn băng thông mỗi lần
// người khác xem lại (kể cả avatar 40x40 cũng load nguyên file gốc). Resize + nén lại
// trước khi upload — giảm 80-95% dung lượng trung bình mà mắt thường khó nhận ra khác biệt.
async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  // Ảnh đã nhỏ sẵn (vd sticker, ảnh đã nén từ trước) thì bỏ qua, khỏi tốn công xử lý.
  if (file.size < 300 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    // Nếu vì lý do gì đó bản nén lại to hơn bản gốc (ảnh đã tối ưu sẵn) thì giữ nguyên bản gốc.
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    // Trình duyệt không hỗ trợ createImageBitmap/canvas (hiếm) → tải bản gốc, không chặn người dùng.
    return file;
  }
}

export async function uploadImage(file: File, folder = "general", ownerId?: string): Promise<string> {
  const err = validateImage(file);
  if (err) throw new Error(err);
  const compressed = await compressImage(file);
  let uid = ownerId;
  if (!uid) {
    const { data } = await supabase.auth.getUser();
    uid = data.user?.id;
  }
  if (!uid) throw new Error("Cần đăng nhập để tải ảnh lên");
  const ext = compressed.name.split(".").pop() || "jpg";
  const path = `${uid}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("uploads").upload(path, compressed, {
    contentType: compressed.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

const cache = new Map<string, string>();

export async function getSignedUrl(path: string): Promise<string> {
  if (!path) return "";
  if (cache.has(path)) return cache.get(path)!;
  const { data, error } = await supabase.storage.from("uploads").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error || !data) return "";
  cache.set(path, data.signedUrl);
  return data.signedUrl;
}
