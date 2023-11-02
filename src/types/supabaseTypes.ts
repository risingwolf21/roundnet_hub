import { Database } from "./supabase";

export type Drink = Database["public"]["Tables"]["drink"]["Row"];
export type Attendance = Database["public"]["Tables"]["event_attendance_user_mapping"]["Row"];
export type Comment = Database["public"]["Tables"]["event_comments"]["Row"];
export type Group = Database["public"]["Tables"]["event_group"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type History = Database["public"]["Tables"]["history"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type User = Database["public"]["Tables"]["user"]["Row"];

export type DrinkCounter = Drink & {
    count: number
}

export type FullPayment = Payment & {
    user: User,
    history: History[]
}

export type FullHistory = History & {
    drink: Drink,
    drinkId: string,
    user: User
}

export type PaymentHistory = Modify<History, {
    payment: Payment,
    drink: Drink | null,
    drinkId: string
}>

export type FullEvent = Event & {
    comments: FullComment[],
    attendance: FullAttendance[],
    userAttendance: EventAttendance,
    groups: Group[]
}

export type FullAttendance = Attendance & {
    user: User,
    userId: string
}

export type SimpleUser = {
    displayName: string,
    userId: string,
    email: string | null
}

export type FullComment = Modify<Comment, {
    user: SimpleUser | null,
    userId: string,
    pending: boolean | null
}>

export type UserWithGroups = User & {
    groups: Group[]
}

export type GroupWithUsers = Group & {
    users: SimpleUser[]
}

export type EventAttendance = Database["public"]["Enums"]["EventAttendance"];
export type EventRecurrence = Database["public"]["Enums"]["EventRecurrence"];
export type PaymentState = Database["public"]["Enums"]["PaymentState"];
export type UserRole = Database["public"]["Enums"]["UserRole"];

type Modify<T, R> = Omit<T, keyof R> & R;