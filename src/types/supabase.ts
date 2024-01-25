export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      drink: {
        Row: {
          active: boolean
          deleted: boolean
          id: number
          imageUrl: string
          name: string
          previousDrink: number | null
          price: number
          stock: number
          type: Database["public"]["Enums"]["ProductType"]
        }
        Insert: {
          active?: boolean
          deleted?: boolean
          id?: number
          imageUrl?: string
          name: string
          previousDrink?: number | null
          price?: number
          stock?: number
          type?: Database["public"]["Enums"]["ProductType"]
        }
        Update: {
          active?: boolean
          deleted?: boolean
          id?: number
          imageUrl?: string
          name?: string
          previousDrink?: number | null
          price?: number
          stock?: number
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
          end_at: string | null
          group: number | null
          id: number
          isCancelled: boolean
          key: string
          maxAttendees: number
          meetingDateTime: string | null
          place: string | null
          recurrence: Database["public"]["Enums"]["EventRecurrence"]
          startingDateTime: string
          title: string
        }
        Insert: {
          answerDeadline?: string | null
          created_at?: string
          description?: string
          end_at?: string | null
          group?: number | null
          id?: number
          isCancelled?: boolean
          key?: string
          maxAttendees?: number
          meetingDateTime?: string | null
          place?: string | null
          recurrence?: Database["public"]["Enums"]["EventRecurrence"]
          startingDateTime: string
          title?: string
        }
        Update: {
          answerDeadline?: string | null
          created_at?: string
          description?: string
          end_at?: string | null
          group?: number | null
          id?: number
          isCancelled?: boolean
          key?: string
          maxAttendees?: number
          meetingDateTime?: string | null
          place?: string | null
          recurrence?: Database["public"]["Enums"]["EventRecurrence"]
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
      group_subgroup_mapping: {
        Row: {
          id: number
          main_group: number
          sub_group: number
        }
        Insert: {
          id?: number
          main_group: number
          sub_group: number
        }
        Update: {
          id?: number
          main_group?: number
          sub_group?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_subgroup_mapping_main_group_fkey"
            columns: ["main_group"]
            isOneToOne: false
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_subgroup_mapping_sub_group_fkey"
            columns: ["sub_group"]
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
      key_holders: {
        Row: {
          key: number
          lastUpdate: string | null
          user: string
        }
        Insert: {
          key: number
          lastUpdate?: string | null
          user: string
        }
        Update: {
          key?: number
          lastUpdate?: string | null
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_holders_key_fkey"
            columns: ["key"]
            isOneToOne: false
            referencedRelation: "keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_holders_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          }
        ]
      }
      keys: {
        Row: {
          created_at: string
          id: number
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name?: string | null
        }
        Relationships: []
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
            foreignKeyName: "payments_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["userId"]
          }
        ]
      }
      user: {
        Row: {
          created_at: string | null
          disabled: boolean
          displayName: string
          email: string
          notifications:
            | Database["public"]["Enums"]["NotificationTags"][]
            | null
          permissions: Database["public"]["Enums"]["Permissions"][] | null
          role: Database["public"]["Enums"]["UserRole"]
          userId: string
          verified: boolean
        }
        Insert: {
          created_at?: string | null
          disabled?: boolean
          displayName?: string
          email?: string
          notifications?:
            | Database["public"]["Enums"]["NotificationTags"][]
            | null
          permissions?: Database["public"]["Enums"]["Permissions"][] | null
          role?: Database["public"]["Enums"]["UserRole"]
          userId?: string
          verified?: boolean
        }
        Update: {
          created_at?: string | null
          disabled?: boolean
          displayName?: string
          email?: string
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
      [_ in never]: never
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
    }
    Enums: {
      EventAttendance: "Declined" | "Attending" | "Unanswered" | "Waiting"
      EventRecurrence: "Weekly" | "Fortnightly" | "Monthly" | "None"
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
      ProductType: "Drink" | "Special" | "None"
      UserRole: "user" | "admin" | "procure" | "finance" | "trainer"
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
