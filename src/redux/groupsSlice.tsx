import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { GroupWithUsers } from "../types/supabaseTypes";
import { SupabaseClient } from "@supabase/supabase-js";

type GroupSliceState = {
    groups: GroupWithUsers[],
    loading: boolean,
    error: string | null
}

const initialState = {
    groups: [],
    loading: false,
    error: null
} as GroupSliceState;

const groupsSlice = createSlice({
    name: "groups",
    initialState,
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(fetchGroupsAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchGroupsAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;

                state.groups = action.payload;
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

                let index = state.groups.findIndex(x => x.id === action.payload.id);
                if (index !== -1) {
                    state.groups = [
                        ...state.groups.slice(0, index),
                        action.payload.data,
                        ...state.groups.slice(index + 1)
                    ]
                } else {
                    state.groups = [...state.groups, action.payload.data];
                }
            })
    }
});

export const fetchGroupsAsync = createAsyncThunk("fetchGroupsAsync", async ({ client }: { client: SupabaseClient }) => {
    const response = await client.from("event_group")
        .select("*, users: group_user_mapping ( user ( userId, email, displayName ) )");

    return response.data?.map(x => { return { ...x, users: x.users.map((y: any) => y.user) } as GroupWithUsers }) ?? [];
});

export const fetchSingleGroupAsync = createAsyncThunk("fetchSingleGroupAsync", async ({ client, id }: { client: SupabaseClient, id: number }) => {
    const response = await client.from("event_group")
        .select("*, users: group_user_mapping ( user ( userId, email, displayName ) )")
        .eq("id", id)
        .single();

    return {
        data: {
            ...response.data,
            users: response.data.map((x: any) => x.user)
        } as GroupWithUsers,
        id
    }
});

export default groupsSlice.reducer;