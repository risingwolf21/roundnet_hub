import {Enums, Tables, TablesInsert, TablesUpdate} from "../../src/types/supabase-generated.types";

export type Event = Tables<'events'>;
export type Permissions = Enums<'Permissions'>;
export type History = Tables<'history'>;
export type Notification = Tables<'notifications'>;

declare global {

    type Challenge = Tables<'challenge'>;
    type ChallengeStats = Tables<'challenge_stats'>;
    type Drink = Tables<'drink'>
    type Attendance = Tables<'event_attendance_user_mapping'>
    type EventComment = Tables<'event_comments'>
    type Group = Tables<'event_group'>
    type Item = Tables<'items'>
    type ItemHistory = Tables<'item_history'>
    type Payment = Tables<'payments'>
    type User = Tables<'user'>
    type Voucher = Tables<'vouchers'>

    type PaymentInsert = TablesInsert<'payments'>
    type EventCommentInsert = TablesInsert<'event_comments'>
    type NotificationInsert = TablesInsert<'notifications'>

    type ItemUpdate = TablesUpdate<'items'>
    type NotificationUpdate = TablesUpdate<'notifications'>
    type EventCommentUpdate = TablesUpdate<'event_comments'>

    type NotificationTags = Enums<'NotificationTags'>
    type ProductType = Enums<'ProductType'>
    type EventAttendance = Enums<'EventAttendance'>
    type EventRecurrence = Enums<'EventRecurrence'>
    type PaymentState = Enums<'PaymentState'>
    type ItemType = Enums<'ItemType'>
    type AppRole = Enums<'app_role'>
    type AppPermission = Enums<'app_permission'>

}

export {};