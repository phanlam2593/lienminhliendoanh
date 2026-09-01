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
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      business_photos: {
        Row: {
          business_id: string | null
          caption: string | null
          created_at: string | null
          id: string
          sort_order: number | null
          url: string
        }
        Insert: {
          business_id?: string | null
          caption?: string | null
          created_at?: string | null
          id?: string
          sort_order?: number | null
          url: string
        }
        Update: {
          business_id?: string | null
          caption?: string | null
          created_at?: string | null
          id?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_photos_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_card_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_photos_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_photos_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_explore_view"
            referencedColumns: ["id"]
          },
        ]
      }
      business_pins: {
        Row: {
          business_id: string
          pin: string
          updated_at: string
        }
        Insert: {
          business_id: string
          pin: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          pin?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_pins_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "business_card_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_pins_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_pins_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_explore_view"
            referencedColumns: ["id"]
          },
        ]
      }
      business_regulars: {
        Row: {
          business_id: string
          created_at: string
          last_visit_at: string | null
          marked_by: string | null
          member_id: string
          visit_count: number
        }
        Insert: {
          business_id: string
          created_at?: string
          last_visit_at?: string | null
          marked_by?: string | null
          member_id: string
          visit_count?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          last_visit_at?: string | null
          marked_by?: string | null
          member_id?: string
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_regulars_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_card_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_regulars_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_regulars_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_explore_view"
            referencedColumns: ["id"]
          },
        ]
      }
      business_view_daily: {
        Row: {
          business_id: string
          view_count: number
          view_date: string
        }
        Insert: {
          business_id: string
          view_count?: number
          view_date?: string
        }
        Update: {
          business_id?: string
          view_count?: number
          view_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_view_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_card_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "business_view_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_view_daily_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_explore_view"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          admin_note: string | null
          area: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          facebook_url: string | null
          hours_close: string | null
          hours_open: string | null
          id: string
          instagram_url: string | null
          is_featured: boolean
          is_online: boolean
          latitude: number | null
          level: number
          longitude: number | null
          name: string
          name_unaccent: string | null
          owner_id: string | null
          phone: string | null
          points: number
          status: Database["public"]["Enums"]["business_status"]
          tiktok_url: string | null
          total_claims: number
          type: Database["public"]["Enums"]["business_type"]
          updated_at: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          address?: string | null
          admin_note?: string | null
          area?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          facebook_url?: string | null
          hours_close?: string | null
          hours_open?: string | null
          id?: string
          instagram_url?: string | null
          is_featured?: boolean
          is_online?: boolean
          latitude?: number | null
          level?: number
          longitude?: number | null
          name: string
          name_unaccent?: string | null
          owner_id?: string | null
          phone?: string | null
          points?: number
          status?: Database["public"]["Enums"]["business_status"]
          tiktok_url?: string | null
          total_claims?: number
          type?: Database["public"]["Enums"]["business_type"]
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          address?: string | null
          admin_note?: string | null
          area?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          facebook_url?: string | null
          hours_close?: string | null
          hours_open?: string | null
          id?: string
          instagram_url?: string | null
          is_featured?: boolean
          is_online?: boolean
          latitude?: number | null
          level?: number
          longitude?: number | null
          name?: string
          name_unaccent?: string | null
          owner_id?: string | null
          phone?: string | null
          points?: number
          status?: Database["public"]["Enums"]["business_status"]
          tiktok_url?: string | null
          total_claims?: number
          type?: Database["public"]["Enums"]["business_type"]
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      calls: {
        Row: {
          answered_at: string | null
          callee_id: string
          caller_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string
          status: string
        }
        Insert: {
          answered_at?: string | null
          callee_id: string
          caller_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id: string
          started_at?: string
          status: string
        }
        Update: {
          answered_at?: string | null
          callee_id?: string
          caller_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_callee_id_fkey"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "member_last_login"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "calls_callee_id_fkey"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_callee_id_fkey"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "member_last_login"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "calls_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          id: string
          image_url: string | null
          is_pinned: boolean
          location: string | null
          reply_to_id: string | null
          topic: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          location?: string | null
          reply_to_id?: string | null
          topic?: string
          type?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          location?: string | null
          reply_to_id?: string | null
          topic?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "business_card_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "exchanges_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchanges_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "businesses_explore_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchanges_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "business_card_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "exchanges_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchanges_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "businesses_explore_view"
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
            referencedRelation: "business_card_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "follows_followee_business_id_fkey"
            columns: ["followee_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_followee_business_id_fkey"
            columns: ["followee_business_id"]
            isOneToOne: false
            referencedRelation: "businesses_explore_view"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "member_last_login"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "member_last_login"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      login_events: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_last_login"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "login_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "login_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      member_badges: {
        Row: {
          badge_type: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_type: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_type?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_last_login"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "member_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          id: string
          image_url: string | null
          is_read: boolean
          read_at: string | null
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          read_at?: string | null
          receiver_id: string
          reply_to_id?: string | null
          sender_id: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean
          read_at?: string | null
          receiver_id?: string
          reply_to_id?: string | null
          sender_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string | null
          count: number
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
          category?: string | null
          count?: number
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
          category?: string | null
          count?: number
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
            referencedRelation: "business_card_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_explore_view"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_attempts: {
        Row: {
          attempted_at: string
          business_id: string
          id: string
          success: boolean
          user_id: string
        }
        Insert: {
          attempted_at?: string
          business_id: string
          id?: string
          success: boolean
          user_id: string
        }
        Update: {
          attempted_at?: string
          business_id?: string
          id?: string
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_note: string | null
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          email: string
          full_name: string
          full_name_unaccent: string | null
          has_seen_welcome: boolean
          id: string
          is_member: boolean
          level: number
          member_number: number | null
          membership_expires_at: string | null
          membership_started_at: string | null
          notification_prefs: Json
          password_hint: string | null
          phone: string
          points: number
          status: Database["public"]["Enums"]["account_status"]
          status_message: string | null
          updated_at: string
          username: string
        }
        Insert: {
          admin_note?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          email: string
          full_name: string
          full_name_unaccent?: string | null
          has_seen_welcome?: boolean
          id: string
          is_member?: boolean
          level?: number
          member_number?: number | null
          membership_expires_at?: string | null
          membership_started_at?: string | null
          notification_prefs?: Json
          password_hint?: string | null
          phone: string
          points?: number
          status?: Database["public"]["Enums"]["account_status"]
          status_message?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          admin_note?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          full_name_unaccent?: string | null
          has_seen_welcome?: boolean
          id?: string
          is_member?: boolean
          level?: number
          member_number?: number | null
          membership_expires_at?: string | null
          membership_started_at?: string | null
          notification_prefs?: Json
          password_hint?: string | null
          phone?: string
          points?: number
          status?: Database["public"]["Enums"]["account_status"]
          status_message?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_last_login"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      questline_progress: {
        Row: {
          completed_at: string
          quest_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          quest_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          quest_id?: string
          user_id?: string
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
          description_unaccent: string | null
          id: string
          owner_confirmed_resolved: boolean
          photo_url: string | null
          reporter_satisfied: boolean | null
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
          description_unaccent?: string | null
          id?: string
          owner_confirmed_resolved?: boolean
          photo_url?: string | null
          reporter_satisfied?: boolean | null
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
          description_unaccent?: string | null
          id?: string
          owner_confirmed_resolved?: boolean
          photo_url?: string | null
          reporter_satisfied?: boolean | null
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
          image_url: string | null
          rating: number
          user_id: string
        }
        Insert: {
          business_id: string
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          rating: number
          user_id: string
        }
        Update: {
          business_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_card_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_explore_view"
            referencedColumns: ["id"]
          },
        ]
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
      wall_post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wall_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "wall_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_last_login"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wall_post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      wall_post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wall_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "wall_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_last_login"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wall_post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      wall_posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          type: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          type?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wall_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "member_last_login"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "wall_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wall_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      business_card_stats: {
        Row: {
          business_id: string | null
          latest_offer: string | null
          latest_offer_claims: number | null
          latest_review_author: string | null
          latest_review_comment: string | null
          latest_review_rating: number | null
          offer_count: number | null
          rating: number | null
          review_count: number | null
          total_claims: number | null
        }
        Relationships: []
      }
      business_customer_visits: {
        Row: {
          business_id: string | null
          last_visit_at: string | null
          user_id: string | null
          visit_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_card_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_explore_view"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses_explore_view: {
        Row: {
          address: string | null
          admin_note: string | null
          area: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          facebook_url: string | null
          hours_close: string | null
          hours_open: string | null
          id: string | null
          instagram_url: string | null
          is_featured: boolean | null
          is_online: boolean | null
          latest_offer: string | null
          latest_offer_claims: number | null
          latest_review_author: string | null
          latest_review_comment: string | null
          latest_review_rating: number | null
          latitude: number | null
          level: number | null
          longitude: number | null
          name: string | null
          name_unaccent: string | null
          offer_count: number | null
          owner_id: string | null
          phone: string | null
          points: number | null
          rating: number | null
          review_count: number | null
          status: Database["public"]["Enums"]["business_status"] | null
          tiktok_url: string | null
          total_claims: number | null
          type: Database["public"]["Enums"]["business_type"] | null
          updated_at: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Relationships: []
      }
      exchanges_view: {
        Row: {
          completed_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          rec_name: string | null
          rec_name_unaccent: string | null
          receiver_completed_at: string | null
          receiver_id: string | null
          req_name: string | null
          req_name_unaccent: string | null
          request_description: string | null
          request_type: string | null
          requester_completed_at: string | null
          requester_id: string | null
          return_description: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchanges_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "business_card_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "exchanges_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchanges_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "businesses_explore_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchanges_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "business_card_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "exchanges_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchanges_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "businesses_explore_view"
            referencedColumns: ["id"]
          },
        ]
      }
      follows_view: {
        Row: {
          created_at: string | null
          followee_avatar: string | null
          followee_business_id: string | null
          followee_business_owner_id: string | null
          followee_name: string | null
          followee_user_id: string | null
          followee_username: string | null
          follower_avatar: string | null
          follower_id: string | null
          follower_name: string | null
          follower_username: string | null
          id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_business_id_fkey"
            columns: ["followee_business_id"]
            isOneToOne: false
            referencedRelation: "business_card_stats"
            referencedColumns: ["business_id"]
          },
          {
            foreignKeyName: "follows_followee_business_id_fkey"
            columns: ["followee_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_followee_business_id_fkey"
            columns: ["followee_business_id"]
            isOneToOne: false
            referencedRelation: "businesses_explore_view"
            referencedColumns: ["id"]
          },
        ]
      }
      member_last_login: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          full_name_unaccent: string | null
          last_login_at: string | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          is_member: boolean | null
          level: number | null
          member_number: number | null
          points: number | null
          status: Database["public"]["Enums"]["account_status"] | null
          status_message: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_member?: boolean | null
          level?: number | null
          member_number?: number | null
          points?: number | null
          status?: Database["public"]["Enums"]["account_status"] | null
          status_message?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_member?: boolean | null
          level?: number | null
          member_number?: number | null
          points?: number | null
          status?: Database["public"]["Enums"]["account_status"] | null
          status_message?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_member_points: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      broadcast_offer: { Args: { _offer_id: string }; Returns: number }
      business_area_counts: {
        Args: never
        Returns: {
          area: string
          cnt: number
        }[]
      }
      can_access_report: {
        Args: { _report_id: string; _user_id: string }
        Returns: boolean
      }
      claim_offer: { Args: { _offer_id: string; _pin: string }; Returns: Json }
      compute_business_area: { Args: { addr: string }; Returns: string }
      expire_stale_exchanges: { Args: never; Returns: undefined }
      expire_stale_memberships: { Args: never; Returns: undefined }
      get_admin_user_ids: {
        Args: never
        Returns: {
          user_id: string
        }[]
      }
      get_area_counts: {
        Args: never
        Returns: {
          area: string
          cnt: number
        }[]
      }
      get_member_rank: { Args: { _id: string }; Returns: number }
      get_membership_discount_pct: {
        Args: { _points: number }
        Returns: number
      }
      get_my_blocked_users: {
        Args: never
        Returns: {
          avatar_url: string
          blocked_at: string
          full_name: string
          id: string
          username: string
        }[]
      }
      get_public_profile: {
        Args: { _id: string }
        Returns: {
          avatar_url: string
          bio: string
          cover_url: string
          email: string
          full_name: string
          id: string
          level: number
          phone: string
          points: number
          status: string
          status_message: string
          username: string
        }[]
      }
      get_public_stats: {
        Args: never
        Returns: {
          businesses: number
          members: number
          offers: number
        }[]
      }
      get_user_role: { Args: { _id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      immutable_unaccent: { Args: { "": string }; Returns: string }
      increment_business_view: {
        Args: { _business_id: string }
        Returns: undefined
      }
      is_approved_member: { Args: { _user_id: string }; Returns: boolean }
      is_blocked: { Args: { _a: string; _b: string }; Returns: boolean }
      is_field_taken: {
        Args: { _field: string; _value: string }
        Returns: boolean
      }
      notif_pref_allowed: {
        Args: { _key: string; _user_id: string }
        Returns: boolean
      }
      notify_mention: {
        Args: { _body: string; _target_user_id: string; _title: string }
        Returns: undefined
      }
      refresh_admin_pending_notification: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
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
        | "creator"
        | "freelance"
        | "broker"
        | "shopping"
      offer_status: "active" | "inactive"
      report_status: "pending" | "replied" | "resolved" | "closed"
      report_target: "business" | "offer" | "review"
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
        "creator",
        "freelance",
        "broker",
        "shopping",
      ],
      offer_status: ["active", "inactive"],
      report_status: ["pending", "replied", "resolved", "closed"],
      report_target: ["business", "offer", "review"],
      suggestion_status: ["pending", "approved", "rejected"],
    },
  },
} as const
