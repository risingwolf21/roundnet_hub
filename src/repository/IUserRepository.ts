import {PostgrestError, PostgrestSingleResponse} from "@supabase/supabase-js";
import {NotificationTags, User, UserWithGroups} from "src/types/supabaseTypes";
import {SupabaseRepository} from "./Repository";

export interface IUserRepository {
    updateNotificationTags(notificationTags: NotificationTags[], user: User): Promise<PostgrestSingleResponse<null>>

    fetchUser(userId: string): Promise<PostgrestSingleResponse<User>>

    fetchUserWithGroups(userId: string): Promise<PostgrestSingleResponse<UserWithGroups>>
}

export class SupabaseUserRepository extends SupabaseRepository implements IUserRepository {
    async fetchUserWithGroups(userId: string): Promise<PostgrestSingleResponse<UserWithGroups>> {
        const response = await this.client
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
                groups: response.data?.groups.map((x: any) => x.group) ?? []
            }
        }
    }

    async fetchUser(userId: string): Promise<PostgrestSingleResponse<User>> {
        return this.client
            .from("user")
            .select("*")
            .eq("userId", userId)
            .single();
    }

    async updateNotificationTags(notificationTags: NotificationTags[], user: User): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from("user")
            .update({notifications: notificationTags})
            .eq("userId", user.userId);
    }

}