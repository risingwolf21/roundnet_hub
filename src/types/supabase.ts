export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Drink = Database["public"]["Tables"]["drink"]["Row"];
export type Attendance = Database["public"]["Tables"]["event_attendance_user_mapping"]["Row"];
export type Comment = Database["public"]["Tables"]["event_comments"]["Row"];
export type Group = Database["public"]["Tables"]["event_group"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type History = Database["public"]["Tables"]["history"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type User = Database["public"]["Tables"]["user"]["Row"];

export type FullEvent = Event & {
  comments: Comment[],
  attendance: Attendance[]
}

export interface Database {
  public: {
    Tables: {
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
        }
        Relationships: []
      }
      event_attendance_user_mapping: {
        Row: {
          created_at: string | null
          event: number
          state: string
          user: string
        }
        Insert: {
          created_at?: string | null
          event: number
          state?: string
          user: string
        }
        Update: {
          created_at?: string | null
          event?: number
          state?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_user_mapping_event_fkey"
            columns: ["event"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_user_mapping_event_fkey"
            columns: ["event"]
            referencedRelation: "distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_user_mapping_user_fkey"
            columns: ["user"]
            referencedRelation: "user"
            referencedColumns: ["userId"]
          }
        ]
      }
      event_comments: {
        Row: {
          comment: string | null
          created_at: string
          displayName: string | null
          event: number
          id: number
          user: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          displayName?: string | null
          event: number
          id?: number
          user: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          displayName?: string | null
          event?: number
          id?: number
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_fkey"
            columns: ["event"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_event_fkey"
            columns: ["event"]
            referencedRelation: "distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_user_fkey"
            columns: ["user"]
            referencedRelation: "user"
            referencedColumns: ["userId"]
          }
        ]
      }
      event_group: {
        Row: {
          color: string
          created_at: string | null
          description: string | null
          id: number
          name: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          description: string | null
          end_at: string | null
          id: number
          isCancelled: boolean
          key: string
          meetingDateTime: string | null
          place: Json | null
          recurring: string | null
          startingDateTime: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: number
          isCancelled?: boolean
          key?: string
          meetingDateTime?: string | null
          place?: Json | null
          recurring?: string | null
          startingDateTime?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_at?: string | null
          id?: number
          isCancelled?: boolean
          key?: string
          meetingDateTime?: string | null
          place?: Json | null
          recurring?: string | null
          startingDateTime?: string | null
          title?: string | null
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
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_event_mapping_event_fkey"
            columns: ["event"]
            referencedRelation: "distinct_event"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_event_mapping_group_fkey"
            columns: ["group"]
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
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_subgroup_mapping_sub_group_fkey"
            columns: ["sub_group"]
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
            referencedRelation: "event_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_user_mapping_user_fkey"
            columns: ["user"]
            referencedRelation: "user"
            referencedColumns: ["userId"]
          }
        ]
      }
      history: {
        Row: {
          amount: number | null
          count: number | null
          created_at: string | null
          drink: number | null
          id: number
          payment: number | null
          user: string | null
        }
        Insert: {
          amount?: number | null
          count?: number | null
          created_at?: string | null
          drink?: number | null
          id?: number
          payment?: number | null
          user?: string | null
        }
        Update: {
          amount?: number | null
          count?: number | null
          created_at?: string | null
          drink?: number | null
          id?: number
          payment?: number | null
          user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "history_drink_fkey"
            columns: ["drink"]
            referencedRelation: "drink"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_payment_fkey"
            columns: ["payment"]
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_user_fkey"
            columns: ["user"]
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
          state: string
          userId: string | null
        }
        Insert: {
          amountToPay?: number
          created_at?: string | null
          id?: number
          state?: string
          userId?: string | null
        }
        Update: {
          amountToPay?: number
          created_at?: string | null
          id?: number
          state?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_userId_fkey"
            columns: ["userId"]
            referencedRelation: "user"
            referencedColumns: ["userId"]
          }
        ]
      }
      user: {
        Row: {
          created_at: string | null
          displayName: string | null
          email: string | null
          role: string
          userId: string
          verified: boolean
        }
        Insert: {
          created_at?: string | null
          displayName?: string | null
          email?: string | null
          role?: string
          userId?: string
          verified?: boolean
        }
        Update: {
          created_at?: string | null
          displayName?: string | null
          email?: string | null
          role?: string
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
          recurring: string | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
