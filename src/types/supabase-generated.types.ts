export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  audit: {
    Tables: {
      log: {
        Row: {
          actor_id: string
          at: string
          changed_cols: string[]
          id: number
          new_data: Json | null
          old_data: Json | null
          op: string
          request_id: string | null
          row_pk: Json
          schema_name: string
          table_name: string
          txid: number
        }
        Insert: {
          actor_id: string
          at?: string
          changed_cols?: string[]
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          op: string
          request_id?: string | null
          row_pk: Json
          schema_name: string
          table_name: string
          txid?: number
        }
        Update: {
          actor_id?: string
          at?: string
          changed_cols?: string[]
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          op?: string
          request_id?: string | null
          row_pk?: Json
          schema_name?: string
          table_name?: string
          txid?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _changed_columns: {
        Args: { new_row: Json; old_row: Json }
        Returns: string[]
      }
      _current_actor: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      attach_trigger_for_table: {
        Args: { p_schema: string; p_table: string }
        Returns: undefined
      }
      attach_triggers_for_schema: {
        Args: { p_schema: string }
        Returns: undefined
      }
      retention_cleanup: {
        Args: { days?: number }
        Returns: number
      }
      run_retention: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  games: {
    Tables: {
      elo_calc_log: {
        Row: {
          a1_user: string | null
          a2_user: string | null
          b1_user: string | null
          b2_user: string | null
          calculated_at: string
          category_a: string
          category_b: string
          cfg_snapshot: Json | null
          eff_team_a: number
          eff_team_b: number
          expected_a: number
          expected_b: number
          k_base: number
          k_eff: number
          ka_a1_used: number | null
          ka_a2_used: number | null
          ka_b1_used: number | null
          ka_b2_used: number | null
          match: string
          outcome_a: number
          points_a: number
          points_b: number
          rated: boolean
          rg_a1_used: number | null
          rg_a2_used: number | null
          rg_b1_used: number | null
          rg_b2_used: number | null
          sets_a: number
          sets_b: number
          upset_levels: number
          upset_multiplier: number
        }
        Insert: {
          a1_user?: string | null
          a2_user?: string | null
          b1_user?: string | null
          b2_user?: string | null
          calculated_at?: string
          category_a: string
          category_b: string
          cfg_snapshot?: Json | null
          eff_team_a: number
          eff_team_b: number
          expected_a: number
          expected_b: number
          k_base: number
          k_eff: number
          ka_a1_used?: number | null
          ka_a2_used?: number | null
          ka_b1_used?: number | null
          ka_b2_used?: number | null
          match: string
          outcome_a: number
          points_a: number
          points_b: number
          rated?: boolean
          rg_a1_used?: number | null
          rg_a2_used?: number | null
          rg_b1_used?: number | null
          rg_b2_used?: number | null
          sets_a: number
          sets_b: number
          upset_levels: number
          upset_multiplier: number
        }
        Update: {
          a1_user?: string | null
          a2_user?: string | null
          b1_user?: string | null
          b2_user?: string | null
          calculated_at?: string
          category_a?: string
          category_b?: string
          cfg_snapshot?: Json | null
          eff_team_a?: number
          eff_team_b?: number
          expected_a?: number
          expected_b?: number
          k_base?: number
          k_eff?: number
          ka_a1_used?: number | null
          ka_a2_used?: number | null
          ka_b1_used?: number | null
          ka_b2_used?: number | null
          match?: string
          outcome_a?: number
          points_a?: number
          points_b?: number
          rated?: boolean
          rg_a1_used?: number | null
          rg_a2_used?: number | null
          rg_b1_used?: number | null
          rg_b2_used?: number | null
          sets_a?: number
          sets_b?: number
          upset_levels?: number
          upset_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "elo_calc_log_match_fkey"
            columns: ["match"]
            isOneToOne: true
            referencedRelation: "match"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elo_calc_log_match_fkey"
            columns: ["match"]
            isOneToOne: true
            referencedRelation: "user_matches"
            referencedColumns: ["match_id"]
          },
        ]
      }
      elo_config: {
        Row: {
          id: number
          k_factor: number
          men_offset: number
          mixed_offset: number
          rg_offset: number
          rg_scale: number
          upset_bonus_per_level: number
          w_ka: number
          w_rg: number
          women_offset: number
        }
        Insert: {
          id?: number
          k_factor?: number
          men_offset?: number
          mixed_offset?: number
          rg_offset?: number
          rg_scale?: number
          upset_bonus_per_level?: number
          w_ka?: number
          w_rg?: number
          women_offset?: number
        }
        Update: {
          id?: number
          k_factor?: number
          men_offset?: number
          mixed_offset?: number
          rg_offset?: number
          rg_scale?: number
          upset_bonus_per_level?: number
          w_ka?: number
          w_rg?: number
          women_offset?: number
        }
        Relationships: []
      }
      elo_history: {
        Row: {
          created_at: string
          delta: number
          eff_new_rating: number | null
          eff_old_rating: number | null
          id: string
          match: string
          new_rating: number
          old_rating: number
          user: string
        }
        Insert: {
          created_at?: string
          delta: number
          eff_new_rating?: number | null
          eff_old_rating?: number | null
          id?: string
          match: string
          new_rating: number
          old_rating: number
          user: string
        }
        Update: {
          created_at?: string
          delta?: number
          eff_new_rating?: number | null
          eff_old_rating?: number | null
          id?: string
          match?: string
          new_rating?: number
          old_rating?: number
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "elo_history_match_fkey"
            columns: ["match"]
            isOneToOne: false
            referencedRelation: "match"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elo_history_match_fkey"
            columns: ["match"]
            isOneToOne: false
            referencedRelation: "user_matches"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "elo_history_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "elo_history_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "elo_history_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "elo_history_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "unified_player_profiles"
            referencedColumns: ["player_id"]
          },
        ]
      }
      match: {
        Row: {
          a_player_1: string
          a_player_2: string
          b_player_1: string
          b_player_2: string
          created_at: string
          created_by: string | null
          event: string | null
          id: string
          is_public: boolean
          rated: boolean
          team_a_name: string | null
          team_b_name: string | null
        }
        Insert: {
          a_player_1: string
          a_player_2: string
          b_player_1: string
          b_player_2: string
          created_at?: string
          created_by?: string | null
          event?: string | null
          id?: string
          is_public?: boolean
          rated?: boolean
          team_a_name?: string | null
          team_b_name?: string | null
        }
        Update: {
          a_player_1?: string
          a_player_2?: string
          b_player_1?: string
          b_player_2?: string
          created_at?: string
          created_by?: string | null
          event?: string | null
          id?: string
          is_public?: boolean
          rated?: boolean
          team_a_name?: string | null
          team_b_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_a_player_1_fkey"
            columns: ["a_player_1"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_a_player_1_fkey"
            columns: ["a_player_1"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_a_player_1_fkey"
            columns: ["a_player_1"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_a_player_1_fkey"
            columns: ["a_player_1"]
            isOneToOne: false
            referencedRelation: "unified_player_profiles"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_a_player_2_fkey"
            columns: ["a_player_2"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_a_player_2_fkey"
            columns: ["a_player_2"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_a_player_2_fkey"
            columns: ["a_player_2"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_a_player_2_fkey"
            columns: ["a_player_2"]
            isOneToOne: false
            referencedRelation: "unified_player_profiles"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_b_player_1_fkey"
            columns: ["b_player_1"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_b_player_1_fkey"
            columns: ["b_player_1"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_b_player_1_fkey"
            columns: ["b_player_1"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_b_player_1_fkey"
            columns: ["b_player_1"]
            isOneToOne: false
            referencedRelation: "unified_player_profiles"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_b_player_2_fkey"
            columns: ["b_player_2"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_b_player_2_fkey"
            columns: ["b_player_2"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_b_player_2_fkey"
            columns: ["b_player_2"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_b_player_2_fkey"
            columns: ["b_player_2"]
            isOneToOne: false
            referencedRelation: "unified_player_profiles"
            referencedColumns: ["player_id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          display_name: string | null
          effective_rating_cached: number
          gender: string
          hide_rating: boolean
          ka_index: number
          linked_user_id: string | null
          matches_played: number | null
          player: string
          pro_status: boolean
          rg_avatar_url: string | null
          rg_id: string | null
          rg_index: number | null
          rg_link: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          effective_rating_cached?: number
          gender?: string
          hide_rating?: boolean
          ka_index?: number
          linked_user_id?: string | null
          matches_played?: number | null
          player?: string
          pro_status?: boolean
          rg_avatar_url?: string | null
          rg_id?: string | null
          rg_index?: number | null
          rg_link?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          effective_rating_cached?: number
          gender?: string
          hide_rating?: boolean
          ka_index?: number
          linked_user_id?: string | null
          matches_played?: number | null
          player?: string
          pro_status?: boolean
          rg_avatar_url?: string | null
          rg_id?: string | null
          rg_index?: number | null
          rg_link?: string | null
        }
        Relationships: []
      }
      sets: {
        Row: {
          created_at: string
          id: string
          match: string
          set_awarded: boolean | null
          set_number: number
          team_a_score: number
          team_b_score: number
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          match: string
          set_awarded?: boolean | null
          set_number: number
          team_a_score: number
          team_b_score: number
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          match?: string
          set_awarded?: boolean | null
          set_number?: number
          team_a_score?: number
          team_b_score?: number
          type?: string
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
            referencedColumns: ["match_id"]
          },
        ]
      }
    }
    Views: {
      leaderboard: {
        Row: {
          activity_status: string | null
          avatar_url: string | null
          confidence_level: number | null
          linked_user_id: string | null
          matches_played: number | null
          name: string | null
          player_id: string | null
          position: number | null
          rating: number | null
          trend_30_days: number | null
        }
        Relationships: []
      }
      players_public: {
        Row: {
          effective_rating_cached: number | null
          gender: string | null
          hide_rating: boolean | null
          ka_index: number | null
          player: string | null
          pro_status: boolean | null
          rg_avatar_url: string | null
          rg_id: string | null
          rg_index: number | null
          rg_link: string | null
        }
        Insert: {
          effective_rating_cached?: never
          gender?: string | null
          hide_rating?: boolean | null
          ka_index?: never
          player?: string | null
          pro_status?: boolean | null
          rg_avatar_url?: string | null
          rg_id?: string | null
          rg_index?: never
          rg_link?: string | null
        }
        Update: {
          effective_rating_cached?: never
          gender?: string | null
          hide_rating?: boolean | null
          ka_index?: never
          player?: string | null
          pro_status?: boolean | null
          rg_avatar_url?: string | null
          rg_id?: string | null
          rg_index?: never
          rg_link?: string | null
        }
        Relationships: []
      }
      unified_player_profiles: {
        Row: {
          effective_rating_cached: number | null
          full_name: string | null
          gender: string | null
          linked_user_id: string | null
          player_id: string | null
          pro_status: boolean | null
        }
        Relationships: []
      }
      user_matches: {
        Row: {
          created_at: string | null
          elo_change_a: number | null
          elo_change_b: number | null
          event: string | null
          is_public: boolean | null
          match_id: string | null
          rated: boolean | null
          set_scores: string | null
          sets_won_a: number | null
          sets_won_b: number | null
          team_a_name: string | null
          team_a_p1: string | null
          team_a_p2: string | null
          team_b_name: string | null
          team_b_p1: string | null
          team_b_p2: string | null
          winner_side: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_a_player_1_fkey"
            columns: ["team_a_p1"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_a_player_1_fkey"
            columns: ["team_a_p1"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_a_player_1_fkey"
            columns: ["team_a_p1"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_a_player_1_fkey"
            columns: ["team_a_p1"]
            isOneToOne: false
            referencedRelation: "unified_player_profiles"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_a_player_2_fkey"
            columns: ["team_a_p2"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_a_player_2_fkey"
            columns: ["team_a_p2"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_a_player_2_fkey"
            columns: ["team_a_p2"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_a_player_2_fkey"
            columns: ["team_a_p2"]
            isOneToOne: false
            referencedRelation: "unified_player_profiles"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_b_player_1_fkey"
            columns: ["team_b_p1"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_b_player_1_fkey"
            columns: ["team_b_p1"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_b_player_1_fkey"
            columns: ["team_b_p1"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_b_player_1_fkey"
            columns: ["team_b_p1"]
            isOneToOne: false
            referencedRelation: "unified_player_profiles"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_b_player_2_fkey"
            columns: ["team_b_p2"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "match_b_player_2_fkey"
            columns: ["team_b_p2"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_b_player_2_fkey"
            columns: ["team_b_p2"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "match_b_player_2_fkey"
            columns: ["team_b_p2"]
            isOneToOne: false
            referencedRelation: "unified_player_profiles"
            referencedColumns: ["player_id"]
          },
        ]
      }
    }
    Functions: {
      add_match_with_sets: {
        Args: {
          created_by?: string
          event?: string
          is_public?: boolean
          match_sets: Json
          player_1a: string
          player_1a_rating: number
          player_1b: string
          player_1b_rating: number
          player_2a: string
          player_2a_rating: number
          player_2b: string
          player_2b_rating: number
          player_names?: Json
          rated?: boolean
          spezi_set?: Json
        }
        Returns: string
      }
      apply_elo_for_match: {
        Args: { p_match: string }
        Returns: undefined
      }
      calculate_effective_rating: {
        Args: { ka: number; m_count?: number; rg: number }
        Returns: number
      }
      calculate_match_physics: {
        Args: {
          p_eff_a1: number
          p_eff_a2: number
          p_eff_b1: number
          p_eff_b2: number
          p_m_count_a1: number
          p_m_count_a2: number
          p_m_count_b1: number
          p_m_count_b2: number
          p_outcome_a: number
          p_p1_id: string
          p_p2_id: string
          p_p3_id: string
          p_p4_id: string
        }
        Returns: Database["games"]["CompositeTypes"]["elo_calculation_result"]
      }
      category_offset: {
        Args: { p_cat: string }
        Returns: number
      }
      determine_k_factor: {
        Args: { base_k: number; m_count: number }
        Returns: number
      }
      fetch_all_player_infos_from_pz: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_confidence_level: {
        Args: { p_matches_played: number }
        Returns: number
      }
      get_player_short_name: {
        Args: { p_player_id: string }
        Returns: string
      }
      is_match_participant: {
        Args: { p_match: string }
        Returns: boolean
      }
      is_match_public_or_match_member: {
        Args: { p_match: string }
        Returns: boolean
      }
      merge_guest_player: {
        Args: { guest_player_id: string; target_user_id: string }
        Returns: undefined
      }
      recompute_all_elo_from_scratch: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      team_category: {
        Args: { p_p1: string; p_p2: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      elo_calculation_result: {
        v_outcome_a: number | null
        base_delta: number | null
        final_sync_delta: number | null
        exp_a: number | null
        global_conf: number | null
      }
    }
  }
  notifications: {
    Tables: {
      notification_outbox: {
        Row: {
          attempt_count: number
          body: string | null
          created_at: string
          data: Json | null
          dedupe_key: string | null
          id: number
          last_error: string | null
          next_attempt_at: string
          notification: string | null
          sent_at: string | null
          status: string
          tenant: string
          title: string
          ttl_seconds: number | null
          urgency: string
          user: string
        }
        Insert: {
          attempt_count?: number
          body?: string | null
          created_at?: string
          data?: Json | null
          dedupe_key?: string | null
          id?: number
          last_error?: string | null
          next_attempt_at?: string
          notification?: string | null
          sent_at?: string | null
          status?: string
          tenant?: string
          title: string
          ttl_seconds?: number | null
          urgency?: string
          user: string
        }
        Update: {
          attempt_count?: number
          body?: string | null
          created_at?: string
          data?: Json | null
          dedupe_key?: string | null
          id?: number
          last_error?: string | null
          next_attempt_at?: string
          notification?: string | null
          sent_at?: string | null
          status?: string
          tenant?: string
          title?: string
          ttl_seconds?: number | null
          urgency?: string
          user?: string
        }
        Relationships: []
      }
      notification_outbox_targets: {
        Row: {
          attempt_count: number
          last_error: string | null
          last_status: number | null
          next_attempt_at: string
          outbox_id: number
          status: string
          subscription_id: string
        }
        Insert: {
          attempt_count?: number
          last_error?: string | null
          last_status?: number | null
          next_attempt_at?: string
          outbox_id: number
          status?: string
          subscription_id: string
        }
        Update: {
          attempt_count?: number
          last_error?: string | null
          last_status?: number | null
          next_attempt_at?: string
          outbox_id?: number
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_targets_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "notification_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_targets_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "web_push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_retention: {
        Row: {
          id: number
          keep_read_for: unknown
          keep_revoked_sub_for: unknown
          keep_sent_outbox_for: unknown
          keep_unread_for: unknown
          tenant: string
        }
        Insert: {
          id?: number
          keep_read_for?: unknown
          keep_revoked_sub_for?: unknown
          keep_sent_outbox_for?: unknown
          keep_unread_for?: unknown
          tenant: string
        }
        Update: {
          id?: number
          keep_read_for?: unknown
          keep_revoked_sub_for?: unknown
          keep_sent_outbox_for?: unknown
          keep_unread_for?: unknown
          tenant?: string
        }
        Relationships: []
      }
      notification_topics: {
        Row: {
          default_enabled: boolean
          description: string | null
          scope_type: string
          topic: string
        }
        Insert: {
          default_enabled?: boolean
          description?: string | null
          scope_type: string
          topic: string
        }
        Update: {
          default_enabled?: boolean
          description?: string | null
          scope_type?: string
          topic?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          dismissed_at: string | null
          expires_at: string | null
          id: string
          read_at: string | null
          source_id: string | null
          source_type: string | null
          tenant: string
          title: string
          topic: string
          user: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          read_at?: string | null
          source_id?: string | null
          source_type?: string | null
          tenant?: string
          title: string
          topic: string
          user?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          read_at?: string | null
          source_id?: string | null
          source_type?: string | null
          tenant?: string
          title?: string
          topic?: string
          user?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          channel: string
          created_at: string
          enabled: boolean
          scope_id: string | null
          scope_id_norm: string
          scope_type: string | null
          scope_type_norm: string
          tenant: string
          topic: string
          updated_at: string
          user: string
        }
        Insert: {
          channel?: string
          created_at?: string
          enabled?: boolean
          scope_id?: string | null
          scope_id_norm?: string
          scope_type?: string | null
          scope_type_norm?: string
          tenant?: string
          topic: string
          updated_at?: string
          user?: string
        }
        Update: {
          channel?: string
          created_at?: string
          enabled?: boolean
          scope_id?: string | null
          scope_id_norm?: string
          scope_type?: string | null
          scope_type_norm?: string
          tenant?: string
          topic?: string
          updated_at?: string
          user?: string
        }
        Relationships: []
      }
      web_push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          device_id: string | null
          endpoint: string
          expiration_time: string | null
          failure_count: number | null
          id: string
          kind: string
          last_error: string | null
          last_seen: string
          last_status: number | null
          p256dh: string | null
          platform: string | null
          revoked_at: string | null
          user: string
          user_agent: string | null
        }
        Insert: {
          auth?: string | null
          created_at?: string
          device_id?: string | null
          endpoint: string
          expiration_time?: string | null
          failure_count?: number | null
          id?: string
          kind?: string
          last_error?: string | null
          last_seen?: string
          last_status?: number | null
          p256dh?: string | null
          platform?: string | null
          revoked_at?: string | null
          user: string
          user_agent?: string | null
        }
        Update: {
          auth?: string | null
          created_at?: string
          device_id?: string | null
          endpoint?: string
          expiration_time?: string | null
          failure_count?: number | null
          id?: string
          kind?: string
          last_error?: string | null
          last_seen?: string
          last_status?: number | null
          p256dh?: string | null
          platform?: string | null
          revoked_at?: string | null
          user?: string
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_notify_emit: {
        Args: {
          p_body: string
          p_data: Json
          p_recipients: string[]
          p_scope_id: string
          p_scope_type: string
          p_source_id: string
          p_source_type: string
          p_title: string
          p_topic: string
          p_urgency: string
        }
        Returns: number
      }
      enqueue_notification: {
        Args: {
          p_body?: string
          p_body_en?: string
          p_data?: Json
          p_dedupe_key?: string
          p_source_id?: string
          p_source_type?: string
          p_tenant?: string
          p_title: string
          p_title_en?: string
          p_topic?: string
          p_ttl_seconds?: number
          p_urgency?: string
          p_user: string
        }
        Returns: number
      }
      inc_target_attempt: {
        Args: {
          p_error?: string
          p_outbox_id: number
          p_status: number
          p_subscription_id: string
        }
        Returns: undefined
      }
      is_topic_enabled_for_user: {
        Args: {
          p_scope_id?: string
          p_scope_type?: string
          p_tenant: string
          p_topic: string
          p_user: string
        }
        Returns: boolean
      }
      mark_all_notifications_read: {
        Args: { p_source_id?: string; p_source_type?: string; p_topic?: string }
        Returns: number
      }
      mark_notification_read: {
        Args: { p_id: string }
        Returns: undefined
      }
      notify_challenge_added: {
        Args: { p_actor?: string; p_challenge: string }
        Returns: number
      }
      notify_challenge_entry_added: {
        Args: { p_actor?: string; p_challenge: string }
        Returns: number
      }
      notify_drink_payment_fulfilled: {
        Args: { p_payment: number } | { p_payment: string }
        Returns: number
      }
      notify_emit: {
        Args: {
          p_body: string
          p_body_en?: string
          p_data: Json
          p_recipients: string[]
          p_scope_id: string
          p_scope_type: string
          p_source_id: string
          p_source_type: string
          p_title: string
          p_title_en?: string
          p_topic: string
          p_urgency: string
        }
        Returns: number
      }
      notify_event_canceled: {
        Args: { p_actor?: string; p_event: string }
        Returns: number
      }
      notify_event_comment_created: {
        Args: {
          p_author: string
          p_comment: string
          p_event: string
          p_text: string
        }
        Returns: number
      }
      notify_event_group_updated: {
        Args: { p_actor?: string; p_event: string; p_old_group: string }
        Returns: number
      }
      notify_event_updated: {
        Args: {
          p_actor?: string
          p_body: string
          p_body_en?: string
          p_event: string
        }
        Returns: number
      }
      notify_game_added: {
        Args: { p_actor?: string; p_match: string }
        Returns: number
      }
      notify_group_join_requested: {
        Args: { p_actor?: string; p_group: string; p_user: string }
        Returns: number
      }
      notify_group_request_confirmed: {
        Args: { p_actor?: string; p_group: string; p_user: string }
        Returns: number
      }
      notify_item_handover: {
        Args:
          | { p_actor?: string; p_from: string; p_item: number; p_to: string }
          | { p_actor?: string; p_from: string; p_item: string; p_to: string }
        Returns: number
      }
      notify_users: {
        Args: {
          p_body: string
          p_body_en?: string
          p_data: Json
          p_scope: string
          p_source_id: string
          p_source_type: string
          p_title: string
          p_title_en?: string
          p_topic: string
          p_users: string[]
        }
        Returns: number
      }
      set_notification_pref: {
        Args: {
          p_channel?: string
          p_enabled: boolean
          p_scope_id?: string
          p_scope_type?: string
          p_topic: string
        }
        Returns: {
          channel: string
          created_at: string
          enabled: boolean
          scope_id: string | null
          scope_id_norm: string
          scope_type: string | null
          scope_type_norm: string
          tenant: string
          topic: string
          updated_at: string
          user: string
        }
      }
      unregister_web_push_subscription: {
        Args: { p_endpoint: string }
        Returns: undefined
      }
      upsert_native_push_token: {
        Args: {
          p_device_id: string
          p_kind: string
          p_platform: string
          p_token: string
        }
        Returns: {
          auth: string | null
          created_at: string
          device_id: string | null
          endpoint: string
          expiration_time: string | null
          failure_count: number | null
          id: string
          kind: string
          last_error: string | null
          last_seen: string
          last_status: number | null
          p256dh: string | null
          platform: string | null
          revoked_at: string | null
          user: string
          user_agent: string | null
        }
      }
      upsert_webpush_subscription: {
        Args: {
          p_auth: string
          p_device_id: string
          p_endpoint: string
          p_p256dh: string
          p_platform: string
          p_user_agent: string
        }
        Returns: {
          auth: string | null
          created_at: string
          device_id: string | null
          endpoint: string
          expiration_time: string | null
          failure_count: number | null
          id: string
          kind: string
          last_error: string | null
          last_seen: string
          last_status: number | null
          p256dh: string | null
          platform: string | null
          revoked_at: string | null
          user: string
          user_agent: string | null
        }
      }
      webpush_prune_subscriptions: {
        Args: {
          p_failures?: number
          p_inactive_days?: number
          p_revoked_days?: number
        }
        Returns: number
      }
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
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      bundesliga_cache: {
        Row: {
          cache_key: string
          fetched_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          fetched_at?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          fetched_at?: string
          payload?: Json
        }
        Relationships: []
      }
      challenge: {
        Row: {
          automated: boolean
          category_enabled: boolean
          category_options: string[]
          comments_enabled: boolean
          created_at: string
          description: string
          end_date: string | null
          group: string
          id: string
          max_points_per_day: number | null
          max_points_per_week: number | null
          name: string
          show_all_members: boolean
          start_date: string | null
        }
        Insert: {
          automated?: boolean
          category_enabled?: boolean
          category_options?: string[]
          comments_enabled?: boolean
          created_at?: string
          description?: string
          end_date?: string | null
          group: string
          id?: string
          max_points_per_day?: number | null
          max_points_per_week?: number | null
          name?: string
          show_all_members?: boolean
          start_date?: string | null
        }
        Update: {
          automated?: boolean
          category_enabled?: boolean
          category_options?: string[]
          comments_enabled?: boolean
          created_at?: string
          description?: string
          end_date?: string | null
          group?: string
          id?: string
          max_points_per_day?: number | null
          max_points_per_week?: number | null
          name?: string
          show_all_members?: boolean
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_groups_view"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_stats: {
        Row: {
          challenge: string
          count: number
          created_at: string
          id: number
          image_url: string | null
          user: string
        }
        Insert: {
          challenge?: string
          count?: number
          created_at?: string
          id?: number
          image_url?: string | null
          user: string
        }
        Update: {
          challenge?: string
          count?: number
          created_at?: string
          id?: number
          image_url?: string | null
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
            foreignKeyName: "challenge_stats_challenge_fkey"
            columns: ["challenge"]
            isOneToOne: false
            referencedRelation: "challenge_podium"
            referencedColumns: ["challenge_id"]
          },
          {
            foreignKeyName: "challenge_stats_challenge_fkey"
            columns: ["challenge"]
            isOneToOne: false
            referencedRelation: "challenge_user_points"
            referencedColumns: ["challenge"]
          },
          {
            foreignKeyName: "challenge_stats_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_stats_meta: {
        Row: {
          category: string | null
          challenge_stat: number
          comment: string | null
        }
        Insert: {
          category?: string | null
          challenge_stat: number
          comment?: string | null
        }
        Update: {
          category?: string | null
          challenge_stat?: number
          comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_stats_meta_challenge_stat_fkey"
            columns: ["challenge_stat"]
            isOneToOne: true
            referencedRelation: "challenge_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          comment_id: string | null
          comment_text: string | null
          created_at: string
          details: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          reason: string
          reported_user: string | null
          reporter: string
          status: string
        }
        Insert: {
          comment_id?: string | null
          comment_text?: string | null
          created_at?: string
          details?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason: string
          reported_user?: string | null
          reporter: string
          status?: string
        }
        Update: {
          comment_id?: string | null
          comment_text?: string | null
          created_at?: string
          details?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason?: string
          reported_user?: string | null
          reporter?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "event_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reported_user_fkey"
            columns: ["reported_user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reporter_fkey"
            columns: ["reporter"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      drink: {
        Row: {
          active: boolean
          deleted: boolean
          id: string
          imageUrl: string | null
          name: string | null
          price: number | null
          stock: number | null
          type: Database["public"]["Enums"]["ProductType"]
        }
        Insert: {
          active?: boolean
          deleted?: boolean
          id?: string
          imageUrl?: string | null
          name?: string | null
          price?: number | null
          stock?: number | null
          type?: Database["public"]["Enums"]["ProductType"]
        }
        Update: {
          active?: boolean
          deleted?: boolean
          id?: string
          imageUrl?: string | null
          name?: string | null
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
            foreignKeyName: "event_attendance_user_mapping_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "events_user_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_user_mapping_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      event_bring_items: {
        Row: {
          created_at: string
          created_by: string | null
          event: string
          id: string
          name: string
          notes: string | null
          required_qty: number | null
          sort_order: number
          unit: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event: string
          id?: string
          name: string
          notes?: string | null
          required_qty?: number | null
          sort_order?: number
          unit?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event?: string
          id?: string
          name?: string
          notes?: string | null
          required_qty?: number | null
          sort_order?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_bring_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_items_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "current_distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_items_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_items_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_items_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "events_user_view"
            referencedColumns: ["id"]
          },
        ]
      }
      event_bring_pledges: {
        Row: {
          created_at: string
          event: string
          id: string
          item: string
          notes: string | null
          qty: number
          status: string
          updated_at: string
          user: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          item: string
          notes?: string | null
          qty: number
          status?: string
          updated_at?: string
          user?: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          item?: string
          notes?: string | null
          qty?: number
          status?: string
          updated_at?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_bring_pledges_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "current_distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_pledges_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_pledges_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_pledges_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "events_user_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_pledges_item_fkey"
            columns: ["item"]
            isOneToOne: false
            referencedRelation: "event_bring_item_status"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "event_bring_pledges_item_fkey"
            columns: ["item"]
            isOneToOne: false
            referencedRelation: "event_bring_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_pledges_item_fkey"
            columns: ["item"]
            isOneToOne: false
            referencedRelation: "event_bring_overview"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "event_bring_pledges_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
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
          user?: string
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
            foreignKeyName: "event_comments_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "events_user_view"
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
            referencedColumns: ["id"]
          },
        ]
      }
      event_group: {
        Row: {
          color: string
          created_at: string
          description: string
          id: string
          is_public: boolean
          name: string
          need_request_to_join: boolean
          parent_group: string | null
          visible: boolean
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          name?: string
          need_request_to_join?: boolean
          parent_group?: string | null
          visible?: boolean
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          name?: string
          need_request_to_join?: boolean
          parent_group?: string | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "event_group_parent_group_fkey"
            columns: ["parent_group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_group_parent_group_fkey"
            columns: ["parent_group"]
            isOneToOne: false
            referencedRelation: "event_groups_view"
            referencedColumns: ["id"]
          },
        ]
      }
      event_series: {
        Row: {
          active: boolean
          answer_offset: unknown | null
          constellations_enabled: boolean
          created_at: string
          created_by: string | null
          description: string
          dtstart: string
          duration: unknown
          group: string
          id: string
          items_enabled: boolean
          items_template: Json
          key: string
          max_attendees: number | null
          max_trial_attendees: number | null
          meeting_offset: unknown | null
          place: string | null
          recurrence: Database["public"]["Enums"]["EventRecurrence"]
          reminder_before: string | null
          required_item: Database["public"]["Enums"]["ItemType"] | null
          rrule: string
          timezone: string
          title: string
          until: string | null
        }
        Insert: {
          active?: boolean
          answer_offset?: unknown | null
          constellations_enabled?: boolean
          created_at?: string
          created_by?: string | null
          description?: string
          dtstart: string
          duration: unknown
          group: string
          id?: string
          items_enabled?: boolean
          items_template?: Json
          key?: string
          max_attendees?: number | null
          max_trial_attendees?: number | null
          meeting_offset?: unknown | null
          place?: string | null
          recurrence?: Database["public"]["Enums"]["EventRecurrence"]
          reminder_before?: string | null
          required_item?: Database["public"]["Enums"]["ItemType"] | null
          rrule: string
          timezone?: string
          title?: string
          until?: string | null
        }
        Update: {
          active?: boolean
          answer_offset?: unknown | null
          constellations_enabled?: boolean
          created_at?: string
          created_by?: string | null
          description?: string
          dtstart?: string
          duration?: unknown
          group?: string
          id?: string
          items_enabled?: boolean
          items_template?: Json
          key?: string
          max_attendees?: number | null
          max_trial_attendees?: number | null
          meeting_offset?: unknown | null
          place?: string | null
          recurrence?: Database["public"]["Enums"]["EventRecurrence"]
          reminder_before?: string | null
          required_item?: Database["public"]["Enums"]["ItemType"] | null
          rrule?: string
          timezone?: string
          title?: string
          until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_series_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_groups_view"
            referencedColumns: ["id"]
          },
        ]
      }
      event_transformation_applications: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_id: string
          id: string
          next: Json
          note: string | null
          prev: Json
          transformation_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_id: string
          id?: string
          next: Json
          note?: string | null
          prev: Json
          transformation_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          id?: string
          next?: Json
          note?: string | null
          prev?: Json
          transformation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_transformation_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "current_distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_transformation_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_transformation_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_transformation_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_user_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_transformation_applications_transformation_id_fkey"
            columns: ["transformation_id"]
            isOneToOne: false
            referencedRelation: "event_transformations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_transformations: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          event_key: string
          id: string
          lead_time: unknown
          next: Json
          one_time: boolean
          reason: string | null
          trigger: Json | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          event_key: string
          id?: string
          lead_time?: unknown
          next: Json
          one_time?: boolean
          reason?: string | null
          trigger?: Json | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          event_key?: string
          id?: string
          lead_time?: unknown
          next?: Json
          one_time?: boolean
          reason?: string | null
          trigger?: Json | null
        }
        Relationships: []
      }
      events: {
        Row: {
          answerDeadline: string | null
          constellations_enabled: boolean
          created_at: string
          description: string
          detached: boolean
          endDateTime: string
          group: string
          id: string
          isCancelled: boolean
          items_enabled: boolean
          key: string
          max_trial_attendees: number | null
          maxAttendees: number | null
          meetingDateTime: string | null
          occurrence_date: string | null
          place: string | null
          recurrence: Database["public"]["Enums"]["EventRecurrence"]
          recurrenceEnd: string | null
          reminder_before: string | null
          reminder_sent_at: string | null
          required_item: Database["public"]["Enums"]["ItemType"] | null
          series_id: string | null
          startingDateTime: string
          title: string
        }
        Insert: {
          answerDeadline?: string | null
          constellations_enabled?: boolean
          created_at?: string
          description?: string
          detached?: boolean
          endDateTime: string
          group: string
          id?: string
          isCancelled?: boolean
          items_enabled?: boolean
          key?: string
          max_trial_attendees?: number | null
          maxAttendees?: number | null
          meetingDateTime?: string | null
          occurrence_date?: string | null
          place?: string | null
          recurrence?: Database["public"]["Enums"]["EventRecurrence"]
          recurrenceEnd?: string | null
          reminder_before?: string | null
          reminder_sent_at?: string | null
          required_item?: Database["public"]["Enums"]["ItemType"] | null
          series_id?: string | null
          startingDateTime: string
          title?: string
        }
        Update: {
          answerDeadline?: string | null
          constellations_enabled?: boolean
          created_at?: string
          description?: string
          detached?: boolean
          endDateTime?: string
          group?: string
          id?: string
          isCancelled?: boolean
          items_enabled?: boolean
          key?: string
          max_trial_attendees?: number | null
          maxAttendees?: number | null
          meetingDateTime?: string | null
          occurrence_date?: string | null
          place?: string | null
          recurrence?: Database["public"]["Enums"]["EventRecurrence"]
          recurrenceEnd?: string | null
          reminder_before?: string | null
          reminder_sent_at?: string | null
          required_item?: Database["public"]["Enums"]["ItemType"] | null
          series_id?: string | null
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
          {
            foreignKeyName: "events_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_groups_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          description: string | null
          name: string
        }
        Insert: {
          description?: string | null
          name: string
        }
        Update: {
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      group_features: {
        Row: {
          feature: string
          group: string
        }
        Insert: {
          feature: string
          group?: string
        }
        Update: {
          feature?: string
          group?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_features_feature_fkey"
            columns: ["feature"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "group_features_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_features_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_groups_view"
            referencedColumns: ["id"]
          },
        ]
      }
      group_permissions: {
        Row: {
          group: string
          permission: string
        }
        Insert: {
          group: string
          permission: string
        }
        Update: {
          group?: string
          permission?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_permission_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_permission_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_groups_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_permission_permission_fkey"
            columns: ["permission"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["name"]
          },
        ]
      }
      group_user_mapping: {
        Row: {
          group: string
          role: Database["public"]["Enums"]["GroupRole"]
          trial_started_at: string | null
          user: string
        }
        Insert: {
          group: string
          role?: Database["public"]["Enums"]["GroupRole"]
          trial_started_at?: string | null
          user: string
        }
        Update: {
          group?: string
          role?: Database["public"]["Enums"]["GroupRole"]
          trial_started_at?: string | null
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
            foreignKeyName: "group_user_mapping_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_groups_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_user_mapping_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      history: {
        Row: {
          amount: number
          count: number
          created_at: string | null
          drink: string
          id: number
          payment: number
          user: string
          voucher: string | null
        }
        Insert: {
          amount?: number
          count: number
          created_at?: string | null
          drink: string
          id?: number
          payment: number
          user: string
          voucher?: string | null
        }
        Update: {
          amount?: number
          count?: number
          created_at?: string | null
          drink?: string
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
            foreignKeyName: "history_user_uuid_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
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
          current_user: string | null
          id: number
          key: number | null
          past_user: string | null
        }
        Insert: {
          created_at?: string
          current_user?: string | null
          id?: number
          key?: number | null
          past_user?: string | null
        }
        Update: {
          created_at?: string
          current_user?: string | null
          id?: number
          key?: number | null
          past_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_history_current_user_uuid_fkey"
            columns: ["current_user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_history_key_fkey"
            columns: ["key"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_history_past_user_uuid_fkey"
            columns: ["past_user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          color: string
          created_at: string
          current_holder: string | null
          group: string | null
          id: number
          id_uuid: string
          lastUpdate: string
          name: string
          type: Database["public"]["Enums"]["ItemType"]
        }
        Insert: {
          color?: string
          created_at?: string
          current_holder?: string | null
          group?: string | null
          id?: number
          id_uuid?: string
          lastUpdate?: string
          name: string
          type: Database["public"]["Enums"]["ItemType"]
        }
        Update: {
          color?: string
          created_at?: string
          current_holder?: string | null
          group?: string | null
          id?: number
          id_uuid?: string
          lastUpdate?: string
          name?: string
          type?: Database["public"]["Enums"]["ItemType"]
        }
        Relationships: [
          {
            foreignKeyName: "items_current_holder_fkey"
            columns: ["current_holder"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_groups_view"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amountToPay: number
          created_at: string | null
          id: number
          id_uuid: string
          paymentState: Database["public"]["Enums"]["PaymentState"]
          user: string
        }
        Insert: {
          amountToPay?: number
          created_at?: string | null
          id?: number
          id_uuid?: string
          paymentState?: Database["public"]["Enums"]["PaymentState"]
          user?: string
        }
        Update: {
          amountToPay?: number
          created_at?: string | null
          id?: number
          id_uuid?: string
          paymentState?: Database["public"]["Enums"]["PaymentState"]
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_uuid_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string | null
          name: string
        }
        Insert: {
          description?: string | null
          name: string
        }
        Update: {
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      tournament_costs: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          tournament: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          tournament: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          tournament?: string
          user_id?: string
        }
        Relationships: []
      }
      user: {
        Row: {
          avatarUrl: string | null
          created_at: string
          disabled: boolean
          displayName: string
          email: string
          id: string
          language: string
          last_seen_at: string | null
          name: string
          role: Database["public"]["Enums"]["UserRole"]
          terms_accepted_at: string | null
          terms_version: string | null
          verified: boolean
        }
        Insert: {
          avatarUrl?: string | null
          created_at?: string
          disabled?: boolean
          displayName?: string
          email?: string
          id: string
          language?: string
          last_seen_at?: string | null
          name?: string
          role?: Database["public"]["Enums"]["UserRole"]
          terms_accepted_at?: string | null
          terms_version?: string | null
          verified?: boolean
        }
        Update: {
          avatarUrl?: string | null
          created_at?: string
          disabled?: boolean
          displayName?: string
          email?: string
          id?: string
          language?: string
          last_seen_at?: string | null
          name?: string
          role?: Database["public"]["Enums"]["UserRole"]
          terms_accepted_at?: string | null
          terms_version?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked: string
          blocker: string
          created_at: string
        }
        Insert: {
          blocked: string
          blocker: string
          created_at?: string
        }
        Update: {
          blocked?: string
          blocker?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_fkey"
            columns: ["blocked"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_fkey"
            columns: ["blocker"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      user_direct_grants: {
        Row: {
          created_at: string
          key: string
          kind: Database["public"]["Enums"]["grant_kind"]
          tenant: string
          updated_at: string
          user: string
        }
        Insert: {
          created_at?: string
          key: string
          kind: Database["public"]["Enums"]["grant_kind"]
          tenant?: string
          updated_at?: string
          user: string
        }
        Update: {
          created_at?: string
          key?: string
          kind?: Database["public"]["Enums"]["grant_kind"]
          tenant?: string
          updated_at?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_direct_grants_user_uuid_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          created_at: string
          id: string
          title: string | null
          total_drinks: number
          user: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          total_drinks?: number
          user: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          total_drinks?: number
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      challenge_podium: {
        Row: {
          challenge_id: string | null
          challenge_name: string | null
          end_date: string | null
          podium: Json | null
        }
        Relationships: []
      }
      challenge_user_points: {
        Row: {
          avatarUrl: string | null
          challenge: string | null
          displayName: string | null
          total_points: number | null
          user: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_user_mapping_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      current_distinct_event: {
        Row: {
          answerDeadline: string | null
          constellations_enabled: boolean | null
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
          {
            foreignKeyName: "events_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_groups_view"
            referencedColumns: ["id"]
          },
        ]
      }
      distinct_event: {
        Row: {
          answerDeadline: string | null
          constellations_enabled: boolean | null
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
          {
            foreignKeyName: "events_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_groups_view"
            referencedColumns: ["id"]
          },
        ]
      }
      event_bring_item_status: {
        Row: {
          event_id: string | null
          fulfilled: boolean | null
          item_id: string | null
          name: string | null
          pledged_qty: number | null
          required_qty: number | null
          shortfall: number | null
          surplus: number | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_bring_items_event_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "current_distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_items_event_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_items_event_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_items_event_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events_user_view"
            referencedColumns: ["id"]
          },
        ]
      }
      event_bring_overview: {
        Row: {
          event: string | null
          item_id: string | null
          name: string | null
          pledged_qty: number | null
          remaining_qty: number | null
          required_qty: number | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_bring_items_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "current_distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_items_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_items_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_bring_items_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "events_user_view"
            referencedColumns: ["id"]
          },
        ]
      }
      event_groups_view: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_public: boolean | null
          name: string | null
          need_request_to_join: boolean | null
          parent_group: string | null
          role: Database["public"]["Enums"]["GroupRole"] | null
          visible: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "event_group_parent_group_fkey"
            columns: ["parent_group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_group_parent_group_fkey"
            columns: ["parent_group"]
            isOneToOne: false
            referencedRelation: "event_groups_view"
            referencedColumns: ["id"]
          },
        ]
      }
      events_user_view: {
        Row: {
          answerDeadline: string | null
          attending_count: number | null
          constellations_enabled: boolean | null
          created_at: string | null
          declined_count: number | null
          description: string | null
          endDateTime: string | null
          group: string | null
          id: string | null
          isCancelled: boolean | null
          key: string | null
          max_trial_attendees: number | null
          maxAttendees: number | null
          meetingDateTime: string | null
          place: string | null
          recurrence: Database["public"]["Enums"]["EventRecurrence"] | null
          recurrenceEnd: string | null
          required_item: Database["public"]["Enums"]["ItemType"] | null
          startingDateTime: string | null
          title: string | null
          user_group_role: Database["public"]["Enums"]["GroupRole"] | null
          user_state: Database["public"]["Enums"]["EventAttendance"] | null
        }
        Relationships: [
          {
            foreignKeyName: "events_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_groups_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_grants_view: {
        Row: {
          granted_by: string | null
          key: string | null
          kind: Database["public"]["Enums"]["grant_kind"] | null
          tenant: string | null
          user: string | null
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
      _expand_series_sql: {
        Args: { p_from?: string; p_horizon_days?: number; p_series_id: string }
        Returns: Json
      }
      _sum_challenge_points_for_self: {
        Args: {
          challenge_id: string
          from_ts: string
          to_ts: string
          uid: string
        }
        Returns: number
      }
      add_drinks_history: {
        Args: { items: Json }
        Returns: undefined
      }
      admin_analytics_attendance_ranking: {
        Args: { p_end: string; p_start: string }
        Returns: {
          attendance_count: number
          user_name: string
        }[]
      }
      admin_analytics_drinks_ranking: {
        Args: { p_end: string; p_start: string }
        Returns: {
          drinks_count: number
          total_spend: number
          user_name: string
        }[]
      }
      admin_challenge_zero_points_candidates: {
        Args: { p_challenge_id: string; p_end: string; p_start: string }
        Returns: {
          attendance_count: number
          user_name: string
        }[]
      }
      admin_expire_trials: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      admin_user_effective_grants: {
        Args: { p_user: string }
        Returns: {
          group_id: string
          group_name: string
          key: string
          kind: Database["public"]["Enums"]["grant_kind"]
          source: string
        }[]
      }
      anonymize_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      apply_series_occurrences: {
        Args: { p_mode?: string; p_series_id: string; p_slots: Json }
        Returns: Json
      }
      apply_transformation_to_event: {
        Args: { p_event_id: string; p_transformation_id: string }
        Returns: undefined
      }
      authorize: {
        Args: { requested_permission: string }
        Returns: boolean
      }
      bundesliga_cache_boundary: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      check_reply_to: {
        Args: { value: string }
        Returns: boolean
      }
      create_event_transformation_by_key: {
        Args: {
          p_event_key: string
          p_lead_time: unknown
          p_next: Json
          p_one_time?: boolean
          p_reason?: string
          p_trigger: Json
        }
        Returns: {
          active: boolean
          created_at: string
          created_by: string | null
          event_key: string
          id: string
          lead_time: unknown
          next: Json
          one_time: boolean
          reason: string | null
          trigger: Json | null
        }
      }
      create_group_with_user: {
        Args: {
          group_color: string
          group_description: string
          group_name: string
          is_public: boolean
          need_request: boolean
          parent?: string
          role: Database["public"]["Enums"]["GroupRole"]
          user_id: string
        }
        Returns: {
          color: string
          created_at: string
          description: string
          id: string
          is_public: boolean
          name: string
          need_request_to_join: boolean
          parent_group: string | null
          visible: boolean
        }
      }
      create_next_occurrences: {
        Args: { p_horizon: unknown; p_run_at: string }
        Returns: {
          answerDeadline: string | null
          constellations_enabled: boolean
          created_at: string
          description: string
          detached: boolean
          endDateTime: string
          group: string
          id: string
          isCancelled: boolean
          items_enabled: boolean
          key: string
          max_trial_attendees: number | null
          maxAttendees: number | null
          meetingDateTime: string | null
          occurrence_date: string | null
          place: string | null
          recurrence: Database["public"]["Enums"]["EventRecurrence"]
          recurrenceEnd: string | null
          reminder_before: string | null
          reminder_sent_at: string | null
          required_item: Database["public"]["Enums"]["ItemType"] | null
          series_id: string | null
          startingDateTime: string
          title: string
        }[]
      }
      create_next_occurrences_candidates: {
        Args: { p_horizon: unknown; p_run_at: string }
        Returns: {
          answerDeadline: string
          constellations_enabled: boolean
          description: string
          endDateTime: string
          group_id: string
          items_enabled: boolean
          key: string
          maxAttendees: number
          place: string
          recurrence: Database["public"]["Enums"]["EventRecurrence"]
          recurrenceEnd: string
          required_item: Database["public"]["Enums"]["ItemType"]
          startingDateTime: string
          title: string
        }[]
      }
      custom_access_token_hook: {
        Args: { event: Json }
        Returns: Json
      }
      delete_event: {
        Args: { p_event_id: string }
        Returns: {
          deleted_attendance: number
          deleted_bring_items: number
          deleted_bring_pledges: number
          deleted_comments: number
          deleted_event: number
        }[]
      }
      delete_event_and_children: {
        Args: { p_event_id: string }
        Returns: {
          deleted_attendance: number
          deleted_bring_items: number
          deleted_bring_pledges: number
          deleted_comments: number
          deleted_event: number
        }[]
      }
      delete_recurring_events: {
        Args: { p_key: string; p_start_time: string }
        Returns: {
          deleted_attendance: number
          deleted_bring_items: number
          deleted_bring_pledges: number
          deleted_comments: number
          deleted_event: number
          event_id: string
          recurrence_event_id: string
          recurrence_updated: boolean
        }[]
      }
      edit_item: {
        Args: {
          p_color?: string
          p_id: number
          p_name?: string
          p_type?: Database["public"]["Enums"]["ItemType"]
        }
        Returns: {
          color: string
          created_at: string
          current_holder: string | null
          group: string | null
          id: number
          id_uuid: string
          lastUpdate: string
          name: string
          type: Database["public"]["Enums"]["ItemType"]
        }
      }
      expand_all_due_series: {
        Args: { p_horizon_days?: number }
        Returns: Json
      }
      expand_series: {
        Args: { p_mode?: string; p_series_id: string; p_slots: Json }
        Returns: Json
      }
      expire_trial_memberships: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_bundesliga_cache: {
        Args: { p_keys: string[] }
        Returns: {
          cache_key: string
          fetched_at: string
          is_fresh: boolean
          payload: Json
        }[]
      }
      get_or_create_payment_for_user: {
        Args: { user_id: string }
        Returns: number
      }
      gettingjsonarray: {
        Args: { items: Json }
        Returns: undefined
      }
      grant_group_grants: {
        Args: { p_feats?: string[]; p_group: string; p_perms?: string[] }
        Returns: undefined
      }
      grant_user_grants: {
        Args: {
          p_feats?: string[]
          p_perms?: string[]
          p_tenant?: string
          p_user: string
        }
        Returns: undefined
      }
      group_has_no_members: {
        Args: { p_group: string }
        Returns: boolean
      }
      inc_target_attempt: {
        Args: {
          p_error: string
          p_outbox_id: number
          p_status: number
          p_subscription_id: string
        }
        Returns: undefined
      }
      increase_challenge_stats_count: {
        Args: {
          amount: number
          category?: string
          challenge_id: string
          comment?: string
          image_url?: string
          to_create_at: string
        }
        Returns: {
          challenge: string
          count: number
          created_at: string
          id: number
          image_url: string | null
          user: string
        }
      }
      insert_event_with_bring_items: {
        Args: { p_event: Json; p_items: Json }
        Returns: {
          event_id: string
          inserted_item_ids: string[]
        }[]
      }
      invoke_edge_function: {
        Args: { p_body?: Json; p_function_name: string; p_timeout_ms?: number }
        Returns: number
      }
      is_full_member_of_event: {
        Args: { p_event: string }
        Returns: boolean
      }
      is_full_member_of_group: {
        Args: { p_group: string }
        Returns: boolean
      }
      is_group_public_joinable: {
        Args: { p_group: string }
        Returns: boolean
      }
      is_member_of_event: {
        Args: { p_event: string }
        Returns: boolean
      }
      is_user_admin_in_group: {
        Args: { group_id: string }
        Returns: boolean
      }
      is_user_in_group: {
        Args: { group_id: string }
        Returns: boolean
      }
      key_handover: {
        Args: { p_key_id: number; p_new_holder: string }
        Returns: {
          holder: string
          key_id: number
        }[]
      }
      moderate_report: {
        Args: { p_action: string; p_report: string }
        Returns: undefined
      }
      purge_bundesliga_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      repair_recurrence_local_time: {
        Args: { p_tz?: string }
        Returns: number
      }
      revert_transformation_application: {
        Args: { p_application_id: string }
        Returns: undefined
      }
      revoke_group_grants: {
        Args: { p_feats?: string[]; p_group: string; p_perms?: string[] }
        Returns: undefined
      }
      revoke_user_grants: {
        Args: {
          p_feats?: string[]
          p_perms?: string[]
          p_tenant?: string
          p_user: string
        }
        Returns: undefined
      }
      run_event_transformation_worker_if_needed: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      run_event_transformations: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      run_push_worker_if_needed: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      run_recurrence_expander_if_needed: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      send_answer_deadline_reminders: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      series_for_expansion: {
        Args: { p_series_id?: string }
        Returns: {
          answer_offset_s: number
          dtstart: string
          duration_s: number
          id: string
          meeting_offset_s: number
          rrule: string
          timezone: string
          until: string
        }[]
      }
      update_attendance: {
        Args: {
          p_event: string
          p_state: Database["public"]["Enums"]["EventAttendance"]
          p_user: string
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
      EventAttendance:
        | "Declined"
        | "Attending"
        | "Unanswered"
        | "Waiting"
        | "AttendingAsTrainer"
        | "RequestedAttendance"
        | "AttendingAsTrial"
        | "WaitingAsTrial"
      EventRecurrence: "Weekly" | "Fortnightly" | "Monthly" | "None"
      Feature:
        | "drinks"
        | "events"
        | "items"
        | "challenges"
        | "games"
        | "events.constellations"
      grant_kind: "perm" | "feat"
      GroupRole: "user" | "admin" | "joinRequested" | "trial"
      ItemType: "mtvStorage" | "mtvGym" | "mtvGymPalazzo" | "goethe"
      PaymentState: "Open" | "Fulfilled"
      ProductType: "Drink" | "Special" | "None"
      UserRole: "user" | "admin" | "procure" | "finance" | "trainer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  util: {
    Tables: {
      background_errors: {
        Row: {
          actor_user: string | null
          at: string
          details: Json | null
          id: string
          message: string | null
          op: string
          ref_id: string | null
          reported: boolean
          source: string
        }
        Insert: {
          actor_user?: string | null
          at?: string
          details?: Json | null
          id?: string
          message?: string | null
          op: string
          ref_id?: string | null
          reported?: boolean
          source: string
        }
        Update: {
          actor_user?: string | null
          at?: string
          details?: Json | null
          id?: string
          message?: string | null
          op?: string
          ref_id?: string | null
          reported?: boolean
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      custom_access_token_hook: {
        Args: { event: Json }
        Returns: Json
      }
      get_column_info: {
        Args: { schema_name: string; selected_table: string }
        Returns: {
          column_name: string
          data_type: string
          foreign_key_column_name: string
          foreign_key_schema_name: string
          foreign_key_table_name: string
          is_nullable: boolean
        }[]
      }
      get_enum_types: {
        Args: Record<PropertyKey, never>
        Returns: {
          enum_name: string
          enum_values: string[]
        }[]
      }
      get_primary_keys: {
        Args: { schema_name: string; table_name: string }
        Returns: {
          column_name: string
        }[]
      }
      get_public_table_names: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          table_schema: string
        }[]
      }
      get_table_metadata: {
        Args: { target_schemas?: string[] }
        Returns: Json
      }
      jwt_claims: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      jwt_has_permission: {
        Args: { p_perm: string }
        Returns: boolean
      }
      sqlstate_label: {
        Args: { p_state: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
  audit: {
    Enums: {},
  },
  games: {
    Enums: {},
  },
  notifications: {
    Enums: {},
  },
  public: {
    Enums: {
      EventAttendance: [
        "Declined",
        "Attending",
        "Unanswered",
        "Waiting",
        "AttendingAsTrainer",
        "RequestedAttendance",
        "AttendingAsTrial",
        "WaitingAsTrial",
      ],
      EventRecurrence: ["Weekly", "Fortnightly", "Monthly", "None"],
      Feature: [
        "drinks",
        "events",
        "items",
        "challenges",
        "games",
        "events.constellations",
      ],
      grant_kind: ["perm", "feat"],
      GroupRole: ["user", "admin", "joinRequested", "trial"],
      ItemType: ["mtvStorage", "mtvGym", "mtvGymPalazzo", "goethe"],
      PaymentState: ["Open", "Fulfilled"],
      ProductType: ["Drink", "Special", "None"],
      UserRole: ["user", "admin", "procure", "finance", "trainer"],
    },
  },
  util: {
    Enums: {},
  },
} as const

