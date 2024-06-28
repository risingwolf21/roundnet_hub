import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {Group, User, UserWithGroups} from "src/types/supabaseTypes";
import {supabase} from "../components/services/supabase/supabaseClient";
import {TABLE_PAYMENTS, TABLE_USER} from "src/constants";
import {UserEdited} from "src/components/admin/EditUserDialog";

export const AdminUsersRepository = {
    async removeUsersFromGroup(group: Group, users: User[]): Promise<PostgrestSingleResponse<null>> {
        return supabase
            .from("group_user_mapping")
            .delete()
            .eq("group", group.id)
            .in("user", users.map(x => x.userId))
            .throwOnError()
    },
    async fetchSingleGroupWithUsers(groupId: number): Promise<PostgrestSingleResponse<any>> {
        return supabase.from("event_group")
            .select("*, users: group_user_mapping ( user (*) )")
            .eq("id", groupId)
            .single()
            .throwOnError();
    },

    async deactivateUser(user: User): Promise<void> {
        await supabase
            .from(TABLE_PAYMENTS)
            .update({ paymentState: "Fulfilled" })
            .eq("userId", user.userId);

        await supabase
            .from(TABLE_USER)
            .update({ verified: false })
            .eq("userId", user.userId);
    },

    async updateUser(user: UserEdited): Promise<PostgrestSingleResponse<null>> {
        const result = await supabase.auth.admin.updateUserById(
            user.userId,
            {user_metadata: {displayName: user.displayName, verified: user.verified}}
        );
        if (result.error) {
            throw result.error;
        }
        return supabase
            .from(TABLE_USER)
            .update({displayName: user.displayName, verified: user.verified, permissions: user.permissions})
            .eq("userId", user.userId);
    },

    async fetchNotVerifiedUsers(): Promise<PostgrestSingleResponse<User[]>> {
        return supabase.from(TABLE_USER)
            .select("*")
            .eq("verified", false)
            .returns<User[]>()
            .throwOnError();
    },

    async fetchAllUsersWithGroups(): Promise<PostgrestSingleResponse<UserWithGroups[]>> {
        return supabase
            .from(TABLE_USER)
            .select("*, groups: group_user_mapping ( group: event_group ( * ) )")
            .order("displayName", { ascending: true })
            .returns<UserWithGroups[]>()
            .throwOnError();
    },

    async addUsersToGroup(group: Group, users: User[]): Promise<PostgrestSingleResponse<null>> {
        return supabase
            .from("group_user_mapping")
            .upsert(users.map(x => {
                return {
                    user: x.userId,
                    group: group.id
                }
            }))
            .throwOnError();
    }
}