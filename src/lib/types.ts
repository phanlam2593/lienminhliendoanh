export type BusinessType = "cafe" | "nhahang" | "spa" | "homestay" | "salon" | "khac";

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  cafe: "Cafe",
  nhahang: "Nhà hàng",
  spa: "Spa",
  homestay: "Homestay",
  salon: "Tiệm tóc",
  khac: "Dịch vụ khác",
};

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  isVerified: boolean;
  hasBusiness: boolean;
  businessId?: string;
  status: "pending" | "approved" | "rejected";
}

export interface Business {
  id: string;
  code: string; // CFMAY
  name: string;
  type: BusinessType;
  city: string;
  address: string;
  description: string;
  offer: string;
  rating: number;
  reviewCount: number;
  cover: string;
  logo: string;
  phone: string;
  distanceKm?: number;
  status: "pending" | "approved" | "rejected";
  ownerId?: string;
  usageCount: number;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  businessId: string;
  stars: number;
  content: string;
  images?: string[];
  createdAt: string;
}

export interface OfferUsage {
  id: string;
  businessId: string;
  businessCode: string;
  businessName: string;
  userId: string;
  userName: string;
  code: string;
  createdAt: string;
  redeemed: boolean;
}

export interface SuggestedBusiness {
  id: string;
  name: string;
  type: BusinessType;
  address: string;
  phone: string;
  facebook?: string;
  createdAt: string;
}
