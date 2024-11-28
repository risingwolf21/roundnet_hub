import {isBefore} from "date-fns";
import {Event, History} from "types/supabase";

export type FullChallenge = Challenge & {
    stats: ChallengeStatWithUser[]
}

export type ChallengeStatWithUser = ChallengeStats & {
    user: User
}

export type FullKeyHistory = Modify<ItemHistory, {
    pastUser: User,
    currentUser: User,
    key: Item
}>

export type DrinkCounter = Drink & {
    count: number
}

export type FullItemHolder = Item & {
    current_holder: User,
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
    fullGroup: Group
}

export function answerDeadlineExpired(x: Event) {
    if (!x.answerDeadline)
        return false;
    return isBefore(x.answerDeadline, Date.now());
}

export function eventInThePast(x: Event) {
    return isBefore(x.endDateTime !== null ? x.endDateTime : x.startingDateTime, Date.now());
}

export function maxAttendeesExceeded(x: Event, attendance: Attendance[]) {
    if (!x.maxAttendees)
        return false;
    return attendance.filter(y => y.state === "Attending").length >= x.maxAttendees && x.maxAttendees > 0;
}

export type FullAttendance = Attendance & {
    user: User,
}

export type FullComment = Modify<EventComment, {
    user: User,
    userId: string,
    pending: boolean | null
}>

export type UserWithGroups = User & {
    groups: Group[]
    roles: AppRole[]
}

export type GroupWithUsers = Group & {
    users: User[]
}

export const allAppRoles: AppRole[] = ["admin", "groupModerator", "userModerator", "eventModerator", "eventUser", "drinkModerator", "drinkUser", "challengeModerator", "challengeUser", "itemModerator", "itemUser"]

type Modify<T, R> = Omit<T, keyof R> & R;