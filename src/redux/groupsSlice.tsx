import { createAsyncThunk, createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { GroupWithUsers } from "../types/supabaseTypes";
import { SupabaseClient } from "@supabase/supabase-js";
import { IAdminUsersRepository } from "src/repository/IAdminUsersRepository";
import { RootState } from "./store";

const groupsAdapter = createEntityAdapter({
    selectId: (group: GroupWithUsers) => group.id
});

export const groupsSelector = groupsAdapter.getSelectors((st: RootState) => st.groups);

const groupsSlice = createSlice({
    name: "groups",
    initialState: groupsAdapter.getInitialState({
        loading: false,
        error: null as string | null
    }),
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(fetchGroupsAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchGroupsAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;

                groupsAdapter.setAll(state, action.payload);
            })
            .addCase(fetchGroupsAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message ?? "";
            })

            .addCase(fetchSingleGroupAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;

                if (!action.payload.data)
                    return;

                groupsAdapter.setOne(state, action.payload.data);
            })
    }
});

export const fetchGroupsAsync = createAsyncThunk("fetchGroupsAsync", async ({ client }: { client: SupabaseClient }) => {
    const response = await client.from("event_group")
        .select("*, users: group_user_mapping ( user ( userId, email, displayName ) )");

    return response.data?.map(x => { return { ...x, users: x.users.map((y: any) => y.user) } as GroupWithUsers }) ?? [];
});

export const fetchSingleGroupAsync = createAsyncThunk("fetchSingleGroupAsync", async ({ repository, id }: { repository: IAdminUsersRepository, id: number }) => {
    // returns {id, description, name, color, users: { user:{}[] }
    const response = await repository.fetchSingleGroupWithUsers(id);
    return {
        data: {
            ...response.data,
            users: response.data?.users?.map((x: any) => x.user) ?? []
        } as GroupWithUsers,
        id
    }
});

export default groupsSlice.reducer;