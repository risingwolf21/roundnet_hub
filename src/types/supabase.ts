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
          created_at: string | null
          event: number
          id: number
          state: string
          user: string
        }
        Insert: {
          created_at?: string | null
          event: number
          id?: number
          state?: string
          user: string
        }
        Update: {
          created_at?: string | null
          event?: number
          id?: number
          state?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_user_mapping_event_fkey"
            columns: ["event"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
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
          location: string | null
          meetingDateTime: string | null
          place: Json | null
          recurrence: Database["public"]["Enums"]["EventRecurrence"]
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
          location?: string | null
          meetingDateTime?: string | null
          place?: Json | null
          recurrence?: Database["public"]["Enums"]["EventRecurrence"]
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
          location?: string | null
          meetingDateTime?: string | null
          place?: Json | null
          recurrence?: Database["public"]["Enums"]["EventRecurrence"]
          startingDateTime?: string | null
          title?: string | null
        }
        Relationships: []
      }
      group_event_mapping: {
        Row: {
          event: number
          group: number
          id: number
        }
        Insert: {
          event: number
          group: number
          id?: number
        }
        Update: {
          event?: number
          group?: number
          id?: number
        }
        Relationships: [
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
      group_user_mapping: {
        Row: {
          group: number
          id: number
          user: string
        }
        Insert: {
          group: number
          id?: number
          user: string
        }
        Update: {
          group?: number
          id?: number
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
          amount: number | null
          count: number | null
          created_at: string | null
          drink: number
          id: number
          payment: number
          user: string
        }
        Insert: {
          amount?: number | null
          count?: number | null
          created_at?: string | null
          drink: number
          id?: number
          payment: number
          user: string
        }
        Update: {
          amount?: number | null
          count?: number | null
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
          userId: string | null
        }
        Insert: {
          amountToPay?: number
          created_at?: string | null
          id?: number
          paymentState?: Database["public"]["Enums"]["PaymentState"]
          userId?: string | null
        }
        Update: {
          amountToPay?: number
          created_at?: string | null
          id?: number
          paymentState?: Database["public"]["Enums"]["PaymentState"]
          userId?: string | null
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
          displayName: string | null
          email: string | null
          role: Database["public"]["Enums"]["UserRole"]
          userId: string
          verified: boolean
        }
        Insert: {
          created_at?: string | null
          displayName?: string | null
          email?: string | null
          role?: Database["public"]["Enums"]["UserRole"]
          userId?: string
          verified?: boolean
        }
        Update: {
          created_at?: string | null
          displayName?: string | null
          email?: string | null
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
      increment_payment:
        | {
            Args: {
              amount: number
              rowid: number
            }
            Returns: undefined
          }
        | {
            Args: {
              amount: number
              rowid: string
            }
            Returns: undefined
          }
      increment_stock: {
        Args: {
          amount: number
          rowid: number
        }
        Returns: undefined
      }
      increments:
        | {
            Args: Record<PropertyKey, never>
            Returns: {
              active: boolean
              deleted: boolean
              id: number
              imageUrl: string | null
              name: string | null
              previousDrink: number | null
              price: number | null
              stock: number | null
              type: Database["public"]["Enums"]["ProductType"]
            }[]
          }
        | {
            Args: {
              row_id: number
            }
            Returns: {
              active: boolean
              deleted: boolean
              id: number
              imageUrl: string | null
              name: string | null
              previousDrink: number | null
              price: number | null
              stock: number | null
              type: Database["public"]["Enums"]["ProductType"]
            }[]
          }
    }
    Enums: {
      EventAttendance: "Declined" | "Attending" | "Unanswered"
      EventRecurrence: "Weekly" | "Fortnightly" | "Monthly" | "None"
      PaymentState: "Open" | "Fulfilled"
      ProductType: "Drink" | "Special" | "None"
      UserRole: "user" | "admin" | "procure" | "finance" | "trainer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
