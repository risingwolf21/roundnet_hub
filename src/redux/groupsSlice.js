import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const groupsSlice = createSlice({
    name: "groups",
    initialState: {
        groups: [],
        usersForGroup: {},
        loading: false,
        error: null
    },
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
                state.error = action.error.message;
            })

            .addCase(fetchSingleGroupAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;

                console.log("reducer", action.payload.data);
                let index = state.groups.findIndex(x => x.id === action.payload.id);
                if (index !== -1) {
                    state.groups = [
                        ...state.groups.slice(0, index),
                        action.payload.data,
                        ...state.groups.slice(index + 1)
                    ]
                } else {
                    state.groups = [...(state.groups ?? []), action.payload.data];
                }
            })
    }
});

export const fetchGroupsAsync = createAsyncThunk("fetchGroupsAsync", async ({ client }) => {
    const response = await client.from("event_group").select("*, users: group_user_mapping ( user ( userId, email, displayName ) )");
    return response.data.map(x => { return { ...x, users: x.users.map(y => { return y.user }) } });
});

export const fetchSingleGroupAsync = createAsyncThunk("fetchSingleGroupAsync", async ({ client, id }) => {
    const response = await client.from("event_group").select("*, users: group_user_mapping ( user ( userId, email, displayName ) )").eq("id", id).single();
    console.log(response.data)
    return {
        data: response.data.map(x => { return { ...x, users: x.users.map(y => y.user) } }),
        id
    }
});

export default groupsSlice.reducer;