import { supabase } from "@/integrations/supabase/client";

const KEY = "lmld_admin_creds";

export function getAdminCreds(): { username: string; password: string } | null {
  try { return JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { return null; }
}

export function setAdminCreds(c: { username: string; password: string }) {
  sessionStorage.setItem(KEY, JSON.stringify(c));
}

export function clearAdmin() {
  sessionStorage.removeItem(KEY);
}

export function isAdmin() {
  return !!getAdminCreds();
}

export async function adminCall<T = any>(action: string, payload?: any): Promise<T> {
  const creds = getAdminCreds();
  if (!creds) throw new Error("Chưa đăng nhập admin");
  const { data, error } = await supabase.functions.invoke("admin-action", {
    body: { ...creds, action, payload },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function adminLogin(username: string, password: string) {
  const { data, error } = await supabase.functions.invoke("admin-action", {
    body: { username, password, action: "login" },
  });
  if (error || data?.error) throw new Error(data?.error || error?.message || "Đăng nhập thất bại");
  setAdminCreds({ username, password });
}
