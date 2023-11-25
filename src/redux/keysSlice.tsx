import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { FullKeyHolder } from "../types/supabaseTypes";
import { IKeysRepository } from "src/repository/IKeysRepository";

type KeysSliceState = {
    keys: FullKeyHolder[],
    loading: boolean,
    error: string | null
}

const initialState = {
    keys: [],
    loading: false,
    error: null
} as KeysSliceState;

const keysSlice = createSlice({
    name: "groups",
    initialState,
    reducers: {},
    extraReducers(builder) {
        builder
            .addCase(fetchKeyssAsync.fulfilled, (state, action) => {
                state.keys = action.payload;
                state.loading = false;
            })
            .addCase(fetchKeyssAsync.pending, (state, action) => {
                state.loading = true;
                state.error = "";
            })
            .addCase(fetchKeyssAsync.rejected, (state, action) => {
                state.error = action.error.message ?? "";
            })
    }
});

export const fetchKeyssAsync = createAsyncThunk("fetchGroupsAsync", async (keysRepository: IKeysRepository) => {
    const response = await keysRepository.getKeys();

    return response.data ?? [];
});

export default keysSlice.reducer;