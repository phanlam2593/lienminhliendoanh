import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Business, OfferUsage, Review, SuggestedBusiness, User } from "./types";
import { seedBusinesses, seedReviews, seedUsages, seedUsers } from "./mockData";

interface CurrentSession {
  userId: string | null;
  isAdmin: boolean;
}

interface StoreState {
  businesses: Business[];
  users: User[];
  reviews: Review[];
  usages: OfferUsage[];
  suggestions: SuggestedBusiness[];
  session: CurrentSession;
}

interface StoreCtx extends StoreState {
  currentUser: User | null;
  registerUser: (u: Omit<User, "id" | "isVerified" | "status">) => User;
  loginAsUser: (id: string) => void;
  loginAdmin: () => void;
  logout: () => void;
  approveBusiness: (id: string) => void;
  rejectBusiness: (id: string) => void;
  addReview: (r: Omit<Review, "id" | "createdAt" | "userName">) => void;
  redeemOffer: (businessId: string) => OfferUsage;
  markUsageRedeemed: (id: string) => void;
  suggestBusiness: (s: Omit<SuggestedBusiness, "id" | "createdAt">) => void;
  createBusiness: (b: Omit<Business, "id" | "rating" | "reviewCount" | "usageCount" | "status">) => Business;
}

const Ctx = createContext<StoreCtx | null>(null);
const KEY = "lmld_state_v1";

function load(): StoreState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    businesses: seedBusinesses,
    users: seedUsers,
    reviews: seedReviews,
    usages: seedUsages,
    suggestions: [],
    session: { userId: null, isAdmin: false },
  };
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function makeBizCode(name: string) {
  const clean = name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(" ").filter(Boolean);
  const head = (clean[0] || "BIZ").slice(0, 2);
  const tail = (clean[1] || clean[0] || "XX").slice(0, 3);
  return (head + tail).padEnd(5, "X").slice(0, 5);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(() => load());

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const currentUser = state.session.userId
    ? state.users.find(u => u.id === state.session.userId) || null
    : null;

  const api: StoreCtx = {
    ...state,
    currentUser,
    registerUser: (u) => {
      const newUser: User = { ...u, id: uid("u"), isVerified: true, status: "approved" };
      setState(s => ({
        ...s,
        users: [newUser, ...s.users],
        session: { userId: newUser.id, isAdmin: false },
      }));
      return newUser;
    },
    loginAsUser: (id) => setState(s => ({ ...s, session: { userId: id, isAdmin: false } })),
    loginAdmin: () => setState(s => ({ ...s, session: { userId: null, isAdmin: true } })),
    logout: () => setState(s => ({ ...s, session: { userId: null, isAdmin: false } })),
    approveBusiness: (id) => setState(s => ({
      ...s,
      businesses: s.businesses.map(b => b.id === id ? { ...b, status: "approved" } : b),
    })),
    rejectBusiness: (id) => setState(s => ({
      ...s,
      businesses: s.businesses.map(b => b.id === id ? { ...b, status: "rejected" } : b),
    })),
    addReview: (r) => {
      const user = state.users.find(u => u.id === r.userId);
      const review: Review = {
        ...r,
        id: uid("r"),
        userName: user?.name || "Ẩn danh",
        createdAt: new Date().toISOString(),
      };
      setState(s => {
        const bizReviews = [...s.reviews, review].filter(x => x.businessId === r.businessId);
        const avg = bizReviews.reduce((a, x) => a + x.stars, 0) / bizReviews.length;
        return {
          ...s,
          reviews: [review, ...s.reviews],
          businesses: s.businesses.map(b => b.id === r.businessId
            ? { ...b, rating: Math.round(avg * 10) / 10, reviewCount: bizReviews.length }
            : b),
        };
      });
    },
    redeemOffer: (businessId) => {
      const biz = state.businesses.find(b => b.id === businessId)!;
      const existing = state.usages.filter(u => u.businessId === businessId).length;
      const user = currentUser;
      const usage: OfferUsage = {
        id: uid("o"),
        businessId,
        businessCode: biz.code,
        businessName: biz.name,
        userId: user?.id || "guest",
        userName: user?.name || "Khách",
        code: `${biz.code}-${String(existing + 1).padStart(6, "0")}`,
        createdAt: new Date().toISOString(),
        redeemed: false,
      };
      setState(s => ({
        ...s,
        usages: [usage, ...s.usages],
        businesses: s.businesses.map(b => b.id === businessId ? { ...b, usageCount: b.usageCount + 1 } : b),
      }));
      return usage;
    },
    markUsageRedeemed: (id) => setState(s => ({
      ...s,
      usages: s.usages.map(u => u.id === id ? { ...u, redeemed: true } : u),
    })),
    suggestBusiness: (sg) => setState(s => ({
      ...s,
      suggestions: [{ ...sg, id: uid("sg"), createdAt: new Date().toISOString() }, ...s.suggestions],
    })),
    createBusiness: (b) => {
      const code = makeBizCode(b.name);
      const business: Business = {
        ...b, id: uid("b"), code, rating: 0, reviewCount: 0, usageCount: 0, status: "pending",
      };
      setState(s => ({ ...s, businesses: [business, ...s.businesses] }));
      return business;
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}
