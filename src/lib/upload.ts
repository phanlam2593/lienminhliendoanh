import { supabase } from "@/integrations/supabase/client";

export const MAX_SIZE = 5 * 1024 * 1024;
export const ACCEPT = "image/jpeg,image/png,image/webp";

export function validateImage(file: File): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "Chỉ chấp nhận JPG, PNG, WEBP";
  if (file.size > MAX_SIZE) return "Ảnh tối đa 5MB";
  return null;
}

export async function uploadImage(file: File, folder = "general", ownerId?: string): Promise<string> {
  const err = validateImage(file);
  if (err) throw new Error(err);
  let uid = ownerId;
  if (!uid) {
    const { data } = await supabase.auth.getUser();
    uid = data.user?.id;
  }
  if (!uid) throw new Error("Cần đăng nhập để tải ảnh lên");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${uid}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, {
    contentType: file.type, upsert: false,
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
