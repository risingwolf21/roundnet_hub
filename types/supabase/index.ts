import { QueryData } from '@supabase/supabase-js';
import { Database, Enums, Tables, TablesInsert, TablesUpdate } from '../../src/types/supabase-generated.types';
import { fetchDrinksToPay, fetchFullHistory } from 'src/repository/DrinkRepository';
import { fetchRolePermissionMapping } from 'src/repository/AdminPermissionsRepository';
import { fetchGroupWithUsers } from 'src/repository/AdminUsersRepository';
import { fetchGroups, fetchSimpleUser, fetchUserWithGroups } from 'src/repository/UserRepository';
import { fetchEvents } from 'src/repository/EventRepository';
import { GamesTable } from 'src/types/supabaseTypes';
import { fetchUserMatches } from 'src/repository/GamesRepository';

export type Event = Tables<'events'>;
export type History = Tables<'history'>;
export type Notification = Tables<'notifications'>;

export type NonNullableFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>;
};

export type ResolveProperty<T, K extends keyof T> = T[K] extends Array<infer U>
  ? U extends { [key: string]: any }
  ? { [P in keyof U]: U[P] }
  : T[K]
  : T[K];

declare global {
  type Challenge = Tables<'challenge'>;
  type ChallengeStats = Tables<'challenge_stats'>;
  type Drink = Tables<'drink'>;
  type Attendance = Tables<'event_attendance_user_mapping'>;
  type EventComment = Tables<'event_comments'>;
  type Group = Tables<'event_group'>;
  type Item = Tables<'items'>;
  type ItemHistory = Tables<'item_history'>;
  type Payment = Tables<'payments'>;
  type User = Tables<'user'>;
  type Voucher = Tables<'vouchers'>;
  type RolePermissions = Tables<'role_permissions'>;
  type UserRoles = Tables<'user_roles'>;
  type AppPermission = Tables<'app_permissions'>;
  type AppRole = Tables<'app_roles'>;
  type Player = GamesTable<'players'>;
  type Match = GamesTable<'match'>;
  type MatchSet = GamesTable<'sets'>;
  type Team = GamesTable<'teams'>;
  type FullMatch = GamesTable<"user_matches">;

  type GroupWithUsersBase = QueryData<ReturnType<typeof fetchGroupWithUsers>> extends Array<infer U> ? U : never;
  type FullHistory = QueryData<ReturnType<typeof fetchFullHistory>> extends Array<infer U> ? U : never;
  type SimpleUser = QueryData<ReturnType<typeof fetchSimpleUser>> extends Array<infer U> ? U : never;
  type OpenDrinksForUser = QueryData<ReturnType<typeof fetchDrinksToPay>> extends Array<infer U> ? U : never;
  type RolePermissionMapping = QueryData<ReturnType<typeof fetchRolePermissionMapping>> extends Array<infer U> ? U : never;
  type Groups = QueryData<ReturnType<typeof fetchGroups>> extends Array<infer U> ? U : never;
  type FullEvent = QueryData<ReturnType<typeof fetchEvents>> extends Array<infer U> ? U : never;
  type FullUserMatch = QueryData<ReturnType<typeof fetchUserMatches>> extends Array<infer U> ? U : never;
  type UserWithGroupsBase = QueryData<ReturnType<typeof fetchUserWithGroups>> extends Array<infer U> ? U : never;
  type UserWithGroupsAndPlayerData = {
    [P in keyof UserWithGroupsBase]: P extends "groups"
    ? UserWithGroupsBase["groups"][number]["group"][]
    : UserWithGroupsBase[P];
  } & { player_data: Player | null };

  type PaymentInsert = TablesInsert<'payments'>;
  type EventCommentInsert = TablesInsert<'event_comments'>;
  type NotificationInsert = TablesInsert<'notifications'>;

  type ItemUpdate = TablesUpdate<'items'>;
  type NotificationUpdate = TablesUpdate<'notifications'>;
  type EventCommentUpdate = TablesUpdate<'event_comments'>;

  type NotificationTags = Enums<'NotificationTags'>;
  type ProductType = Enums<'ProductType'>;
  type EventAttendance = Enums<'EventAttendance'>;
  type EventRecurrence = Enums<'EventRecurrence'>;
  type PaymentState = Enums<'PaymentState'>;
  type ItemType = Enums<'ItemType'>;
  type UserRole = Enums<'UserRole'>;
}

export { };
