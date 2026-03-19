import { fetchGroupWithUsers } from '@/repository/AdminUsersRepository';
import { fetchChallengeWithGroup } from '@/repository/ChallengeRepository';
import { fetchFullHistory } from '@/repository/DrinkRepository';
import { fetchEvents } from '@/repository/EventRepository';
import { fetchMatch } from '@/repository/GamesRepository';
import { fetchItemHistory, fetchItems } from '@/repository/KeysRepository';
import { fetchGroups, fetchSimpleUser } from '@/repository/UserRepository';
import { fetchFullEventPledges } from '@/tanstack/events';
import { Database, Enums } from '@/types/supabase-generated.types';
import { GamesTable } from '@/types/supabaseTypes';
import { QueryData } from '@supabase/supabase-js';
import { Tables, TablesInsert, TablesUpdate } from 'src/types/helpers';

export type EventTable = Tables<'events'>;
export type History = Tables<'history'>;
export type Notification = Tables<'notifications', 'notifications'>;

export type NonNullableFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>;
};

declare global {
  type Challenge = Tables<'challenge'>;
  type ChallengeStats = Tables<'challenge_stats'>;
  type ChallengeStatsMeta = Tables<'challenge_stats_meta'>;
  type Drink = Tables<'drink'>;
  type Attendance = Tables<'event_attendance_user_mapping'>;
  type GroupUserMapping = Tables<'group_user_mapping'>;
  type EventComment = Tables<'event_comments'>;
  type Group = Tables<'event_group'>;
  type EventsUserViewNullable = Tables<'events_user_view'>;
  type EventGroupsViewNullable = Tables<'event_groups_view'>;
  type BringItems = Tables<'event_bring_items'>;
  type Item = Tables<'items'>;
  type ItemHistory = Tables<'item_history'>;
  type Payment = Tables<'payments'>;
  type User = Tables<'user'>;
  type Voucher = Tables<'vouchers'>;
  type Player = GamesTable<'players'>;
  type PlayerPublic = GamesTable<'players_public'>;
  type LeaderboardEntry = GamesTable<'leaderboard'>;
  type Match = GamesTable<'match'>;
  type MatchSet = GamesTable<'sets'>;
  type Team = GamesTable<'teams'>;
  type PlayerWithSimpleUser = Player & { name: string; id: string; avatarUrl: string | null };
  type Feature = Tables<'features'>;
  type Permission = Tables<'permissions'>;
  type UserDirectGrants = Tables<'user_direct_grants'>;
  type GroupFeatures = Tables<'group_features'>;
  type GroupPermissions = Tables<'group_permissions'>;
  type EventTransformation = Tables<'event_transformations'>;
  type UserMatchesView = GamesTable<'user_matches'>;

  type FullItemHolder = QueryData<ReturnType<typeof fetchItems>> extends Array<infer U> ? U : never;
  type FullItemHistory = QueryData<ReturnType<typeof fetchItemHistory>> extends Array<infer U> ? U : never;

  type ChallengeWithFullGroup = QueryData<ReturnType<typeof fetchChallengeWithGroup>> extends Array<infer U> ? U : never;
  type GroupWithUsers = QueryData<ReturnType<typeof fetchGroupWithUsers>> extends Array<infer U> ? U : never;
  type FullHistory = QueryData<ReturnType<typeof fetchFullHistory>> extends Array<infer U> ? U : never;
  type SimpleUser = QueryData<ReturnType<typeof fetchSimpleUser>> extends Array<infer U> ? U : never;
  type Groups = QueryData<ReturnType<typeof fetchGroups>> extends Array<infer U> ? U : never;
  type FullEvent = QueryData<ReturnType<typeof fetchEvents>> extends Array<infer U> ? U : never;
  type FullMatch = QueryData<ReturnType<typeof fetchMatch>> extends Array<infer U> ? U : never;
  type FullEventPledges = QueryData<ReturnType<typeof fetchFullEventPledges>> extends Array<infer U> ? U : never;

  type PaymentInsert = TablesInsert<'payments'>;
  type EventCommentInsert = TablesInsert<'event_comments'>;
  type NotificationInsert = TablesInsert<'notifications', 'notifications'>;

  type ItemUpdate = TablesUpdate<'items'>;
  type NotificationUpdate = TablesUpdate<'notifications', 'notifications'>;
  type EventCommentUpdate = TablesUpdate<'event_comments'>;
  type UserUpdate = TablesUpdate<'user'>;

  type ProductType = Enums<'ProductType'>;
  type EventAttendance = Enums<'EventAttendance'>;
  type EventRecurrence = Enums<'EventRecurrence'>;
  type PaymentState = Enums<'PaymentState'>;
  type ItemType = Enums<'ItemType'>;
  type UserRole = Enums<'UserRole'>;
  type GroupRole = Enums<'GroupRole'>;

  type PublicFunctions = Database["public"]["Functions"];
  type RpcName = keyof PublicFunctions & string;
}

export { };
