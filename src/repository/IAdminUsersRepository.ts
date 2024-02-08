import { PostgrestSingleResponse } from "@supabase/supabase-js";
import { injectable } from "inversify";
import { Group, GroupWithUsers, User, UserWithGroups } from "src/types/supabaseTypes";
import { SupabaseRepository } from "./Repository";
import { TABLE_PAYMENTS, TABLE_USER } from "src/constants";
import { UserEdited } from "src/components/admin/EditUserDialog";

export interface IAdminUsersRepository {
    addUsersToGroup(group: Group, users: User[]): Promise<PostgrestSingleResponse<null>>
    removeUsersFromGroup(group: Group, users: User[]): Promise<PostgrestSingleResponse<null>>
    fetchAllUsersWithGroups(): Promise<PostgrestSingleResponse<any>>
    fetchSingleGroupWithUsers(groupId: number): Promise<PostgrestSingleResponse<any>>
    fetchNotVerifiedUsers(): Promise<PostgrestSingleResponse<User[]>>
    updateUser(user: UserEdited): Promise<PostgrestSingleResponse<null>>
    deactivateUser(user: User): Promise<void>
}

@injectable()
export class SupabaseAdminUsersRepository extends SupabaseRepository implements IAdminUsersRepository {
    async removeUsersFromGroup(group: Group, users: User[]): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from("group_user_mapping")
            .delete()
            .eq("group", group.id)
            .in("user", users.map(x => x.userId))
    }
    async fetchSingleGroupWithUsers(groupId: number): Promise<PostgrestSingleResponse<any>> {
        return this.client.from("event_group")
            .select("*, users: group_user_mapping ( user (*) )")
            .eq("id", groupId)
            .single();
    }

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
            .update({ displayName: user.displayName, role: user.role, verified: user.verified, permissions: user.permissions })
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
            .order("displayName", { ascending: true })
            .returns<UserWithGroups[]>()
    }

    async addUsersToGroup(group: Group, users: User[]): Promise<PostgrestSingleResponse<null>> {
        return this.client
            .from("group_user_mapping")
            .upsert(users.map(x => {
                return {
                    user: x.userId,
                    group: group.id
                }
            }));
    }
}

export class EmptyAdminUsersRepository implements IAdminUsersRepository {
    removeUsersFromGroup(group: Group, users: User[]): Promise<PostgrestSingleResponse<null>> {
        return Promise.resolve({} as PostgrestSingleResponse<null>);
    }
    fetchSingleGroupWithUsers(groupId: number): Promise<PostgrestSingleResponse<GroupWithUsers>> {
        return Promise.resolve({} as PostgrestSingleResponse<GroupWithUsers>);
    }

    addUsersToGroup(group: Group, users: User[]): Promise<PostgrestSingleResponse<null>> {
        return Promise.resolve({} as PostgrestSingleResponse<null>);
    }
    fetchAllUsersWithGroups(): Promise<PostgrestSingleResponse<UserWithGroups[]>> {
        return Promise.resolve({} as PostgrestSingleResponse<UserWithGroups[]>)
    }
    async fetchNotVerifiedUsers(): Promise<PostgrestSingleResponse<User[]>> {
        return Promise.resolve({} as PostgrestSingleResponse<User[]>);
    }
    updateUser(user: UserEdited): Promise<PostgrestSingleResponse<null>> {
        return Promise.resolve({} as PostgrestSingleResponse<null>);
    }
    deactivateUser(user: User): Promise<void> {
        return Promise.resolve();
    }

}