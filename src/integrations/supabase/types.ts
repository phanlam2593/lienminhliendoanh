export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          badge_type: string
          business_id: string
          earned_at: string
          id: string
        }
        Insert: {
          badge_type: string
          business_id: string
          earned_at?: string
          id?: string
        }
        Update: {
          badge_type?: string
          business_id?: string
          earned_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          facebook_url: string | null
          hours_close: string | null
          hours_open: string | null
          id: string
          instagram_url: string | null
          is_featured: boolean
          level: number
          name: string
          owner_id: string | null
          phone: string | null
          points: number
          status: Database["public"]["Enums"]["business_status"]
          tiktok_url: string | null
          type: Database["public"]["Enums"]["business_type"]
          updated_at: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          facebook_url?: string | null
          hours_close?: string | null
          hours_open?: string | null
          id?: string
          instagram_url?: string | null
          is_featured?: boolean
          level?: number
          name: string
          owner_id?: string | null
          phone?: string | null
          points?: number
          status?: Database["public"]["Enums"]["business_status"]
          tiktok_url?: string | null
          type?: Database["public"]["Enums"]["business_type"]
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          facebook_url?: string | null
          hours_close?: string | null
          hours_open?: string | null
          id?: string
          instagram_url?: string | null
          is_featured?: boolean
          level?: number
          name?: string
          owner_id?: string | null
          phone?: string | null
          points?: number
          status?: Database["public"]["Enums"]["business_status"]
          tiktok_url?: string | null
          type?: Database["public"]["Enums"]["business_type"]
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      exchanges: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          receiver_completed_at: string | null
          receiver_id: string
          request_description: string
          request_type: string
          requester_completed_at: string | null
          requester_id: string
          return_description: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          receiver_completed_at?: string | null
          receiver_id: string
          request_description: string
          request_type: string
          requester_completed_at?: string | null
          requester_id: string
          return_description: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          receiver_completed_at?: string | null
          receiver_id?: string
          request_description?: string
          request_type?: string
          requester_completed_at?: string | null
          requester_id?: string
          return_description?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchanges_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchanges_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_business_id: string | null
          followee_user_id: string | null
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followee_business_id?: string | null
          followee_user_id?: string | null
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followee_business_id?: string | null
          followee_user_id?: string | null
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_business_id_fkey"
            columns: ["followee_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          target_id: string | null
          target_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          target_id?: string | null
          target_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          target_id?: string | null
          target_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_claims: {
        Row: {
          claimed_at: string
          code: string
          expires_at: string
          id: string
          offer_id: string
          seq: number | null
          user_id: string
        }
        Insert: {
          claimed_at?: string
          code: string
          expires_at?: string
          id?: string
          offer_id: string
          seq?: number | null
          user_id: string
        }
        Update: {
          claimed_at?: string
          code?: string
          expires_at?: string
          id?: string
          offer_id?: string
          seq?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_claims_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          business_id: string
          claim_count: number
          code: string | null
          created_at: string
          description: string | null
          id: string
          status: Database["public"]["Enums"]["offer_status"]
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          claim_count?: number
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["offer_status"]
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          claim_count?: number
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["offer_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_note: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          notification_prefs: Json
          password_hint: string | null
          phone: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          username: string
        }
        Insert: {
          admin_note?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          notification_prefs?: Json
          password_hint?: string | null
          phone: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          username: string
        }
        Update: {
          admin_note?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notification_prefs?: Json
          password_hint?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      report_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          report_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          report_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_replies_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          description: string
          id: string
          photo_url: string | null
          resolved: boolean
          send_to_admin: boolean
          send_to_business: boolean
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          photo_url?: string | null
          resolved?: boolean
          send_to_admin?: boolean
          send_to_business?: boolean
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          photo_url?: string | null
          resolved?: boolean
          send_to_admin?: boolean
          send_to_business?: boolean
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
          user_id?: string
        }
        Relationships: []
      }
      review_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          business_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          business_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          business_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          address: string | null
          business_name: string
          business_type: Database["public"]["Enums"]["business_type"]
          contact_info: string
          created_at: string
          description: string | null
          id: string
          status: Database["public"]["Enums"]["suggestion_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          business_name: string
          business_type?: Database["public"]["Enums"]["business_type"]
          contact_info: string
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          business_name?: string
          business_type?: Database["public"]["Enums"]["business_type"]
          contact_info?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      broadcast_offer: { Args: { _offer_id: string }; Returns: number }
      can_access_report: {
        Args: { _report_id: string; _user_id: string }
        Returns: boolean
      }
      claim_offer: {
        Args: { _offer_id: string }
        Returns: {
          claimed_at: string
          code: string
          expires_at: string
          id: string
          offer_id: string
          seq: number | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "offer_claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_stale_exchanges: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_member: { Args: { _user_id: string }; Returns: boolean }
      is_field_taken: {
        Args: { _field: string; _value: string }
        Returns: boolean
      }
      notif_pref_allowed: {
        Args: { _key: string; _user_id: string }
        Returns: boolean
      }
      unaccent_safe: { Args: { _t: string }; Returns: string }
    }
    Enums: {
      account_status: "pending" | "approved" | "rejected"
      app_role: "guest" | "member" | "admin"
      biz_category: "an_uong" | "dich_vu" | "luu_tru" | "du_lich" | "khac"
      biz_status: "pending" | "approved" | "rejected"
      business_status: "pending" | "approved" | "rejected"
      business_type:
        | "food"
        | "service"
        | "stay"
        | "travel"
        | "other"
        | "freelancer"
        | "photographer"
        | "graphic_designer"
        | "tiktok"
        | "youtube"
        | "streamer"
        | "influencer"
        | "content_creator"
      offer_status: "active" | "inactive"
      report_status: "pending" | "replied" | "resolved" | "closed"
      report_target: "business" | "offer"
      suggestion_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["pending", "approved", "rejected"],
      app_role: ["guest", "member", "admin"],
      biz_category: ["an_uong", "dich_vu", "luu_tru", "du_lich", "khac"],
      biz_status: ["pending", "approved", "rejected"],
      business_status: ["pending", "approved", "rejected"],
      business_type: [
        "food",
        "service",
        "stay",
        "travel",
        "other",
        "freelancer",
        "photographer",
        "graphic_designer",
        "tiktok",
        "youtube",
        "streamer",
        "influencer",
        "content_creator",
      ],
      offer_status: ["active", "inactive"],
      report_status: ["pending", "replied", "resolved", "closed"],
      report_target: ["business", "offer"],
      suggestion_status: ["pending", "approved", "rejected"],
    },
  },
} as const
