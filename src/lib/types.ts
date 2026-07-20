export type AppRole = "guest" | "member" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected";
// DO NOT CHANGE: 8 fixed business types, finalized by product owner
export type BusinessType = "food" | "service" | "stay" | "travel" | "creator" | "freelance" | "broker" | "other";
export type BusinessStatus = "pending" | "approved" | "rejected";
export type OfferStatus = "active" | "inactive";
export type ReportTarget = "business" | "offer";
export type ReportStatus = "pending" | "replied" | "resolved" | "closed";
export type NotifType =
  | "account_approved"
  | "account_rejected"
  | "business_approved"
  | "business_rejected"
  | "business_pinned"
  | "new_follower"
  | "new_deal"
  | "deal_claimed"
  | "new_message"
  | "business_reply"
  | "admin_message"
  | "report_submitted"
  | "report_resolved"
  | "suggestion_approved"
  | "suggestion_rejected"
  | "new_offer"
  | "report_received"
  | "broadcast"
  | "report_reply"
  | "badge_earned"
  | "level_up"
  | "pending_approval"
  | "mention";

export interface Badge {
  id: string;
  business_id: string;
  badge_type: string;
  earned_at: string;
}

export const BADGE_TIERS: { type: string; threshold: number; label: string; emoji: string; color: string }[] = [
  {
    type: "active_member",
    threshold: 100,
    label: "Thành viên tích cực",
    emoji: "🌟",
    color: "from-amber-300 to-yellow-500",
  },
  {
    type: "community_supporter",
    threshold: 500,
    label: "Người ủng hộ cộng đồng",
    emoji: "💪",
    color: "from-sky-400 to-blue-600",
  },
  {
    type: "trusted_partner",
    threshold: 1000,
    label: "Đối tác tin cậy",
    emoji: "🤝",
    color: "from-emerald-400 to-teal-600",
  },
  {
    type: "growth_leader",
    threshold: 2500,
    label: "Người dẫn đầu phát triển",
    emoji: "🚀",
    color: "from-fuchsia-400 to-purple-600",
  },
  {
    type: "community_legend",
    threshold: 5000,
    label: "Huyền thoại cộng đồng",
    emoji: "👑",
    color: "from-rose-400 to-red-600",
  },
];

// Thang bậc DUY NHẤT cho thành viên (đã gộp Lv + badge cũ thành 1 hệ, 2026).
// Điểm: +1 claim ưu đãi, +1 khi DN của bạn được claim, +1 mỗi bên khi hoàn thành Trao đổi.
export const MEMBER_BADGE_TIERS: { type: string; threshold: number; label: string; emoji: string }[] = [
  { type: "bronze", threshold: 100, label: "Đồng", emoji: "🥉" },
  { type: "silver", threshold: 500, label: "Bạc", emoji: "🥈" },
  { type: "gold", threshold: 1000, label: "Vàng", emoji: "🥇" },
  { type: "platinum", threshold: 2000, label: "Bạch kim", emoji: "💠" },
  { type: "diamond", threshold: 5000, label: "Kim cương", emoji: "💎" },
  { type: "legend", threshold: 10000, label: "Huyền thoại", emoji: "👑" },
];

export function getTopMemberBadge(points: number) {
  let top: (typeof MEMBER_BADGE_TIERS)[number] | null = null;
  for (const t of MEMBER_BADGE_TIERS) if (points >= t.threshold) top = t;
  return top;
}

// Trả về bậc hiện tại, bậc kế tiếp, và % tiến độ giữa 2 mốc — dùng cho thanh progress bar.
export function getMemberTierProgress(points: number) {
  const current = getTopMemberBadge(points);
  const currentIdx = current ? MEMBER_BADGE_TIERS.findIndex((t) => t.type === current.type) : -1;
  const next = MEMBER_BADGE_TIERS[currentIdx + 1] ?? null;
  const base = current?.threshold ?? 0;
  const target = next?.threshold ?? base;
  const pct = next ? Math.min(100, Math.max(0, Math.round(((points - base) / (target - base)) * 100))) : 100;
  return { current, next, pct };
}

// ── Membership — ĐÃ BẬT (Giai đoạn A: miễn phí 3 tháng cho 1000 người đầu, xem
// trigger grant_launch_membership() trong DB). Giai đoạn B (thu phí thật, cần cổng
// thanh toán) sẽ làm sau khi có pháp nhân — CHƯA đụng tới phần đó.
export const MEMBERSHIP_ENABLED = true;
export const MEMBERSHIP_BASE_PRICE = 100000;

export function getMembershipDiscountPct(points: number): number {
  if (points >= 10000) return 30;
  if (points >= 5000) return 25;
  if (points >= 2000) return 20;
  if (points >= 1000) return 15;
  if (points >= 500) return 10;
  if (points >= 100) return 5;
  return 0;
}

export function getMembershipPrice(points: number): number {
  const discount = getMembershipDiscountPct(points);
  return Math.round(MEMBERSHIP_BASE_PRICE * (1 - discount / 100));
}
export type NotifTargetType = "business" | "user" | "message" | "deal" | "report" | "suggestion" | "system";

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  food: "Ăn uống",
  service: "Dịch vụ",
  stay: "Lưu trú",
  travel: "Du lịch",
  creator: "Sáng tạo nội dung",
  freelance: "Nghề tự do",
  broker: "Môi giới",
  other: "Khác",
};
export const BUSINESS_TYPES = Object.keys(BUSINESS_TYPE_LABEL) as BusinessType[];

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  status: AccountStatus;
  status_message: string | null;
  points: number;
  admin_note: string | null;
  member_number: number | null;
  has_seen_welcome: boolean;
  is_member: boolean;
  membership_started_at: string | null;
  membership_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  owner_id: string | null;
  name: string;
  type: BusinessType;
  description: string | null;
  hours_open: string | null;
  hours_close: string | null;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  facebook_url: string | null;
  website_url: string | null;
  tiktok_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  cover_url: string | null;
  is_featured: boolean;
  status: BusinessStatus;
  points: number;
  level: number;
  created_at: string;
  updated_at: string;
}

export type ExchangeStatus =
  | "pending"
  | "accepted"
  | "requester_done"
  | "receiver_done"
  | "completed"
  | "rejected"
  | "expired";

export interface Exchange {
  id: string;
  requester_id: string;
  receiver_id: string;
  request_type: string;
  request_description: string;
  return_description: string;
  status: ExchangeStatus;
  requester_completed_at: string | null;
  receiver_completed_at: string | null;
  completed_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  code: string | null;
  status: OfferStatus;
  claim_count: number;
  created_at: string;
  updated_at: string;
}

export interface OfferClaim {
  id: string;
  offer_id: string;
  user_id: string;
  code: string;
  seq: number | null;
  expires_at: string;
  claimed_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  business_id: string;
  rating: number;
  comment: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  target_type: ReportTarget;
  target_id: string;
  description: string;
  photo_url: string | null;
  send_to_admin: boolean;
  send_to_business: boolean;
  resolved: boolean;
  status: ReportStatus;
  created_at: string;
}

export interface ReportReply {
  id: string;
  report_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface ReviewReply {
  id: string;
  review_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: "text" | "image" | "sticker" | "broadcast" | "gif";
  image_url: string | null;
  is_read: boolean;
  created_at: string;
  edited_at: string | null;
  reply_to_id: string | null;
  read_at: string | null;
}

export type NotifCategory =
  | "messages"
  | "follows"
  | "deals_received"
  | "deals_new"
  | "pending_approval"
  | "featured"
  | "account_updates"
  | "reports"
  | "suggestions"
  | "achievements";

export interface Notification {
  id: string;
  user_id: string;
  type: NotifType;
  category: NotifCategory | null;
  title: string;
  body: string | null;
  is_read: boolean;
  target_id: string | null;
  target_type: NotifTargetType | null;
  count: number;
  created_at: string;
}

export const USERNAME_DOMAIN = "lienminh.local";
export const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
