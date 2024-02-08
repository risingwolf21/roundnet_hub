import {createAsyncThunk, createEntityAdapter, createSlice, PayloadAction} from "@reduxjs/toolkit";
import {FullKeyHolder} from "../types/supabaseTypes";
import {IKeysRepository} from "src/repository/IKeysRepository";
import {RootState} from "./store";

const keyHoldersAdapter = createEntityAdapter({
    selectId: (keyHolder: FullKeyHolder) => keyHolder.key.id,
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
            keyHoldersAdapter.removeOne(state, action.payload);
        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchKeysAsync.fulfilled, (state, action) => {
                keyHoldersAdapter.setAll(state, action.payload);
                state.loading = false;
            })
            .addCase(fetchKeysAsync.pending, (state) => {
                state.loading = true;
                state.error = "";
            })
            .addCase(fetchKeysAsync.rejected, (state, action) => {
                state.error = action.error.message ?? "";
            })

            .addCase(fetchInsertedKeyHolderAsync.fulfilled, (state, action) => {
                if(action.payload)
                    keyHoldersAdapter.upsertMany(state, action.payload);
                state.loading = false;
            })
    }
});

export const fetchKeysAsync = createAsyncThunk("fetchKeysAsync", async (keysRepository: IKeysRepository) => {
    const response = await keysRepository.getKeys();

    return response.data ?? [];
});

export const fetchInsertedKeyHolderAsync = createAsyncThunk("fetchInsertedKeyHolderAsync", async ({
                                                                                                      keysRepository,
                                                                                                      key,
                                                                                                      user
                                                                                                  } : {
    keysRepository: IKeysRepository,
    key: number,
    user: string
}) => {
    const response = await keysRepository.fetchInsertedKey(key, user);

    return response.data;
});

export const {onKeyHoldersDelete} = keysSlice.actions;

export default keysSlice.reducer;