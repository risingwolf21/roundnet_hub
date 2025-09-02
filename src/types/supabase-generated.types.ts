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
    PostgrestVersion: "13.0.4"
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
            referencedColumns: ["id"]
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
            referencedColumns: ["id"]
          },
        ]
      }
      match: {
        Row: {
          created_at: string
          created_by: string | null
          event: string | null
          id: string
          is_public: boolean
          rated: boolean
          team_a: string
          team_b: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event?: string | null
          id?: string
          is_public?: boolean
          rated?: boolean
          team_a: string
          team_b: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event?: string | null
          id?: string
          is_public?: boolean
          rated?: boolean
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
          effective_rating_cached: number
          gender: string
          hide_rating: boolean
          ka_index: number
          player: string
          pro_status: boolean
          rg_avatar_url: string | null
          rg_id: string | null
          rg_index: number | null
          rg_link: string | null
        }
        Insert: {
          created_at?: string
          effective_rating_cached?: number
          gender?: string
          hide_rating?: boolean
          ka_index?: number
          player?: string
          pro_status?: boolean
          rg_avatar_url?: string | null
          rg_id?: string | null
          rg_index?: number | null
          rg_link?: string | null
        }
        Update: {
          created_at?: string
          effective_rating_cached?: number
          gender?: string
          hide_rating?: boolean
          ka_index?: number
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
            foreignKeyName: "teams_player_1_fkey"
            columns: ["player_1"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "teams_player_2_fkey"
            columns: ["player_2"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "teams_player_2_fkey"
            columns: ["player_2"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["player"]
          },
        ]
      }
    }
    Views: {
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
      user_matches: {
        Row: {
          created_at: string | null
          id: string | null
          rated: boolean | null
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
            foreignKeyName: "teams_player_1_fkey"
            columns: ["team_a_player_1"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "teams_player_1_fkey"
            columns: ["team_b_player_1"]
            isOneToOne: false
            referencedRelation: "players_public"
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
          {
            foreignKeyName: "teams_player_2_fkey"
            columns: ["team_a_player_2"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["player"]
          },
          {
            foreignKeyName: "teams_player_2_fkey"
            columns: ["team_b_player_2"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["player"]
          },
        ]
      }
    }
    Functions: {
      add_match_with_sets: {
        Args:
          | {
              created_by?: string
              event?: string
              match_sets: Json
              player_1a: string
              player_1b: string
              player_2a: string
              player_2b: string
              rated?: boolean
              team_a: string
              team_b: string
            }
          | {
              event?: string
              match_sets: Json
              player_1a: string
              player_1b: string
              player_2a: string
              player_2b: string
              team_a: string
              team_b: string
            }
        Returns: undefined
      }
      apply_elo_for_match: {
        Args: { p_match: string }
        Returns: undefined
      }
      category_offset: {
        Args: { p_cat: string }
        Returns: number
      }
      compute_effective_player_from_values: {
        Args: { ka: number; rg: number }
        Returns: number
      }
      effective_rating_for_player: {
        Args: { p_player: string }
        Returns: number
      }
      effective_team_rating_with_category: {
        Args: { p_p1: string; p_p2: string }
        Returns: number
      }
      fetch_all_player_infos_from_pz: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      is_match_participant: {
        Args: { p_match: string }
        Returns: boolean
      }
      is_member_of_teams: {
        Args: { p_team_a: string; p_team_b: string }
        Returns: boolean
      }
      preview_elo_for_match: {
        Args: { p_match: string }
        Returns: {
          category_a: string
          category_b: string
          eff_team_a: number
          eff_team_b: number
          expected_a: number
          expected_b: number
          k_base: number
          k_eff: number
          upset_levels: number
          upset_multiplier: number
        }[]
      }
      recompute_all_effective_player_ratings: {
        Args: Record<PropertyKey, never>
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
          group: string
          id: string
          max_points_per_week: number | null
          name: string
        }
        Insert: {
          automated?: boolean
          created_at?: string
          description?: string
          end_date?: string | null
          group: string
          id?: string
          max_points_per_week?: number | null
          name?: string
        }
        Update: {
          automated?: boolean
          created_at?: string
          description?: string
          end_date?: string | null
          group?: string
          id?: string
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
            referencedColumns: ["userId"]
          },
        ]
      }
      event_bring_items: {
        Row: {
          created_at: string
          created_by: string
          event: string
          id: string
          name: string
          notes: string | null
          required_qty: number
          sort_order: number
          unit: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          event: string
          id?: string
          name: string
          notes?: string | null
          required_qty: number
          sort_order?: number
          unit?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          event?: string
          id?: string
          name?: string
          notes?: string | null
          required_qty?: number
          sort_order?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_bring_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
            foreignKeyName: "event_bring_pledges_user_id_fkey"
            columns: ["user_id"]
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
      events: {
        Row: {
          answerDeadline: string | null
          constellations_enabled: boolean
          created_at: string
          description: string
          endDateTime: string
          group: string
          id: string
          isCancelled: boolean
          items_enabled: boolean
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
          constellations_enabled?: boolean
          created_at?: string
          description?: string
          endDateTime: string
          group: string
          id?: string
          isCancelled?: boolean
          items_enabled?: boolean
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
          constellations_enabled?: boolean
          created_at?: string
          description?: string
          endDateTime?: string
          group?: string
          id?: string
          isCancelled?: boolean
          items_enabled?: boolean
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
          {
            foreignKeyName: "events_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_groups_view"
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
          user: string
        }
        Insert: {
          group: string
          role?: Database["public"]["Enums"]["GroupRole"]
          user: string
        }
        Update: {
          group?: string
          role?: Database["public"]["Enums"]["GroupRole"]
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
          group: string | null
          id: number
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
          lastUpdate?: string
          name?: string
          type?: Database["public"]["Enums"]["ItemType"]
        }
        Relationships: [
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
      user: {
        Row: {
          avatarUrl: string | null
          created_at: string
          disabled: boolean
          displayName: string
          email: string
          name: string
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
          name?: string
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
          name?: string
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
            foreignKeyName: "user_calendar_event_mapping_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "events_user_view"
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
      user_notification_settings: {
        Row: {
          id: number
          notification_tag: string
          user: string
        }
        Insert: {
          id?: number
          notification_tag: string
          user: string
        }
        Update: {
          id?: number
          notification_tag?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_settings_user_fkey"
            columns: ["user"]
            isOneToOne: false
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
          maxAttendees: number | null
          meetingDateTime: string | null
          place: string | null
          recurrence: Database["public"]["Enums"]["EventRecurrence"] | null
          recurrenceEnd: string | null
          required_item: Database["public"]["Enums"]["ItemType"] | null
          startingDateTime: string | null
          title: string | null
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
      user_features: {
        Row: {
          feature: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_features_feature_fkey"
            columns: ["feature"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["name"]
          },
        ]
      }
      user_permissions: {
        Row: {
          permission: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_permission_permission_fkey"
            columns: ["permission"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["name"]
          },
        ]
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
      add_drinks_history: {
        Args: { items: Json }
        Returns: undefined
      }
      as_service: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      authorize: {
        Args: { requested_permission: string }
        Returns: boolean
      }
      check_reply_to: {
        Args: { value: string }
        Returns: boolean
      }
      check_version: {
        Args: { input_version: string }
        Returns: boolean
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
        Returns: number
      }
      custom_access_token_hook: {
        Args: { event: Json }
        Returns: Json
      }
      eventcreation: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_attending_users: {
        Args: { event_id: number }
        Returns: string[]
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
      get_or_create_payment_for_user: {
        Args: { user_id: string }
        Returns: number
      }
      get_public_table_names: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          table_schema: string
        }[]
      }
      getattendingusers: {
        Args: { event_id: number }
        Returns: string[]
      }
      gettingjsonarray: {
        Args: { items: Json }
        Returns: undefined
      }
      increase_challenge_stats_count: {
        Args: {
          amount: number
          challenge_id: string
          image_url: string
          to_create_at: string
          user_id: string
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
      invoke_edge_function: {
        Args: { p_body?: Json; p_function_name: string; p_timeout_ms?: number }
        Returns: number
      }
      is_user_admin_in_group: {
        Args: { group_id: string }
        Returns: boolean
      }
      is_user_in_group: {
        Args: { group_id: string }
        Returns: boolean
      }
      test_login: {
        Args: { uid: string }
        Returns: undefined
      }
      test_seed_grant_feature: {
        Args: { p_feature: string; p_group: string }
        Returns: undefined
      }
      test_seed_grant_permission: {
        Args: { p_group: string; p_perm: string }
        Returns: undefined
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
      EventRecurrence: "Weekly" | "Fortnightly" | "Monthly" | "None"
      Feature:
        | "drinks"
        | "events"
        | "items"
        | "challenges"
        | "games"
        | "events.constellations"
      GroupRole: "user" | "admin" | "joinRequested"
      ItemType: "mtvStorage" | "mtvGym" | "mtvGymPalazzo" | "goethe"
      PaymentState: "Open" | "Fulfilled"
      ProductType: "Drink" | "Special" | "None"
      UserRole: "user" | "admin" | "procure" | "finance" | "trainer"
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
  games: {
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
      GroupRole: ["user", "admin", "joinRequested"],
      ItemType: ["mtvStorage", "mtvGym", "mtvGymPalazzo", "goethe"],
      PaymentState: ["Open", "Fulfilled"],
      ProductType: ["Drink", "Special", "None"],
      UserRole: ["user", "admin", "procure", "finance", "trainer"],
    },
  },
} as const
