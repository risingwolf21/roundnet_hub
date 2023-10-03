import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const groupsSlice = createSlice({
    name: "groups",
    initialState: {
        items: [],
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

                state.items = action.payload;
            })
            .addCase(fetchGroupsAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
    }
});

export const fetchGroupsAsync = createAsyncThunk("fetchGroupsAsync", async ({ client }) => {
    const response = await client.from("event_group").select("*");
    return response.data;
});

export default groupsSlice.reducer