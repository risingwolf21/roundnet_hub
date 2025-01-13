import { isBefore } from 'date-fns';
import { Event, History } from 'types/supabase';
import { Database } from './supabase-generated.types';

export type FullChallenge = Challenge & {
    stats: ChallengeStatWithUser[];
};

export type ChallengeStatWithUser = ChallengeStats & {
    user: User;
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

export type FullItemHolder = Item & {
    current_holder: User;
    lastUpdate: string | null;
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

export type FullUser = User & {
    groups: Group[];
    roles: AppRole[];
    player_data: Player | null;
};

export type UserWithRoles = User & {
    roles: UserRoles[];
};

export type UserWithRolesAndPermissions = User & {
    roles: AppRole[];
    permissions: AppPermission[];
    player_data: Player | null;
    groups: Group[];
};

export type GroupWithUsers = Group & {
    users: User[];
};

export type Modify<T, R> = Omit<T, keyof R> & R;


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

export type GamesTablesInsert<
    PublicTableNameOrOptions extends
    | keyof GamesSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof GamesSchema["Tables"]
    ? GamesSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type GamesTablesUpdate<
    PublicTableNameOrOptions extends
    | keyof GamesSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof GamesSchema["Tables"]
    ? GamesSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type GamesEnums<
    PublicEnumNameOrOptions extends
    | keyof GamesSchema["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof GamesSchema["Enums"]
    ? GamesSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type GamesCompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof GamesSchema["CompositeTypes"]
    | { schema: keyof Database },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof GamesSchema["CompositeTypes"]
    ? GamesSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
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
    
    export type PermissionsTablesInsert<
        PublicTableNameOrOptions extends
        | keyof PermissionsSchema["Tables"]
        | { schema: keyof Database },
        TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
        ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
        : never = never,
    > = PublicTableNameOrOptions extends { schema: keyof Database }
        ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
            Insert: infer I
        }
        ? I
        : never
        : PublicTableNameOrOptions extends keyof PermissionsSchema["Tables"]
        ? PermissionsSchema["Tables"][PublicTableNameOrOptions] extends {
            Insert: infer I
        }
        ? I
        : never
        : never
    
    export type PermissionsTablesUpdate<
        PublicTableNameOrOptions extends
        | keyof PermissionsSchema["Tables"]
        | { schema: keyof Database },
        TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
        ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
        : never = never,
    > = PublicTableNameOrOptions extends { schema: keyof Database }
        ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
            Update: infer U
        }
        ? U
        : never
        : PublicTableNameOrOptions extends keyof PermissionsSchema["Tables"]
        ? PermissionsSchema["Tables"][PublicTableNameOrOptions] extends {
            Update: infer U
        }
        ? U
        : never
        : never
    
    export type PermissionsEnums<
        PublicEnumNameOrOptions extends
        | keyof PermissionsSchema["Enums"]
        | { schema: keyof Database },
        EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
        ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
        : never = never,
    > = PublicEnumNameOrOptions extends { schema: keyof Database }
        ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
        : PublicEnumNameOrOptions extends keyof PermissionsSchema["Enums"]
        ? PermissionsSchema["Enums"][PublicEnumNameOrOptions]
        : never
    
    export type PermissionsCompositeTypes<
        PublicCompositeTypeNameOrOptions extends
        | keyof PermissionsSchema["CompositeTypes"]
        | { schema: keyof Database },
        CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
            schema: keyof Database
        }
        ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
        : never = never,
    > = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
        ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
        : PublicCompositeTypeNameOrOptions extends keyof PermissionsSchema["CompositeTypes"]
        ? PermissionsSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
        : never
    