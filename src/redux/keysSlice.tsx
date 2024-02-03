import {createAsyncThunk, createEntityAdapter, createSlice, PayloadAction} from "@reduxjs/toolkit";
import {FullKeyHolder, KeyInsert, KeyUpdate} from "../types/supabaseTypes";
import {IKeysRepository} from "src/repository/IKeysRepository";
import {SliceEvent} from "./events/eventsSlice";
import {RootState} from "./store";

type KeysSliceState = {
    keyHolders: FullKeyHolder[],
    loading: boolean,
    error: string | null
}


const keyHoldersAdapter = createEntityAdapter({
    selectId: (keyHolder: FullKeyHolder) => keyHolder.key.id + keyHolder.user.userId,
});

export const keyHoldersSelector = keyHoldersAdapter.getSelectors((st: RootState) => st.keys);


const keysSlice = createSlice({
    name: "groups",
    initialState: keyHoldersAdapter.getInitialState({
        loading: false,
        error: null as string | null
    }),
    reducers: {
        onKeyHoldersDelete: (state, action: PayloadAction<number>) => {

        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchKeysAsync.fulfilled, (state, action) => {
                keyHoldersAdapter.setAll(state, action.payload);
                state.loading = false;
            })
            .addCase(fetchKeysAsync.pending, (state, action) => {
                state.loading = true;
                state.error = "";
            })
            .addCase(fetchKeysAsync.rejected, (state, action) => {
                state.error = action.error.message ?? "";
            })
    }
});

export const fetchKeysAsync = createAsyncThunk("fetchKeysAsync", async (keysRepository: IKeysRepository) => {
    const response = await keysRepository.getKeys();

    return response.data ?? [];
});

export default keysSlice.reducer;