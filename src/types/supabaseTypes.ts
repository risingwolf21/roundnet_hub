import { Database } from "./supabase";

export type Drink = Database["public"]["Tables"]["drink"]["Row"];
export type Attendance = Database["public"]["Tables"]["event_attendance_user_mapping"]["Row"];
export type Comment = Database["public"]["Tables"]["event_comments"]["Row"];
export type Group = Database["public"]["Tables"]["event_group"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type History = Database["public"]["Tables"]["history"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type User = Database["public"]["Tables"]["user"]["Row"];

export type FullHistory = History & {
    drink: Drink,
    drinkId: string,
    user: User
}

export type PaymentHistory = History & {
    payment: Payment,
    drink: Drink
}

export type FullEvent = Event & {
    comments: Comment[],
    attendance: Attendance[]
}

export type EventAttendance = Database["public"]["Enums"]["EventAttendance"];
export type EventRecurrence = Database["public"]["Enums"]["EventRecurrence"];
export type PaymentState = Database["public"]["Enums"]["PaymentState"];
export type UserRole = Database["public"]["Enums"]["UserRole"];