import {PostgrestError, PostgrestSingleResponse} from "@supabase/supabase-js";
import {UserWithGroups} from "../types/supabaseTypes";
import {supabase} from "../components/services/supabase/supabaseClient";
import {Notification} from "types/supabase"

export const SupabaseUserRepository = {
    async fetchUserWithGroups(userId: string): Promise<PostgrestSingleResponse<UserWithGroups>> {
        const response = await supabase
            .from("user")
            .select("*, groups: group_user_mapping ( group: event_group ( * ) )")
            .eq("userId", userId)
            .single();

        if (!response.data)
            return {
                error: {
                    code: "",
                    details: "",
                    hint: "",
                    message: "Could not map groups for User"
                } as PostgrestError, data: null, count: null, status: 400, statusText: ""
            };

        return {
            ...response,
            data: {
                ...response.data,
                groups: response.data?.groups.map((x: any) => x.group) ?? [],
                roles: []
            }
        }
    },

    async fetchUser(userId: string): Promise<PostgrestSingleResponse<User>> {
        return supabase
            .from("user")
            .select("*")
            .eq("userId", userId)
            .single();
    },

    async updateNotificationTags(notificationTags: NotificationTags[], user: User): Promise<PostgrestSingleResponse<User>> {
        return supabase
            .from("user")
            .update({notifications: notificationTags})
            .eq("userId", user.userId)
            .select()
            .single();
    },

    async updateFCMToken(fcmToken: string, user: User): Promise<PostgrestSingleResponse<any>> {
        return supabase
            .from("user")
            .update({fcm_token: fcmToken})
            .eq("userId", user.userId);
    },

    async loadNotifications(user: User): Promise<PostgrestSingleResponse<Notification[]>> {
        return supabase
            .from("notifications")
            .select("*")
            .eq("user", user.userId)
            .throwOnError()
            .returns<Notification[]>()
    },
    async markNotificationsAsRead(user: User): Promise<PostgrestSingleResponse<null>> {
        return supabase
            .from("notifications")
            .delete()
            .eq("user", user.userId)
    }
}