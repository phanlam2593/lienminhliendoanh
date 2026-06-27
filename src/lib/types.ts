export type AppRole = "guest" | "member" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected";
export type BusinessType = "food" | "service" | "stay" | "travel" | "creator" | "freelance" | "broker" | "other";
export type BusinessStatus = "pending" | "approved" | "rejected";
export type OfferStatus = "active" | "inactive";
export type SuggestionStatus = "pending" | "approved" | "rejected";
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
  | "report_reply";
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
  admin_note: string | null;
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
  created_at: string;
}

export interface Suggestion {
  id: string;
  user_id: string;
  business_name: string;
  business_type: BusinessType;
  contact_info: string;
  description: string | null;
  status: SuggestionStatus;
  created_at: string;
  updated_at: string;
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
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotifType;
  title: string;
  body: string | null;
  is_read: boolean;
  target_id: string | null;
  target_type: NotifTargetType | null;
  created_at: string;
}

export const USERNAME_DOMAIN = "lienminh.local";
export const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
