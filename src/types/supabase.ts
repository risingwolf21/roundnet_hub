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
        }
        Relationships: []
      }
      event_attendance_user_mapping: {
        Row: {
          created_at: string
          event: number
          state: Database["public"]["Enums"]["EventAttendance"]
          user: string
        }
        Insert: {
          created_at?: string
          event: number
          state?: Database["public"]["Enums"]["EventAttendance"]
          user: string
        }
        Update: {
          created_at?: string
          event?: number
          state?: Database["public"]["Enums"]["EventAttendance"]
          user?: string
        }
        Relationships: [
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
          created_at: string
          description: string
          end_at: string | null
          id: number
          isCancelled: boolean
          key: string
          meetingDateTime: string | null
          place: Json | null
          recurrence: Database["public"]["Enums"]["EventRecurrence"]
          startingDateTime: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          end_at?: string | null
          id?: number
          isCancelled?: boolean
          key?: string
          meetingDateTime?: string | null
          place?: Json | null
          recurrence?: Database["public"]["Enums"]["EventRecurrence"]
          startingDateTime: string
          title?: string
        }
        Update: {
          created_at?: string
          description?: string
          end_at?: string | null
          id?: number
          isCancelled?: boolean
          key?: string
          meetingDateTime?: string | null
          place?: Json | null
          recurrence?: Database["public"]["Enums"]["EventRecurrence"]
          startingDateTime?: string
          title?: string
        }
        Relationships: []
      }
      group_event_mapping: {
        Row: {
          event: number
          group: number
        }
        Insert: {
          event: number
          group: number
        }
        Update: {
          event?: number
          group?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_event_mapping_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_event_mapping_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_event_mapping_group_fkey"
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
          displayName: string
          email: string
          role: Database["public"]["Enums"]["UserRole"]
          userId: string
          verified: boolean
        }
        Insert: {
          created_at?: string | null
          displayName?: string
          email?: string
          role?: Database["public"]["Enums"]["UserRole"]
          userId?: string
          verified?: boolean
        }
        Update: {
          created_at?: string | null
          displayName?: string
          email?: string
          role?: Database["public"]["Enums"]["UserRole"]
          userId?: string
          verified?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      distinct_event: {
        Row: {
          created_at: string | null
          description: string | null
          end_at: string | null
          id: number | null
          isCancelled: boolean | null
          key: string | null
          meetingDateTime: string | null
          place: Json | null
          recurrence: Database["public"]["Enums"]["EventRecurrence"] | null
          startingDateTime: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      EventAttendance: "Declined" | "Attending" | "Unanswered"
      EventRecurrence: "Weekly" | "Fortnightly" | "Monthly" | "None"
      PaymentState: "Open" | "Fulfilled"
      UserRole: "user" | "admin" | "procure" | "finance" | "trainer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
