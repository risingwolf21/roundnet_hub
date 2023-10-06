import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const adminUsersSlice = createSlice({
    name: "admin-users",
    initialState: {
        users: [],
        loading: false,
        error: null
    },
    extraReducers(builder) {
        builder
            .addCase(fetchAdminUsersAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchAdminUsersAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = '';
                state.users = action.payload
            })
            .addCase(fetchAdminUsersAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
    }
});

export const fetchAdminUsersAsync = createAsyncThunk("fetchAdminUsersAsync", async ({ client }) => {
    const response = await client.from("user")
        .select("*, groups: group_user_mapping ( group: event_group ( * ) )")
    return response.data;
});

export default adminUsersSlice.reducer;