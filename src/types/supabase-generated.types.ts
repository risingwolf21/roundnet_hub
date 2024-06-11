export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
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
          created_at: string
          description: string
          group: number
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          description?: string
          group: number
          id?: number
          name?: string
        }
        Update: {
          created_at?: string
          description?: string
          group?: number
          id?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_group_fkey"
            columns: ["group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          }
        ]
      }
      challenge_stats: {
        Row: {
          challenge: number
          count: number
          id: number
          last_update: string
          user: string
        }
        Insert: {
          challenge: number
          count?: number
          id?: number
          last_update?: string
          user: string
        }
        Update: {
          challenge?: number
          count?: number
          id?: number
          last_update?: string
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
          }
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
          event: number
          lastUpdate: string
          state: Database["public"]["Enums"]["EventAttendance"]
          user: string
        }
        Insert: {
          event: number
          lastUpdate?: string
          state?: Database["public"]["Enums"]["EventAttendance"]
          user: string
        }
        Update: {
          event?: number
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
          }
        ]
      }
      event_comments: {
        Row: {
          comment: string
          created_at: string
          displayName: string
          event: number
          id: number
          user: string
        }
        Insert: {
          comment?: string
          created_at?: string
          displayName?: string
          event: number
          id?: number
          user: string
        }
        Update: {
          comment?: string
          created_at?: string
          displayName?: string
          event?: number
          id?: number
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
            foreignKeyName: "event_comments_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          }
        ]
      }
      event_group: {
        Row: {
          color: string
          created_at: string
          description: string
          id: number
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          id?: number
          name?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          answerDeadline: string | null
          created_at: string
          description: string
          endDateTime: string | null
          group: number | null
          id: number
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
          endDateTime?: string | null
          group?: number | null
          id?: number
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
          endDateTime?: string | null
          group?: number | null
          id?: number
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
          }
        ]
      }
      group_user_mapping: {
        Row: {
          group: number
          user: string
        }
        Insert: {
          group: number
          user: string
        }
        Update: {
          group?: number
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
          }
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
        }
        Insert: {
          amount?: number
          count: number
          created_at?: string | null
          drink: number
          id?: number
          payment: number
          user: string
        }
        Update: {
          amount?: number
          count?: number
          created_at?: string | null
          drink?: number
          id?: number
          payment?: number
          user?: string
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
            foreignKeyName: "history_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          }
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
            foreignKeyName: "key_history_currentuser_fkey"
            columns: ["currentUser"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          },
          {
            foreignKeyName: "key_history_key_fkey"
            columns: ["key"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_history_pastuser_fkey"
            columns: ["pastUser"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          }
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
          }
        ]
      }
      logs: {
        Row: {
          created_at: string
          id: number
          message: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          message?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          message?: string | null
        }
        Relationships: []
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
          }
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
          }
        ]
      }
      user: {
        Row: {
          avatarUrl: string | null
          created_at: string | null
          disabled: boolean
          displayName: string
          email: string
          fcm_token: string | null
          notifications:
            | Database["public"]["Enums"]["NotificationTags"][]
            | null
          permissions: Database["public"]["Enums"]["Permissions"][] | null
          role: Database["public"]["Enums"]["UserRole"]
          userId: string
          verified: boolean
        }
        Insert: {
          avatarUrl?: string | null
          created_at?: string | null
          disabled?: boolean
          displayName?: string
          email?: string
          fcm_token?: string | null
          notifications?:
            | Database["public"]["Enums"]["NotificationTags"][]
            | null
          permissions?: Database["public"]["Enums"]["Permissions"][] | null
          role?: Database["public"]["Enums"]["UserRole"]
          userId?: string
          verified?: boolean
        }
        Update: {
          avatarUrl?: string | null
          created_at?: string | null
          disabled?: boolean
          displayName?: string
          email?: string
          fcm_token?: string | null
          notifications?:
            | Database["public"]["Enums"]["NotificationTags"][]
            | null
          permissions?: Database["public"]["Enums"]["Permissions"][] | null
          role?: Database["public"]["Enums"]["UserRole"]
          userId?: string
          verified?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      current_distinct_event: {
        Row: {
          answerDeadline: string | null
          created_at: string | null
          description: string | null
          endDateTime: string | null
          group: number | null
          id: number | null
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
          }
        ]
      }
      distinct_event: {
        Row: {
          answerDeadline: string | null
          created_at: string | null
          description: string | null
          endDateTime: string | null
          group: number | null
          id: number | null
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
          }
        ]
      }
    }
    Functions: {
      eventcreation: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_attending_users: {
        Args: {
          event_id: number
        }
        Returns: string[]
      }
      get_or_create_payment_for_user: {
        Args: {
          user_id: string
        }
        Returns: number
      }
      getattendingusers: {
        Args: {
          event_id: number
        }
        Returns: string[]
      }
      getusersforeventcommentnotifications: {
        Args: {
          event_id: number
        }
        Returns: string[]
      }
      getusersfornotificationstag: {
        Args: {
          tag: Database["public"]["Enums"]["NotificationTags"]
        }
        Returns: string[]
      }
      getusersforpaymentrequestnotifications: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      getusersforuserregistrationnotifications: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      increase_challenge_stats_count:
        | {
            Args: {
              user_id: string
              amount: number
            }
            Returns: undefined
          }
        | {
            Args: {
              user_id: string
              challenge_id: number
              amount: number
            }
            Returns: undefined
          }
      sendnotifications:
        | {
            Args: {
              external_ids: string[]
            }
            Returns: number
          }
        | {
            Args: {
              external_ids: string
            }
            Returns: number
          }
      update_attendance: {
        Args: {
          eventid: number
          userid: string
          state: Database["public"]["Enums"]["EventAttendance"]
        }
        Returns: {
          event: number
          lastUpdate: string
          state: Database["public"]["Enums"]["EventAttendance"]
          user: string
        }[]
      }
    }
    Enums: {
      EventAttendance: "Declined" | "Attending" | "Unanswered" | "Waiting"
      EventRecurrence: "Weekly" | "Fortnightly" | "Monthly" | "None"
      ItemType: "mtvStorage" | "mtvGym" | "mtvGymPalazzo"
      NotificationTags:
        | "eventComments"
        | "userRegistration"
        | "paymentRequest"
        | "paymentPending"
      PaymentState: "Open" | "Fulfilled"
      Permissions:
        | "use;drink"
        | "edit;drink"
        | "delete;drink"
        | "view;drink"
        | "use;training"
        | "edit;training"
        | "delete;training"
        | "view;training"
        | "edit;groups"
        | "delete;groups"
        | "view;groups"
        | "edit;payments"
        | "edit;user"
        | "view;keyFinder"
        | "use;user"
        | "view;user"
        | "delete;user"
        | "edit;keyFinder"
        | "delete;keyFinder"
        | "view;notifications"
        | "edit;notifications"
        | "edit;history"
        | "edit;edgeFunctions"
        | "use;challenges"
        | "view;challenges"
      ProductType: "Drink" | "Special" | "None"
      UserRole: "user" | "admin" | "procure" | "finance" | "trainer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: {
          bucketid: string
          name: string
          owner: string
          metadata: Json
        }
        Returns: undefined
      }
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: unknown
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

