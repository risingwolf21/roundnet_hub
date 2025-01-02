import { QueryData } from '@supabase/supabase-js';
import { Database, Enums, Tables, TablesInsert, TablesUpdate } from '../../src/types/supabase-generated.types';
import { fetchDrinksToPay, fetchFullHistory } from 'src/repository/DrinkRepository';
import { fetchRolePermissionMapping } from 'src/repository/AdminPermissionsRepository';
import { fetchGroupWithUsers } from 'src/repository/AdminUsersRepository';
import { fetchGroups } from 'src/repository/UserRepository';

export type Event = Tables<'events'>;
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

  type GroupWithUsersBase = QueryData<typeof fetchGroupWithUsers> extends Array<infer U> ? U : never;
  type FullHistory = QueryData<typeof fetchFullHistory> extends Array<infer U> ? U : never;
  type OpenDrinksForUser = QueryData<typeof fetchDrinksToPay> extends Array<infer U> ? U : never;
  type RolePermissionMapping = QueryData<typeof fetchRolePermissionMapping> extends Array<infer U> ? U : never;
  type Groups = QueryData<typeof fetchGroups> extends Array<infer U> ? U : never;
  type Player = Database['games']['Tables']['players']['Row'];

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

export {};
