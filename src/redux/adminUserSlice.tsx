import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { User, UserWithGroups } from '../types/supabaseTypes';
import { SupabaseClient } from '@supabase/supabase-js';
import { TABLE_USER } from '../constants';

type AdminUsersSliceState = {
    users: UserWithGroups[],
    loading: boolean,
    error: string | null,
    hasNotVerifiedUsers: boolean
}

const initialState = {
    users: [],
    hasNotVerifiedUsers: false,
    loading: false,
    error: null
} as AdminUsersSliceState;

export const adminUsersSlice = createSlice({
    name: "admin-users",
    initialState,
    reducers: {
        onUserUpdate: (state: AdminUsersSliceState, action) => {
            let index = state.users.findIndex(x => x.userId === action.payload.new.userId);
            if (index !== -1) {
                state.users[index] = Object.assign(state.users[index], action.payload.new);
            }
        },
        onUserDeleted: (state: AdminUsersSliceState, action) => {
            let index = state.users.findIndex(x => x.userId === action.payload.old.userId);
            if (index !== -1) {
                delete state.users[index];
            }
        },
        onUserInserted: (state: AdminUsersSliceState, action) => {
            state.users = [...(state.users ?? []), action.payload.new]
        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchAdminUsersAsync.pending, (state: AdminUsersSliceState, action) => {
                state.loading = true;
            })
            .addCase(fetchAdminUsersAsync.fulfilled, (state: AdminUsersSliceState, action) => {
                state.loading = false;
                state.error = '';
                state.users = action.payload ?? []
            })
            .addCase(fetchAdminUsersAsync.rejected, (state: AdminUsersSliceState, action) => {
                state.loading = false;
                state.error = action.error.message ?? "";
            })

            .addCase(fetchNotVerifiedUsersAsync.fulfilled, (state: AdminUsersSliceState, action) => {
                state.hasNotVerifiedUsers = action.payload.length > 0;
            })
    }
});

export const fetchAdminUsersAsync = createAsyncThunk("fetchAdminUsersAsync", async ({ client }: { client: SupabaseClient }) => {
    const response = await client.from(TABLE_USER)
        .select("*, groups: group_user_mapping ( group: event_group ( * ) )")
        .returns<UserWithGroups[]>();
    return response.data;
});

export const fetchNotVerifiedUsersAsync = createAsyncThunk("fetchNotVerifiedUsersAsync", async ({ client }: { client: SupabaseClient }) => {
    const response = await client.from(TABLE_USER)
        .select("*")
        .eq("verified", false)
        .returns<User[]>();
    return response.data ?? [];
})

export const { onUserDeleted, onUserInserted, onUserUpdate } = adminUsersSlice.actions;

export default adminUsersSlice.reducer;