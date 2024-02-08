import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { NotificationTags, User } from "src/types/supabaseTypes";
import { SupabaseRepository } from "./Repository";

export interface IUserRepository {
    updateNotificationTags(notificationTags: NotificationTags[], user: User): Promise<PostgrestSingleResponse<null>>
    fetchUser(userId: string): Promise<PostgrestSingleResponse<User>>
}

export class SupabaseUserRepository extends SupabaseRepository implements IUserRepository {
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
            .update({ notifications: notificationTags })
            .eq("userId", user.userId);
    }

}