import { QueryData } from '@supabase/supabase-js';
import { fetchRolePermissionMapping } from 'src/repository/AdminPermissionsRepository';
import { fetchGroupWithUsers } from 'src/repository/AdminUsersRepository';
import { fetchDrinksToPay, fetchFullHistory } from 'src/repository/DrinkRepository';
import { fetchEvents } from 'src/repository/EventRepository';
import { fetchMatch, fetchUserMatches } from 'src/repository/GamesRepository';
import { fetchGroups, fetchSimpleUser, fetchUserWithGroups } from 'src/repository/UserRepository';
import { GamesTable, PermissionsTable } from 'src/types/supabaseTypes';
import { Enums, Tables, TablesInsert, TablesUpdate } from '../../src/types/supabase-generated.types';
import { fetchChallengeWithGroup } from 'src/repository/ChallengeRepository';
import { fetchItemHistory, fetchItems } from 'src/repository/KeysRepository';

export type EventTable = Tables<'events'>;
export type History = Tables<'history'>;
export type Notification = Tables<'notifications'>;

export type NonNullableFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>;
};

declare global {
  type Challenge = Tables<'challenge'>;
  type ChallengeStats = Tables<'challenge_stats'>;
  type Drink = Tables<'drink'>;
  type Attendance = Tables<'event_attendance_user_mapping'>;
  type GroupUserMapping = Tables<'group_user_mapping'>;
  type EventComment = Tables<'event_comments'>;
  type Group = Tables<'event_group'>;
  type EventsUserViewNullable = Tables<'events_user_view'>;
  type Item = Tables<'items'>;
  type ItemHistory = Tables<'item_history'>;
  type Payment = Tables<'payments'>;
  type User = Tables<'user'>;
  type Voucher = Tables<'vouchers'>;
  type RolePermissions = PermissionsTable<'role_permissions'>;
  type UserRoles = PermissionsTable<'user_roles'>;
  type AppPermission = PermissionsTable<'app_permissions'>;
  type AppRole = PermissionsTable<'app_roles'>;
  type Player = GamesTable<'players'>;
  type Match = GamesTable<'match'>;
  type MatchSet = GamesTable<'sets'>;
  type Team = GamesTable<'teams'>;
  type CalendarSettings = Tables<'user_calender_settings'>;
  type PlayerWithSimpleUser = Player & { name: string; userId: string };

  type FullItemHolder = QueryData<ReturnType<typeof fetchItems>> extends Array<infer U> ? U : never;
  type FullItemHistory = QueryData<ReturnType<typeof fetchItemHistory>> extends Array<infer U> ? U : never;

  type ChallengeWithFullGroup = QueryData<ReturnType<typeof fetchChallengeWithGroup>> extends Array<infer U> ? U : never;
  type GroupWithUsers = QueryData<ReturnType<typeof fetchGroupWithUsers>> extends Array<infer U> ? U : never;
  type FullHistory = QueryData<ReturnType<typeof fetchFullHistory>> extends Array<infer U> ? U : never;
  type SimpleUser = QueryData<ReturnType<typeof fetchSimpleUser>> extends Array<infer U> ? U : never;
  type OpenDrinksForUser = QueryData<ReturnType<typeof fetchDrinksToPay>> extends Array<infer U> ? U : never;
  type RolePermissionMapping =
    QueryData<ReturnType<typeof fetchRolePermissionMapping>> extends Array<infer U> ? U : never;
  type Groups = QueryData<ReturnType<typeof fetchGroups>> extends Array<infer U> ? U : never;
  type FullEvent = QueryData<ReturnType<typeof fetchEvents>> extends Array<infer U> ? U : never;
  type FullUserMatch = QueryData<ReturnType<typeof fetchUserMatches>> extends Array<infer U> ? U : never;
  type FullMatch = QueryData<ReturnType<typeof fetchMatch>> extends Array<infer U> ? U : never;
  type UserWithGroupsBase = QueryData<ReturnType<typeof fetchUserWithGroups>> extends Array<infer U> ? U : never;
  type UserWithGroupsAndPlayerData = {
    [P in keyof UserWithGroupsBase]: P extends 'groups'
    ? UserWithGroupsBase['groups'][number]['group'][]
    : UserWithGroupsBase[P];
  } & { player_data: Player | null };

  type PaymentInsert = TablesInsert<'payments'>;
  type EventCommentInsert = TablesInsert<'event_comments'>;
  type NotificationInsert = TablesInsert<'notifications'>;

  type ItemUpdate = TablesUpdate<'items'>;
  type NotificationUpdate = TablesUpdate<'notifications'>;
  type EventCommentUpdate = TablesUpdate<'event_comments'>;
  type UserUpdate = TablesUpdate<'user'>;

  type NotificationTags = Enums<'NotificationTags'>;
  type ProductType = Enums<'ProductType'>;
  type EventAttendance = Enums<'EventAttendance'>;
  type EventRecurrence = Enums<'EventRecurrence'>;
  type PaymentState = Enums<'PaymentState'>;
  type ItemType = Enums<'ItemType'>;
  type UserRole = Enums<'UserRole'>;
  type GroupRole = Enums<'GroupRole'>;
}

export { };
