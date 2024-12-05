import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FullHistory, PaymentHistory } from '../../../types/supabaseTypes';
import { compareById } from '../../../utils';
import { SupabaseDrinkRepository } from '../../../repository/DrinkRepository';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase-generated.types';

type DrinksSliceState = {
  history: FullHistory[];
  payment: Payment | null;
  drinks: Drink[];
  paymentHistory: PaymentHistory[] | null;
  vouchers: Tables<'vouchers'>[];
  loading: boolean;
  endReached: boolean;
  historyEndReached: boolean;
  historyError: string | undefined;
  historyLoading: boolean;
  drinksError: string | undefined;
  drinksLoading: boolean;
  paymentLoading: boolean;
  paymentError: string | undefined;
  paymentDrinksLoading: boolean;
  paymentDrinksError: string | undefined;
};

const initialState = {
  history: [],
  payment: null,
  drinks: [],
  paymentHistory: [],
  vouchers: [],
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
  paymentDrinksError: undefined,
} as DrinksSliceState;

export const drinksSlice = createSlice({
  name: 'drinks',
  initialState,
  reducers: {
    onDrinkUpdated: (state: DrinksSliceState, action: PayloadAction<TablesUpdate<'drink'>>) => {
      let drink = action.payload as Drink;
      const index = state.drinks.findIndex((x) => x.id === drink.id);
      state.drinks = [...state.drinks.slice(0, index), drink, ...state.drinks.slice(index + 1)];
    },
    onDrinkDeleted: (state: DrinksSliceState, action: PayloadAction<number>) => {
      state.drinks = state.drinks.filter((x: Drink) => x.id !== action.payload);
    },
    onDrinkInserted: (state: DrinksSliceState, action: PayloadAction<TablesInsert<'drink'>>) => {
      let newDrink = action.payload as Drink;
      if (newDrink) state.drinks = [...(state.drinks ?? []), newDrink];
    },
    onHistoryUpdate: (state: DrinksSliceState, action) => {
      let drinkIndex = state.drinks.findIndex((x) => x.id === action.payload.new.drink);
      let newHistoryEntry = action.payload.new;
      if (drinkIndex !== -1) {
        newHistoryEntry = Object.assign(newHistoryEntry, {
          drink: state.drinks[drinkIndex],
          drinkId: action.payload.new.drink,
        });
      }

      let index = state.history.findIndex((x) => compareById(x, newHistoryEntry));

      state.history = [...state.history.slice(0, index), newHistoryEntry, ...state.history.slice(index + 1)];

      if (!state.paymentHistory) return;

      index = state.paymentHistory.findIndex((x) => compareById(x, newHistoryEntry));

      if (index !== -1)
        state.paymentHistory = [
          ...state.paymentHistory.slice(0, index),
          newHistoryEntry,
          ...state.paymentHistory.slice(index + 1),
        ];
    },
    onHistoryDelete: (state: DrinksSliceState, action) => {
      state.history = state.history.filter((x) => !compareById(x, action.payload.old));
      state.paymentHistory = state.paymentHistory?.filter((x) => !compareById(x, action.payload.old)) ?? [];
    },
    onHistoryInsert: (state: DrinksSliceState, action) => {
      state.history = [...(state.history ?? []), action.payload.new];
      if (action.payload.new.payment === state.payment?.id)
        state.paymentHistory = [...(state.history ?? []), action.payload.new];
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
      .addCase(fetchDrinksAsync.pending, (state: DrinksSliceState, _action) => {
        state.loading = true;
      })
      .addCase(fetchDrinksAsync.fulfilled, (state: DrinksSliceState, action) => {
        state.loading = false;
        state.drinksError = '';

        state.drinks = action.payload ?? [];
      })
      .addCase(fetchDrinksAsync.rejected, (state: DrinksSliceState, action) => {
        state.loading = false;
        state.drinksError = action.error.message;
      })
      /**
       * History initial loading
       */
      .addCase(fetchHistoryAsync.pending, (state: DrinksSliceState, _action) => {
        state.loading = true;
      })
      .addCase(fetchHistoryAsync.fulfilled, (state: DrinksSliceState, action) => {
        state.loading = false;
        state.historyError = '';

        if (action.payload.entries && action.payload.entries.length < 1) {
          state.endReached = true;
        } else {
          state.endReached = false;
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
      .addCase(fetchPaymentAsync.pending, (state: DrinksSliceState, _action) => {
        state.paymentLoading = true;
      })
      .addCase(fetchPaymentAsync.fulfilled, (state: DrinksSliceState, action) => {
        state.paymentLoading = false;
        state.paymentError = '';
        if (action.payload && action.payload.length === 1) state.payment = action.payload[0];
      })
      .addCase(fetchPaymentAsync.rejected, (state: DrinksSliceState, action) => {
        state.paymentLoading = false;
        state.paymentError = action.error.message;
      })

      .addCase(fetchVouchersAsync.fulfilled, (state: DrinksSliceState, action) => {
        state.vouchers = action.payload ?? [];
      })

      .addCase(fetchDrinksToPayAsync.pending, (state: DrinksSliceState, _action) => {
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
      });
  },
});

type DrinkRepositoryWithUserId = {
  userId: string;
};
type DrinkRepositoryWithUserIdAndPagination = DrinkRepositoryWithUserId & {
  count: number;
  page: number;
};

export const fetchPaymentAsync = createAsyncThunk('payments/forUser', async ({ userId }: DrinkRepositoryWithUserId) => {
  const response = await SupabaseDrinkRepository.fetchCurrentPaymentForUser(userId);
  return response?.data ?? [];
});

export const fetchDrinksToPayAsync = createAsyncThunk(
  'payments/openDrinks',
  async ({ userId }: DrinkRepositoryWithUserId) => {
    const response = await SupabaseDrinkRepository.fetchDrinksToPay(userId);
    return response?.data ?? [];
  }
);

export const fetchDrinksAsync = createAsyncThunk('drink', async () => {
  const response = await SupabaseDrinkRepository.fetchDrinks();
  return response?.data ?? [];
});

export const fetchVouchersAsync = createAsyncThunk('fetchVouchersAsync', async (userId: string) => {
  const response = await SupabaseDrinkRepository.fetchVouchersForUser(userId);
  return response?.data ?? [];
});

export const fetchHistoryAsync = createAsyncThunk(
  'history',
  async ({ userId, page = 0, count = 20 }: DrinkRepositoryWithUserIdAndPagination, { rejectWithValue }) => {
    const response = await SupabaseDrinkRepository.fetchHistoryForUser(userId, page, count);
    return { entries: response?.data ?? [], more: page !== 0 };
  }
);

export const { onHistoryUpdate, onHistoryDelete, onHistoryInsert, onDrinkUpdated, onDrinkInserted, onDrinkDeleted } =
  drinksSlice.actions;

export default drinksSlice.reducer;
