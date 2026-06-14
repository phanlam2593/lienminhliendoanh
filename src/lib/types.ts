export type AppRole = "guest" | "member" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected";
export type BusinessType = "food" | "service" | "stay" | "travel" | "other";
export type BusinessStatus = "pending" | "approved" | "rejected";
export type OfferStatus = "active" | "inactive";
export type SuggestionStatus = "pending" | "approved" | "rejected";
export type ReportTarget = "business" | "offer";
export type NotifType =
  | "account_approved" | "account_rejected" | "new_offer" | "new_message"
  | "suggestion_approved" | "suggestion_rejected" | "report_received" | "broadcast";

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  food: "Ăn uống",
  service: "Dịch vụ",
  stay: "Lưu trú",
  travel: "Du lịch",
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
  cover_url: string | null;
  is_featured: boolean;
  status: BusinessStatus;
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
  created_at: string;
  updated_at: string;
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
  related_id: string | null;
  created_at: string;
}

export const USERNAME_DOMAIN = "lienminh.local";
export const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
