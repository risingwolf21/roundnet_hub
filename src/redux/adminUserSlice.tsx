import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { UserWithGroups } from '../types/supabaseTypes';
import { IAdminUsersRepository } from 'src/repository/IAdminUsersRepository';

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
                state.users = action.payload ?? [];
                state.hasNotVerifiedUsers = (action.payload ?? []).some(x => !x.verified);
            })
            .addCase(fetchAdminUsersAsync.rejected, (state: AdminUsersSliceState, action) => {
                state.loading = false;
                state.error = action.error.message ?? "";
            })
    }
});

export const fetchAdminUsersAsync = createAsyncThunk("fetchAdminUsersAsync", async (repository: IAdminUsersRepository) => {
    const response = await repository.fetchAllUsersWithGroups();
    return response.data ?? [];
});

export const fetchNotVerifiedUsersAsync = createAsyncThunk("fetchNotVerifiedUsersAsync", async (repository: IAdminUsersRepository) => {
    const response = await repository.fetchNotVerifiedUsers();
    return response.data ?? [];
})

export const { onUserDeleted, onUserInserted, onUserUpdate } = adminUsersSlice.actions;

export default adminUsersSlice.reducer;