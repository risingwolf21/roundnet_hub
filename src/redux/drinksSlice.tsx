import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Drink, FullHistory, Payment, PaymentHistory, PaymentState, User } from '../types/supabaseTypes';
import { compareById } from '../utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { ClientUser } from '../types/types';
import { TABLE_DRINK, TABLE_HISTORY, TABLE_PAYMENTS } from '../constants';

type DrinksSliceState = {
    history: FullHistory[],
    payment: Payment | null,
    drinks: Drink[],
    paymentHistory: PaymentHistory[] | null,
    loading: boolean,
    endReached: boolean,
    historyEndReached: boolean,
    historyError: string | undefined,
    historyLoading: boolean,
    drinksError: string | undefined,
    drinksLoading: boolean,
    paymentLoading: boolean,
    paymentError: string | undefined,
    paymentDrinksLoading: boolean,
    paymentDrinksError: string | undefined,
}

const initialState = {
    history: [],
    payment: null,
    drinks: [],
    paymentHistory: [],
    loading: false,
    endReached: false,
    historyEndReached: false,
    historyError: undefined,
    historyLoading: false,
    drinksError: undefined,
    drinksLoading: false,
    paymentLoading: false,
    paymentError: undefined,
    paymentDrinksLoading: false,
    paymentDrinksError: undefined
} as DrinksSliceState;

export const drinksSlice = createSlice({
    name: 'drinks',
    initialState,
    reducers: {
        onDrinkUpdated: (state: DrinksSliceState, action: PayloadAction<Drink>) => {
            const index = state.drinks.findIndex((x) =>
                x.id === action.payload.id,
            )
            state.drinks = [
                ...state.drinks.slice(0, index),
                action.payload,
                ...state.drinks.slice(index + 1)
            ]
        },
        onDrinkDeleted: (state: DrinksSliceState, action: PayloadAction<number>) => {
            state.drinks = state.drinks.filter((x: Drink) => x.id !== action.payload)
        },
        onDrinkInserted: (state: DrinksSliceState, action: PayloadAction<Drink>) => {
            state.drinks = [...(state.drinks ?? []), action.payload]
        },
        onHistoryUpdate: (state: DrinksSliceState, action) => {

            let drinkIndex = state.drinks.findIndex(x => x.id === action.payload.new.drink);
            let newHistoryEntry = action.payload.new;
            if (drinkIndex !== -1) {
                newHistoryEntry = Object.assign(newHistoryEntry, { drink: state.drinks[drinkIndex], drinkId: action.payload.new.drink });
            }

            let index = state.history.findIndex((x) =>
                compareById(x, newHistoryEntry),
            )

            state.history = [
                ...state.history.slice(0, index),
                newHistoryEntry,
                ...state.history.slice(index + 1)
            ]

            if (!state.paymentHistory)
                return;

            index = state.paymentHistory.findIndex((x) =>
                compareById(x, newHistoryEntry),
            )

            if (index !== -1)
                state.paymentHistory = [
                    ...state.paymentHistory.slice(0, index),
                    newHistoryEntry,
                    ...state.paymentHistory.slice(index + 1)
                ]
        },
        onHistoryDelete: (state: DrinksSliceState, action) => {
            state.history = state.history.filter(x => !compareById(x, action.payload.old))
            state.paymentHistory = state.paymentHistory?.filter(x => !compareById(x, action.payload.old)) ?? []
        },
        onHistoryInsert: (state: DrinksSliceState, action) => {
            state.history = [...(state.history ?? []), action.payload.new]
            if (action.payload.new.payment === state.payment?.id)
                state.paymentHistory = [...(state.history ?? []), action.payload.new]
        },
        onPaymentUpdated: (state: DrinksSliceState, action: PayloadAction<Payment>) => {
            if (state.payment?.id === action.payload.id) {
                state.payment = action.payload;
            }
        },
        onPaymentDeleted: (state: DrinksSliceState, action: PayloadAction<number>) => {
            if (state.payment?.id === action.payload) {
                state.payment = null;
            }
        },
    },
    extraReducers(builder) {
        builder
            /**
             * Drinks initial loading
             */
            .addCase(fetchDrinksAsync.pending, (state: DrinksSliceState, action) => {
                state.loading = true;
            })
            .addCase(fetchDrinksAsync.fulfilled, (state: DrinksSliceState, action) => {
                state.loading = false;
                state.drinksError = '';

                state.drinks = action.payload ?? []
            })
            .addCase(fetchDrinksAsync.rejected, (state: DrinksSliceState, action) => {
                state.loading = false;
                state.drinksError = action.error.message;
            })
            /**
             * History initial loading
             */
            .addCase(fetchHistoryAsync.pending, (state: DrinksSliceState, action) => {
                state.loading = true;
            })
            .addCase(fetchHistoryAsync.fulfilled, (state: DrinksSliceState, action) => {
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
                    state.history = [...(action.payload.entries ?? [])];
                }
            })
            .addCase(fetchHistoryAsync.rejected, (state: DrinksSliceState, action) => {
                state.loading = false;
                state.endReached = true;
                state.historyError = action.error.message;
            })
            /**
             * Fetching active payment for user
             */
            .addCase(fetchPaymentAsync.pending, (state: DrinksSliceState, action) => {
                state.paymentLoading = true;
            })
            .addCase(fetchPaymentAsync.fulfilled, (state: DrinksSliceState, action) => {
                state.paymentLoading = false;
                state.paymentError = '';
                if (action.payload && action.payload.length === 1)
                    state.payment = action.payload[0]
            })
            .addCase(fetchPaymentAsync.rejected, (state: DrinksSliceState, action) => {
                state.paymentLoading = false;
                state.paymentError = action.error.message;
                console.log(action.error);
            })

            .addCase(fetchDrinksToPayAsync.pending, (state: DrinksSliceState, action) => {
                state.paymentDrinksLoading = true;
            })
            .addCase(fetchDrinksToPayAsync.fulfilled, (state: DrinksSliceState, action) => {
                state.paymentDrinksLoading = false;
                state.paymentDrinksError = '';

                state.paymentHistory = action.payload ?? [];
            })
            .addCase(fetchDrinksToPayAsync.rejected, (state: DrinksSliceState, action) => {
                state.paymentDrinksLoading = false;
                state.paymentDrinksError = action.error.message;
            })
    }
});

export const fetchPaymentAsync = createAsyncThunk("payments", async ({ client, user }: ClientUser) => {
    const response = await client.from(TABLE_PAYMENTS).select("*").eq("userId", user.userId).eq("paymentState", "Open" as PaymentState)
    return response.data;
});

export const fetchDrinksToPayAsync = createAsyncThunk("payments/openDrinks", async ({ client, user }: ClientUser) => {
    const response = await client
        .from(TABLE_HISTORY)
        .select("id, count, created_at, user, amount, drink ( name, price ), payments ( paymentState )")
        .eq('payments.paymentState', "Open")
        .not("payments", "is", null)
        .eq('user', user.userId)
        .returns<PaymentHistory[]>();
    return response.data;
});

export const fetchDrinksAsync = createAsyncThunk("drink", async (client: SupabaseClient) => {
    const response = await client.from(TABLE_DRINK).select("*")
        .order('id', { ascending: false })
        .returns<Drink[]>();
    return response.data;
});

export const fetchHistoryAsync = createAsyncThunk("history", async ({ client, user, page = 0, count = 20 }: { client: SupabaseClient, user: User, page: number, count: number }) => {
    const response = await client
        .from(TABLE_HISTORY)
        .select("id, count, amount, created_at, drinkId: drink, drink(*), user: user(*)")
        .eq('user.userId', user.userId)
        .range(page * count, page * count + count - 1)
        .order('created_at', { ascending: false })
        .returns<FullHistory[]>();
    return { entries: response.data, more: page !== 0 };
});

export const {
    onHistoryUpdate,
    onHistoryDelete,
    onHistoryInsert,
    onDrinkUpdated,
    onDrinkInserted,
    onDrinkDeleted,
    onPaymentDeleted,
    onPaymentUpdated } = drinksSlice.actions;

export default drinksSlice.reducer