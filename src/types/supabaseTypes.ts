import { isBefore } from "date-fns";
import { Database } from "src/types/supabase";

export type Drink = Database["public"]["Tables"]["drink"]["Row"];
export type DrinkInsert = Database["public"]["Tables"]["drink"]["Insert"];
export type DrinkUpdate = Database["public"]["Tables"]["drink"]["Update"];
export type Attendance = Database["public"]["Tables"]["event_attendance_user_mapping"]["Row"];
export type Comment = Database["public"]["Tables"]["event_comments"]["Row"];
export type Group = Database["public"]["Tables"]["event_group"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type History = Database["public"]["Tables"]["history"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type User = Database["public"]["Tables"]["user"]["Row"];
export type KeyHolder = Database["public"]["Tables"]["key_holders"]["Row"];
export type Key = Database["public"]["Tables"]["keys"]["Row"];
export type KeyInsert = Database["public"]["Tables"]["keys"]["Insert"];

export type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
export type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

export type EventAttendanceInsert = Database["public"]["Tables"]["event_attendance_user_mapping"]["Insert"];
export type EventAttendanceUpdate = Database["public"]["Tables"]["event_attendance_user_mapping"]["Update"];
export type EventAttendanceMapping = Database["public"]["Tables"]["event_attendance_user_mapping"]["Row"];

export type EventCommentUpdate = Database["public"]["Tables"]["event_comments"]["Update"];
export type EventCommentInsert = Database["public"]["Tables"]["event_comments"]["Insert"];

export type EdgeFunctions = keyof Database["public"]["Functions"]

export type NotificationTags = Database["public"]["Enums"]["NotificationTags"]

export type DrinkCounter = Drink & {
    count: number
}

export type FullKeyHolder = {
    user: User,
    key: Key,
    lastUpdate: string | null
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
    fullGroup: Group
}

export function answerDeadlineExpired<EventType extends Event>(x: EventType) {
    if (!x.answerDeadline)
        return false;
    return isBefore(x.answerDeadline, Date.now());
}

export function maxAttendeesExceeded<EventType extends Event, AttendanceType extends Attendance>(x: EventType, attendance: AttendanceType[]) {
    return attendance.filter(y => y.state === "Attending").length >= x.maxAttendees && x.maxAttendees > 0;
}

export type FullAttendance = Attendance & {
    user: User,
    userId: string
}

export type SimpleUser = {
    displayName: string,
    userId: string,
    avatarUrl: string | null,
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
    users: User[]
}

export type ProductType = Database["public"]["Enums"]["ProductType"];
export type EventAttendance = Database["public"]["Enums"]["EventAttendance"];
export type EventRecurrence = Database["public"]["Enums"]["EventRecurrence"];
export type PaymentState = Database["public"]["Enums"]["PaymentState"];
export type UserRole = Database["public"]["Enums"]["UserRole"];
export type Permissions = Database["public"]["Enums"]["Permissions"];

type Modify<T, R> = Omit<T, keyof R> & R;