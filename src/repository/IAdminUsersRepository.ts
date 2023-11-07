import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { injectable } from "inversify";
import { Group, User, UserWithGroups } from "src/types/supabaseTypes";
import { SupabaseRepository } from "./Repository";
import { TABLE_PAYMENTS, TABLE_USER } from "src/constants";
import { UserEdited } from "src/components/admin/EditUserDialog";

export interface IAdminUsersRepository {
    addUsersToGroup(group: Group, users: User[]): Promise<PostgrestSingleResponse<null>>
    fetchAllUsersWithGroups(): Promise<PostgrestSingleResponse<UserWithGroups[]>>
    fetchNotVerifiedUsers(): Promise<PostgrestSingleResponse<User[]>>
    updateUser(user: UserEdited): Promise<PostgrestSingleResponse<null>>
    deactivateUser(user: User): Promise<void>
}

@injectable()
export class SupabaseAdminUsersRepository extends SupabaseRepository implements IAdminUsersRepository {


    async deactivateUser(user: User): Promise<void> {
        await this.client
            .from(TABLE_PAYMENTS)
            .update({ paymentState: "Fulfilled" })
            .eq("userId", user.userId);

        await this.client
            .from(TABLE_USER)
            .update({ verified: false })
            .eq("userId", user.userId);
    }

    async updateUser(user: UserEdited): Promise<PostgrestSingleResponse<null>> {
        const result = await this.client.auth.admin.updateUserById(
            user.userId,
            { user_metadata: { displayName: user.displayName, role: user.role, verified: user.verified } }
        );
        if (result.error) {
            throw result.error;
        }
        return this.client
            .from(TABLE_USER)
            .update({ displayName: user.displayName, role: user.role, verified: user.verified })
            .eq("userId", user.userId);
    }

    async fetchNotVerifiedUsers(): Promise<PostgrestSingleResponse<User[]>> {
        return this.client.from(TABLE_USER)
            .select("*")
            .eq("verified", false)
            .returns<User[]>();
    }

    async fetchAllUsersWithGroups(): Promise<PostgrestSingleResponse<UserWithGroups[]>> {
        return this.client
            .from(TABLE_USER)
            .select("*, groups: group_user_mapping ( group: event_group ( * ) )")
            .returns<UserWithGroups[]>()
    }

    async addUsersToGroup(group: Group, users: User[]): Promise<PostgrestSingleResponse<null>> {
        throw new Error("Method not implemented.");
    }


}