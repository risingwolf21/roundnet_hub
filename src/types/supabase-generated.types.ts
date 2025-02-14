export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  games: {
    Tables: {
      match: {
        Row: {
          created_at: string
          id: string
          team_a: string
          team_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_a: string
          team_b: string
        }
        Update: {
          created_at?: string
          id?: string
          team_a?: string
          team_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_team_a_fkey"
            columns: ["team_a"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_team_b_fkey"
            columns: ["team_b"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          ka_index: number
          player: string
          rg_avatar_url: string | null
          rg_id: string | null
          rg_index: number
          rg_link: string | null
        }
        Insert: {
          created_at?: string
          ka_index?: number
          player?: string
          rg_avatar_url?: string | null
          rg_id?: string | null
          rg_index?: number
          rg_link?: string | null
        }
        Update: {
          created_at?: string
          ka_index?: number
          player?: string
          rg_avatar_url?: string | null
          rg_id?: string | null
          rg_index?: number
          rg_link?: string | null
        }
        Relationships: []
      }
      sets: {
        Row: {
          created_at: string
          id: string
          match: string
          set_number: number
          team_a_score: number
          team_b_score: number
        }
        Insert: {
          created_at?: string
          id?: string
          match: string
          set_number: number
          team_a_score: number
          team_b_score: number
        }
        Update: {
          created_at?: string
          id?: string
          match?: string
          set_number?: number
          team_a_score?: number
          team_b_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "sets_match_fkey"
            columns: ["match"]
            isOneToOne: false
            referencedRelation: "match"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sets_match_fkey"
            columns: ["match"]
            isOneToOne: false
            referencedRelation: "user_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          normalized_players: string
          player_1: string
          player_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          normalized_players: string
          player_1: string
          player_2: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          normalized_players?: string
          player_1?: string
          player_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_player_1_fkey"
            columns: ["player_1"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "teams_player_2_fkey"
            columns: ["player_2"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
        ]
      }
    }
    Views: {
      user_matches: {
        Row: {
          created_at: string | null
          id: string | null
          set_results: string | null
          team_a_name: string | null
          team_a_player_1: string | null
          team_a_player_2: string | null
          team_b_name: string | null
          team_b_player_1: string | null
          team_b_player_2: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_player_1_fkey"
            columns: ["team_a_player_1"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "teams_player_1_fkey"
            columns: ["team_b_player_1"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "teams_player_2_fkey"
            columns: ["team_a_player_2"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "teams_player_2_fkey"
            columns: ["team_b_player_2"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
        ]
      }
    }
    Functions: {
      add_match_with_sets: {
        Args: {
          player_1a: string
          player_2a: string
          player_1b: string
          player_2b: string
          team_a: string
          team_b: string
          match_sets: Json
        }
        Returns: undefined
      }
      fetch_all_player_infos_from_pz: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  permissions: {
    Tables: {
      app_permissions: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      app_roles: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          app_permission: string
          app_role: string
          id: string
        }
        Insert: {
          app_permission: string
          app_role: string
          id?: string
        }
        Update: {
          app_permission?: string
          app_role?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_app_permission_fkey"
            columns: ["app_permission"]
            isOneToOne: false
            referencedRelation: "app_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_app_role_fkey"
            columns: ["app_role"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          app_role: string
          id: string
          user: string
        }
        Insert: {
          app_role: string
          id?: string
          user?: string
        }
        Update: {
          app_role?: string
          id?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_app_role_fkey"
            columns: ["app_role"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      challenge: {
        Row: {
          automated: boolean
          created_at: string
          description: string
          end_date: string | null
          group: string | null
          id: number
          max_points_per_week: number | null
          name: string
        }
        Insert: {
          automated?: boolean
          created_at?: string
          description?: string
          end_date?: string | null
          group?: string | null
          id?: number
          max_points_per_week?: number | null
          name?: string
        }
        Update: {
          automated?: boolean
          created_at?: string
          description?: string
          end_date?: string | null
          group?: string | null
          id?: number
          max_points_per_week?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_stats: {
        Row: {
          challenge: number
          count: number
          created_at: string
          id: number
          user: string
        }
        Insert: {
          challenge: number
          count?: number
          created_at?: string
          id?: number
          user: string
        }
        Update: {
          challenge?: number
          count?: number
          created_at?: string
          id?: number
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_stats_challenge_fkey"
            columns: ["challenge"]
            isOneToOne: false
            referencedRelation: "challenge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_stats_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
        ]
      }
      drink: {
        Row: {
          active: boolean
          deleted: boolean
          id: number
          imageUrl: string | null
          name: string | null
          previousDrink: number | null
          price: number | null
          stock: number | null
          type: Database["public"]["Enums"]["ProductType"]
        }
        Insert: {
          active?: boolean
          deleted?: boolean
          id?: number
          imageUrl?: string | null
          name?: string | null
          previousDrink?: number | null
          price?: number | null
          stock?: number | null
          type?: Database["public"]["Enums"]["ProductType"]
        }
        Update: {
          active?: boolean
          deleted?: boolean
          id?: number
          imageUrl?: string | null
          name?: string | null
          previousDrink?: number | null
          price?: number | null
          stock?: number | null
          type?: Database["public"]["Enums"]["ProductType"]
        }
        Relationships: []
      }
      event_attendance_user_mapping: {
        Row: {
          event: string
          lastUpdate: string
          state: Database["public"]["Enums"]["EventAttendance"]
          user: string
        }
        Insert: {
          event?: string
          lastUpdate?: string
          state?: Database["public"]["Enums"]["EventAttendance"]
          user: string
        }
        Update: {
          event?: string
          lastUpdate?: string
          state?: Database["public"]["Enums"]["EventAttendance"]
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_user_mapping_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "current_distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_user_mapping_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_user_mapping_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_user_mapping_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
        ]
      }
      event_comments: {
        Row: {
          comment: string
          created_at: string
          displayName: string
          edited: boolean
          event: string
          id: string
          last_update: string
          reply_to: string | null
          user: string
        }
        Insert: {
          comment?: string
          created_at?: string
          displayName?: string
          edited?: boolean
          event?: string
          id?: string
          last_update?: string
          reply_to?: string | null
          user: string
        }
        Update: {
          comment?: string
          created_at?: string
          displayName?: string
          edited?: boolean
          event?: string
          id?: string
          last_update?: string
          reply_to?: string | null
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "current_distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "event_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
        ]
      }
      event_group: {
        Row: {
          color: string
          created_at: string
          description: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          answerDeadline: string | null
          created_at: string
          description: string
          endDateTime: string
          group: string
          id: string
          isCancelled: boolean
          key: string
          maxAttendees: number | null
          meetingDateTime: string | null
          place: string | null
          recurrence: Database["public"]["Enums"]["EventRecurrence"]
          recurrenceEnd: string | null
          required_item: Database["public"]["Enums"]["ItemType"] | null
          startingDateTime: string
          title: string
        }
        Insert: {
          answerDeadline?: string | null
          created_at?: string
          description?: string
          endDateTime: string
          group: string
          id?: string
          isCancelled?: boolean
          key?: string
          maxAttendees?: number | null
          meetingDateTime?: string | null
          place?: string | null
          recurrence?: Database["public"]["Enums"]["EventRecurrence"]
          recurrenceEnd?: string | null
          required_item?: Database["public"]["Enums"]["ItemType"] | null
          startingDateTime: string
          title?: string
        }
        Update: {
          answerDeadline?: string | null
          created_at?: string
          description?: string
          endDateTime?: string
          group?: string
          id?: string
          isCancelled?: boolean
          key?: string
          maxAttendees?: number | null
          meetingDateTime?: string | null
          place?: string | null
          recurrence?: Database["public"]["Enums"]["EventRecurrence"]
          recurrenceEnd?: string | null
          required_item?: Database["public"]["Enums"]["ItemType"] | null
          startingDateTime?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
        ]
      }
      group_user_mapping: {
        Row: {
          group: string
          user: string
        }
        Insert: {
          group: string
          user: string
        }
        Update: {
          group?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_user_mapping_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_user_mapping_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
        ]
      }
      history: {
        Row: {
          amount: number
          count: number
          created_at: string | null
          drink: number
          id: number
          payment: number
          user: string
          voucher: string | null
        }
        Insert: {
          amount?: number
          count: number
          created_at?: string | null
          drink: number
          id?: number
          payment: number
          user: string
          voucher?: string | null
        }
        Update: {
          amount?: number
          count?: number
          created_at?: string | null
          drink?: number
          id?: number
          payment?: number
          user?: string
          voucher?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "history_drink_fkey"
            columns: ["drink"]
            isOneToOne: false
            referencedRelation: "distinct_drinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_drink_fkey"
            columns: ["drink"]
            isOneToOne: false
            referencedRelation: "drink"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_payment_fkey"
            columns: ["payment"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
          {
            foreignKeyName: "history_voucher_fkey"
            columns: ["voucher"]
            isOneToOne: false
            referencedRelation: "user_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_voucher_fkey"
            columns: ["voucher"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      item_history: {
        Row: {
          created_at: string
          currentUser: string | null
          id: number
          key: number | null
          pastUser: string | null
        }
        Insert: {
          created_at?: string
          currentUser?: string | null
          id?: number
          key?: number | null
          pastUser?: string | null
        }
        Update: {
          created_at?: string
          currentUser?: string | null
          id?: number
          key?: number | null
          pastUser?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_history_currentUser_fkey"
            columns: ["currentUser"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
          {
            foreignKeyName: "item_history_key_fkey"
            columns: ["key"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_history_pastUser_fkey"
            columns: ["pastUser"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
        ]
      }
      items: {
        Row: {
          color: string
          created_at: string
          current_holder: string | null
          id: number
          lastUpdate: string
          name: string | null
          type: Database["public"]["Enums"]["ItemType"] | null
        }
        Insert: {
          color?: string
          created_at?: string
          current_holder?: string | null
          id?: number
          lastUpdate?: string
          name?: string | null
          type?: Database["public"]["Enums"]["ItemType"] | null
        }
        Update: {
          color?: string
          created_at?: string
          current_holder?: string | null
          id?: number
          lastUpdate?: string
          name?: string | null
          type?: Database["public"]["Enums"]["ItemType"] | null
        }
        Relationships: [
          {
            foreignKeyName: "keys_user_fkey"
            columns: ["current_holder"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
        ]
      }
      notification_token: {
        Row: {
          device_id: string
          fcm_token: string
          last_used: string
          user: string
        }
        Insert: {
          device_id: string
          fcm_token: string
          last_used?: string
          user?: string
        }
        Update: {
          device_id?: string
          fcm_token?: string
          last_used?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_token_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
          user: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          user?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_notifications_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
        ]
      }
      payments: {
        Row: {
          amountToPay: number
          created_at: string | null
          id: number
          paymentState: Database["public"]["Enums"]["PaymentState"]
          userId: string
        }
        Insert: {
          amountToPay?: number
          created_at?: string | null
          id?: number
          paymentState?: Database["public"]["Enums"]["PaymentState"]
          userId: string
        }
        Update: {
          amountToPay?: number
          created_at?: string | null
          id?: number
          paymentState?: Database["public"]["Enums"]["PaymentState"]
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_userid_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
        ]
      }
      user: {
        Row: {
          avatarUrl: string | null
          created_at: string
          disabled: boolean
          displayName: string
          email: string
          fcm_token: string | null
          name: string
          notifications:
            | Database["public"]["Enums"]["NotificationTags"][]
            | null
          role: Database["public"]["Enums"]["UserRole"]
          userId: string
          verified: boolean
        }
        Insert: {
          avatarUrl?: string | null
          created_at?: string
          disabled?: boolean
          displayName?: string
          email?: string
          fcm_token?: string | null
          name?: string
          notifications?:
            | Database["public"]["Enums"]["NotificationTags"][]
            | null
          role?: Database["public"]["Enums"]["UserRole"]
          userId?: string
          verified?: boolean
        }
        Update: {
          avatarUrl?: string | null
          created_at?: string
          disabled?: boolean
          displayName?: string
          email?: string
          fcm_token?: string | null
          name?: string
          notifications?:
            | Database["public"]["Enums"]["NotificationTags"][]
            | null
          role?: Database["public"]["Enums"]["UserRole"]
          userId?: string
          verified?: boolean
        }
        Relationships: []
      }
      user_calendar_event_mapping: {
        Row: {
          calendar_event_id: string
          event: string
          user: string
        }
        Insert: {
          calendar_event_id: string
          event: string
          user: string
        }
        Update: {
          calendar_event_id?: string
          event?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_calendar_event_mapping_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "current_distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_calendar_event_mapping_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_calendar_event_mapping_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_calendar_event_mapping_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
        ]
      }
      user_calender_settings: {
        Row: {
          calender_id: string | null
          minutes_to_remind: number | null
          user: string
        }
        Insert: {
          calender_id?: string | null
          minutes_to_remind?: number | null
          user: string
        }
        Update: {
          calender_id?: string | null
          minutes_to_remind?: number | null
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_calender_settings_user_fkey"
            columns: ["user"]
            isOneToOne: true
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
        ]
      }
      vouchers: {
        Row: {
          created_at: string
          id: string
          title: string | null
          total_drinks: number
          user: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          total_drinks?: number
          user?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          total_drinks?: number
          user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
        ]
      }
    }
    Views: {
      current_distinct_event: {
        Row: {
          answerDeadline: string | null
          created_at: string | null
          description: string | null
          endDateTime: string | null
          group: string | null
          id: string | null
          isCancelled: boolean | null
          key: string | null
          maxAttendees: number | null
          meetingDateTime: string | null
          place: string | null
          recurrence: Database["public"]["Enums"]["EventRecurrence"] | null
          recurrenceEnd: string | null
          startingDateTime: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
        ]
      }
      distinct_drinks: {
        Row: {
          active: boolean | null
          deleted: boolean | null
          id: number | null
          imageUrl: string | null
          name: string | null
          previousDrink: number | null
          price: number | null
          stock: number | null
          type: Database["public"]["Enums"]["ProductType"] | null
        }
        Relationships: []
      }
      distinct_event: {
        Row: {
          answerDeadline: string | null
          created_at: string | null
          description: string | null
          endDateTime: string | null
          group: string | null
          id: string | null
          isCancelled: boolean | null
          key: string | null
          maxAttendees: number | null
          meetingDateTime: string | null
          place: string | null
          recurrence: Database["public"]["Enums"]["EventRecurrence"] | null
          recurrenceEnd: string | null
          startingDateTime: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
        ]
      }
      readable_history: {
        Row: {
          amount: number | null
          count: number | null
          date: string | null
          displayName: string | null
          id: number | null
          name: string | null
          time: string | null
        }
        Relationships: []
      }
      user_vouchers: {
        Row: {
          available: number | null
          created_at: string | null
          id: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_drink_history: {
        Args: {
          drink_id: number
          payment_id: number
          count: number
          amount: number
        }
        Returns: undefined
      }
      add_drinks_history:
        | {
            Args: {
              items: Json
            }
            Returns: undefined
          }
        | {
            Args: {
              items: Json
              payment_id: number
            }
            Returns: undefined
          }
      add_match_with_sets: {
        Args: {
          player_1a: string
          player_2a: string
          player_1b: string
          player_2b: string
          team_a: string
          team_b: string
          match_sets: Json
        }
        Returns: undefined
      }
      add_notificationtags_to_all_users: {
        Args: {
          notification: Database["public"]["Enums"]["NotificationTags"]
        }
        Returns: undefined
      }
      authorize: {
        Args: {
          requested_permission: string
        }
        Returns: boolean
      }
      authorizewithrole: {
        Args: {
          requested_role: string
        }
        Returns: boolean
      }
      check_reply_to: {
        Args: {
          value: string
        }
        Returns: boolean
      }
      check_version: {
        Args: {
          input_version: string
        }
        Returns: boolean
      }
      custom_access_token_hook: {
        Args: {
          event: Json
        }
        Returns: Json
      }
      eventcreation: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      execute_query: {
        Args: {
          query_text: string
        }
        Returns: {
          result: Json
        }[]
      }
      execute_sql: {
        Args: {
          query: string
        }
        Returns: Json
      }
      get_attending_users: {
        Args: {
          event_id: number
        }
        Returns: string[]
      }
      get_enum_types: {
        Args: Record<PropertyKey, never>
        Returns: {
          enum_name: string
          enum_values: string[]
        }[]
      }
      get_or_create_payment_for_user: {
        Args: {
          user_id: string
        }
        Returns: number
      }
      get_public_table_names: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      getattendingusers: {
        Args: {
          event_id: number
        }
        Returns: string[]
      }
      gettingjsonarray: {
        Args: {
          items: Json
        }
        Returns: undefined
      }
      increase_challenge_stats_count: {
        Args: {
          user_id: string
          challenge_id: number
          amount: number
        }
        Returns: undefined
      }
      remove_notificationtags_from_all_users: {
        Args: {
          notification: Database["public"]["Enums"]["NotificationTags"]
        }
        Returns: undefined
      }
      update_attendance: {
        Args: {
          eventid: string
          userid: string
          state: Database["public"]["Enums"]["EventAttendance"]
        }
        Returns: {
          event: string
          lastUpdate: string
          state: Database["public"]["Enums"]["EventAttendance"]
          user: string
        }[]
      }
    }
    Enums: {
      app_permission:
        | "event.select"
        | "event.update"
        | "event.insert"
        | "event.delete"
        | "drink.select"
        | "drink.update"
        | "drink.insert"
        | "drink.delete"
        | "group.select"
        | "group.update"
        | "group.insert"
        | "group.delete"
        | "challenge.select"
        | "challenge.update"
        | "challenge.insert"
        | "challenge.delete"
        | "payments.select"
        | "payments.update"
        | "payments.insert"
        | "payments.delete"
        | "item.select"
        | "item.update"
        | "item.insert"
        | "item.delete"
      EventAttendance:
        | "Declined"
        | "Attending"
        | "Unanswered"
        | "Waiting"
        | "AttendingAsTrainer"
      EventRecurrence: "Weekly" | "Fortnightly" | "Monthly" | "None"
      ItemType: "mtvStorage" | "mtvGym" | "mtvGymPalazzo" | "goethe"
      NotificationTags:
        | "eventComments"
        | "userRegistration"
        | "paymentRequest"
        | "paymentPending"
        | "eventCancelled"
        | "eventUpdated"
        | "eventAttedanceChanged"
        | "challengeUpdate"
      PaymentState: "Open" | "Fulfilled"
      ProductType: "Drink" | "Special" | "None"
      UserRole: "user" | "admin" | "procure" | "finance" | "trainer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
