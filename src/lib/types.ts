export type BizCategory = "an_uong" | "dich_vu" | "luu_tru" | "du_lich" | "khac";
export type BizStatus = "pending" | "approved" | "rejected";

export const CATEGORY_LABEL: Record<BizCategory, string> = {
  an_uong: "Ăn uống",
  dich_vu: "Dịch vụ",
  luu_tru: "Lưu trú",
  du_lich: "Du lịch",
  khac: "Khác",
};

export const CATEGORIES = Object.keys(CATEGORY_LABEL) as BizCategory[];

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Business {
  id: string;
  owner_id: string | null;
  name: string;
  category: BizCategory;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  facebook: string | null;
  zalo: string | null;
  image_url: string | null;
  status: BizStatus;
  created_at: string;
}

export interface Offer {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  content: string | null;
  created_at: string;
}

export interface Suggestion {
  id: string;
  suggested_by: string | null;
  name: string;
  category: BizCategory;
  description: string | null;
  contact_info: string | null;
  image_url: string | null;
  status: BizStatus;
  created_at: string;
}
