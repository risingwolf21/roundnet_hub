import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const adminUsersSlice = createSlice({
    name: "admin-users",
    initialState: {
        users: [],
        loading: false,
        error: null
    },
    reducers: {
        onUserUpdate: (state, action) => {
            console.log(action.payload)
            let index = state.users.findIndex(x => x.userId === action.payload.new.userId);
            if (index !== -1) {
                state.users[index] = Object.assign(state.users[index], action.payload.new);
            }
        },
        onUserDeleted: (state, action) => {
            let index = state.users.findIndex(x => x.userId === action.payload.old.userId);
            if (index !== -1) {
                delete state.users[index];
            }
        },
        onUserInserted: (state, action) => {
            state.users = [...(state.users ?? []), action.payload.new]
        }
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

export const { onUserDeleted, onUserInserted, onUserUpdate } = adminUsersSlice.actions;

export default adminUsersSlice.reducer;