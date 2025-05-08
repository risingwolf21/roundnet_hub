import { isBefore } from 'date-fns';
import { Event, History } from 'types/supabase';
import { Database, Enums } from './supabase-generated.types';

export type FullChallenge = Challenge & {
    stats: ChallengeStatWithUser[];
    group: GroupWithUsers
};

export type ChallengeStatWithUser = ChallengeStats & {
    fullUser: User;
};

export type FullKeyHistory = Modify<
    ItemHistory,
    {
        pastUser: User;
        currentUser: User;
        key: Item;
    }
>;

export type DrinkCounter = Drink & {
    count: number;
};

export type FullPayment = Payment & {
    user: User;
    history: History[];
};

export type PaymentHistory = Modify<
    History,
    {
        payment: Payment;
        drink: Drink | null;
        drinkId: string;
    }
>;

export type EventWithGroup = Event & {
    fullGroup: Group;
};

export function answerDeadlineExpired(x: Event) {
    if (!x.answerDeadline) return false;
    return isBefore(x.answerDeadline, Date.now());
}

export function eventInThePast(x: Event) {
    return isBefore(x.endDateTime !== null ? x.endDateTime : x.startingDateTime, Date.now());
}

export function maxAttendeesExceeded(x: Event, attendance: Attendance[]) {
    if (!x.maxAttendees) return false;
    return attendance.filter((y) => y.state === 'Attending').length >= x.maxAttendees && x.maxAttendees > 0;
}

export type FullAttendance = Attendance & {
    user: User;
};

export type FullComment = Modify<
    EventComment,
    {
        user: User;
        userId: string;
        pending: boolean | null;
    }
> & {
    replies: FullComment[]
};

export type UserWithGroups = User & {
    groups: Group[];
};

export type GroupWithUserRole = Group & {
    user_role: Enums<'GroupRole'>
}

export type UserWithRolesAndPermissions = User & {
    roles: AppRole[];
    permissions: AppPermission[];
    player_data: Player | null;
    groups: GroupWithUserRole[];
    calendar_data: CalendarSettings | null;
};

export type FullUserMapping = {
    user: User;
    map: GroupUserMapping
}

export type GroupWithUserMappings = Group & {
    user_group_role: GroupRole | null;
    users: FullUserMapping[];
};

type Modify<T, R> = Omit<T, keyof R> & R;


type GamesSchema = Database[Extract<keyof Database, "games">]

export type GamesTable<
    PublicTableNameOrOptions extends
    | keyof (GamesSchema["Tables"] & GamesSchema["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (GamesSchema["Tables"] &
        GamesSchema["Views"])
    ? (GamesSchema["Tables"] &
        GamesSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

type PermissionsSchema = Database[Extract<keyof Database, "permissions">]

export type PermissionsTable<
    PublicTableNameOrOptions extends
    | keyof (PermissionsSchema["Tables"] & PermissionsSchema["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (PermissionsSchema["Tables"] &
        PermissionsSchema["Views"])
    ? (PermissionsSchema["Tables"] &
        PermissionsSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never