import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { User } from "src/types/supabaseTypes";
import { SupabaseRepository } from "./Repository";

export interface IUserRepository {
    updateNotificationTags(notificationTags: string[], user: User): Promise<PostgrestSingleResponse<null>>
}

export class SupabaseUserRepository extends SupabaseRepository implements IUserRepository {
    async updateNotificationTags(notificationTags: string[], user: User): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from("user")
            .update({ notificationTags: notificationTags })
            .eq("userId", user.userId);
    }



}