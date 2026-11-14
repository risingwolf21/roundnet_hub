import { isAfter, isBefore } from 'date-fns';
import { EventTable, History } from 'types/supabase';
import { Tables } from './helpers';
import { Database, Enums } from './supabase-generated.types';

export type FullChallenge = Challenge & {
  stats: ChallengeStatWithUser[];
  group: GroupWithUsers;
};

export type ChallengeStatWithUser = ChallengeStats & {
  fullUser: User;
  meta: ChallengeStatsMeta | null;
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

export type EventWithGroup = EventTable & {
  fullGroup: Group;
};

/** Members (incl. trials) of the event's group; anyone else only views it (event of a subgroup of their group). */
export const isMemberOfEventGroup = (x: Pick<EventsUserView, 'user_group_role'>) =>
  x.user_group_role === 'user' || x.user_group_role === 'admin' || x.user_group_role === 'trial';

export function answerDeadlineExpired(x: EventsUserView) {
  if (!x.answerDeadline) return false;
  return isBefore(x.answerDeadline, Date.now());
}

/** Attendance is not open yet: the event defines a start of the answer period that is still ahead. */
export function answerNotOpenYet(x: Pick<EventsUserView, 'answerStart'>) {
  if (!x.answerStart) return false;
  return isAfter(x.answerStart, Date.now());
}

export function eventInThePast(x: EventsUserView | EventWithGroup) {
  return isBefore(x.endDateTime !== null ? x.endDateTime : x.startingDateTime!, Date.now());
}

export function eventHasStarted(x: EventsUserView | EventWithGroup) {
  return isBefore(x.startingDateTime!, Date.now());
}

export function maxAttendeesExceeded(x: EventsUserView, attendance: Attendance[]) {
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
  replies: FullComment[];
};

export type UserWithGroups = User & {
  groups: Group[];
};

export type GroupWithUserRole = Group & {
  user_role: Enums<'GroupRole'>;
};

export type FullUserMapping = {
  user: User;
  map: GroupUserMapping;
};

export type GroupWithUserMappings = Group & {
  user_group_role: GroupRole | null;
  users: FullUserMapping[];
};

export type FullGroupFeature = Tables<'group_features'> & {
  fullGroup: Group;
};

export type EventsUserView = {
  answerDeadline: string | null;
  answerStart: string | null;
  attending_count: number | null;
  created_at: string;
  declined_count: number | null;
  description: string;
  endDateTime: string;
  id: string;
  isCancelled: boolean;
  key: string;
  maxAttendees: number | null;
  max_trial_attendees: number | null;
  meetingDateTime: string | null;
  place: string | null;
  recurrence: Database['public']['Enums']['EventRecurrence'];
  recurrenceEnd: string | null;
  required_item: Database['public']['Enums']['ItemType'] | null;
  startingDateTime: string;
  title: string;
  group: Group | null;
  user_state: Database['public']['Enums']['EventAttendance'] | null;
  user_group_role: GroupRole | null;
  constellations_enabled: boolean;
};

export type EventGroupsView = {
  color: string;
  created_at: string;
  description: string;
  id: string;
  is_public: boolean;
  name: string;
  need_request_to_join: boolean;
  parent_group: string | null;
  visible: boolean;
  role: Database['public']['Enums']['GroupRole'] | null;
};

export type ChallengePointsView = {
  avatarUrl: string | null;
  challenge: string;
  displayName: string;
  total_points: number;
  user: string;
};

type Modify<T, R> = Omit<T, keyof R> & R;

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;
type GamesSchema = Database[Extract<keyof Database, 'games'>];

export type GamesTable<
  DefaultSchemaTableNameOrOptions extends
  | keyof (GamesSchema['Tables'] & GamesSchema['Views'])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (GamesSchema['Tables'] & GamesSchema['Views'])
  ? (GamesSchema['Tables'] & GamesSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
    Row: infer R;
  }
  ? R
  : never
  : never;

export type GamesTableUpdate<
  DefaultSchemaTableNameOrOptions extends keyof GamesSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Update: infer U;
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof GamesSchema['Tables']
  ? GamesSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U;
  }
  ? U
  : never
  : never;
