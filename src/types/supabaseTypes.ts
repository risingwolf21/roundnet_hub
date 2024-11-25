import {isBefore} from "date-fns";
// @ts-ignore
import {Database} from "src/types/supabase";
import {Tables} from "./supabase-generated.types";

export type Drink = Database["public"]["Tables"]["drink"]["Row"];

export type Attendance = Database["public"]["Tables"]["event_attendance_user_mapping"]["Row"];
export type Comment = Database["public"]["Tables"]["event_comments"]["Row"];
export type Group = Database["public"]["Tables"]["event_group"]["Row"];

export type Event = Database["public"]["Tables"]["events"]["Row"];
export type History = Database["public"]["Tables"]["history"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type User = Database["public"]["Tables"]["user"]["Row"];

export type Item = Database["public"]["Tables"]["items"]["Row"];
export type ItemUpdate = Database["public"]["Tables"]["items"]["Update"];
export type KeyHistory = Database["public"]["Tables"]["key_history"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];
export type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];

export type EventAttendanceMapping = Database["public"]["Tables"]["event_attendance_user_mapping"]["Row"];

export type EventCommentUpdate = Database["public"]["Tables"]["event_comments"]["Update"];
export type EventCommentInsert = Database["public"]["Tables"]["event_comments"]["Insert"];

export type NotificationTags = Database["public"]["Enums"]["NotificationTags"];

export type Challenge = Tables<'challenge'>;
export type ChallengeStats = Tables<'challenge_stats'>;

export type FullChallenge = Challenge & {
    stats: ChallengeStatWithUser[]
}

export type ChallengeStatWithUser = ChallengeStats & {
    user: User
}

export type FullKeyHistory = Modify<KeyHistory, {
    pastUser: User,
    currentUser: User,
    key: Item
}>

export type DrinkCounter = Tables<'drink'> & {
    count: number
}

export type FullItemHolder = Tables<'items'> & {
    current_holder: Tables<'user'>,
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

export type EventWithGroup = Event & {
    group: Group
}

export function answerDeadlineExpired<EventType extends Event>(x: EventType) {
    if (!x.answerDeadline)
        return false;
    return isBefore(x.answerDeadline, Date.now());
}

export function eventInThePast(x: Event) {
    return isBefore(x.endDateTime !== null ? x.endDateTime : x.startingDateTime, Date.now());
}

export function maxAttendeesExceeded<EventType extends Event, AttendanceType extends Attendance>(x: EventType, attendance: AttendanceType[]) {
    if (!x.maxAttendees)
        return false;
    return attendance.filter(y => y.state === "Attending").length >= x.maxAttendees && x.maxAttendees > 0;
}

export type FullAttendance = Tables<'event_attendance_user_mapping'> & {
    user: Tables<'user'>,
}

export type FullComment = Modify<Tables<'event_comments'>, {
    user: Tables<'user'>,
    userId: string,
    pending: boolean | null
}>

export type UserWithGroups = Tables<'user'> & {
    groups: Tables<'event_group'>[]
}

export type GroupWithUsers = Tables<'event_group'> & {
    users: Tables<'user'>[]
}

export type ProductType = Database["public"]["Enums"]["ProductType"];
export type EventAttendance = Database["public"]["Enums"]["EventAttendance"];
export type EventRecurrence = Database["public"]["Enums"]["EventRecurrence"];
export type PaymentState = Database["public"]["Enums"]["PaymentState"];
export type Permissions = Database["public"]["Enums"]["Permissions"];

type Modify<T, R> = Omit<T, keyof R> & R;