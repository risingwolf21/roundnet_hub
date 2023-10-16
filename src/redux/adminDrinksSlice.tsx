import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
//@ts-ignore
import { drinksReducer } from './reducer/drinksReducer';
//@ts-ignore
import { historyReducer } from './reducer/historyReducer';
import { Drink, FullHistory } from '../types/supabase';
import { IAdminDrinksRepository } from '../repository/IAdminDrinksRepository';

type SliceState = {
    history: FullHistory[],
    drinks: Drink[],
    loading: boolean,
    endReached: boolean,
    historyEndReached: boolean,
    historyError: string,
    historyLoading: boolean,
    drinksError: string,
    drinksLoading: boolean
}
const initialState = {
    history: [],
    drinks: [],
    loading: false,
    endReached: false,
    historyEndReached: false,
    historyError: '',
    historyLoading: false,
    drinksError: '',
    drinksLoading: false
} as SliceState;

export const adminDrinksSlice = createSlice({
    name: 'admin-drinks',
    initialState,
    reducers: {
        ...drinksReducer,
        ...historyReducer
    },
    extraReducers(builder) {
        builder
            /**
             * Drinks initial loading
             */
            .addCase(fetchDrinksAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchDrinksAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.drinksError = '';

                state.drinks = action.payload ?? []
            })
            .addCase(fetchDrinksAsync.rejected, (state, action) => {
                state.loading = false;
                state.drinksError = action.error?.message ?? '';
            })
            /**
             * History initial loading
             */
            .addCase(fetchAdminHistoryAsync.pending, (state, action) => {
                state.loading = true;
            })
            .addCase(fetchAdminHistoryAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.historyError = '';

                if (action.payload.entries && action.payload.entries.length < 1) {
                    state.endReached = true
                }
                else {
                    state.endReached = false
                }

                if (action.payload.more) {
                    state.history = [...state.history, ...(action.payload.entries ?? [])];
                } else {
                    state.history = action.payload.entries ?? [];
                }
            })
            .addCase(fetchAdminHistoryAsync.rejected, (state, action) => {
                state.loading = false;
                state.endReached = true;
                state.historyError = action.error?.message ?? '';
            })
    }
});

export const fetchDrinksAsync = createAsyncThunk("drink", async (repository: IAdminDrinksRepository) => {
    const response = await repository.fetchDrinks();
    return response?.data ?? [];
});

type Props = {
    repository: IAdminDrinksRepository,
    page: number,
    count: number
}

export const fetchAdminHistoryAsync = createAsyncThunk("history", async ({ repository, page = 0, count = 20 }: Props) => {
    const response = await repository.fetchAdminHistory(page, count);
    return { entries: response?.data ?? [], more: page !== 0 };
});

export const {
    onHistoryUpdate,
    onHistoryDelete,
    onHistoryInsert,
    onDrinkUpdated,
    onDrinkInserted,
    onDrinkDeleted } = adminDrinksSlice.actions;

export default adminDrinksSlice.reducer