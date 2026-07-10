import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Profile, AppRole } from "./types";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole;
  isAdmin: boolean;
  isApproved: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

const VISIT_LOGGED_KEY = "lmld_visit_logged_uid";

// Ghi 1 dòng nhật ký mỗi lần MỞ APP (không phải mỗi lần chuyển trang) — dùng sessionStorage
// để chỉ ghi 1 lần cho mỗi phiên mở tab/app, tránh spam bảng login_events.
const logVisit = async (uid: string) => {
  try {
    if (sessionStorage.getItem(VISIT_LOGGED_KEY) === uid) return;
    sessionStorage.setItem(VISIT_LOGGED_KEY, uid);
    await supabase.from("login_events").insert({ user_id: uid });
  } catch {
    // Im lặng bỏ qua — ghi log truy cập không được phép làm hỏng trải nghiệm đăng nhập
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole>("guest");
  const [loading, setLoading] = useState(true);

  const load = async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, username, full_name, avatar_url, status, status_message, points, level, created_at, updated_at, notification_prefs, email, phone, admin_note, member_number, has_seen_welcome, is_member, membership_started_at, membership_expires_at",
        )
        .eq("id", uid)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((p as Profile) ?? null);
    const roles = (r ?? []).map((x: any) => x.role as AppRole);
    setRole(roles.includes("admin") ? "admin" : roles.includes("member") ? "member" : "guest");
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => load(s.user.id), 0);
        void logVisit(s.user.id);
      } else {
        setProfile(null);
        setRole("guest");
      }
    });
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await load(s.user.id);
        void logVisit(s.user.id);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        profile,
        role,
        isAdmin: role === "admin",
        isApproved: profile?.status === "approved" || role === "admin",
        loading,
        refresh: async () => {
          if (user) await load(user.id);
        },
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
