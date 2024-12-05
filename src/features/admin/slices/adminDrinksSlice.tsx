import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AdminDrinksRepository } from '../../../repository/AdminDrinksRepository';
import { compareById } from '../../../utils';
import { captureException } from '@sentry/react';
import { FullHistory } from '../../../types/supabaseTypes';

type AdminDrinkSliceState = {
  history: FullHistory[];
  drinks: Drink[];
  loading: boolean;
  endReached: boolean;
  historyEndReached: boolean;
  historyError: string;
  historyLoading: boolean;
  drinksError: string;
  drinksLoading: boolean;
};
const initialState = {
  history: [],
  drinks: [],
  loading: false,
  endReached: false,
  historyEndReached: false,
  historyError: '',
  historyLoading: false,
  drinksError: '',
  drinksLoading: false,
} as AdminDrinkSliceState;

export const adminDrinksSlice = createSlice({
  name: 'admin-drinks',
  initialState,
  reducers: {
    onDrinkUpdated: (state: AdminDrinkSliceState, action: PayloadAction<Drink>) => {
      const index = state.drinks.findIndex((x) => x.id === action.payload.id);
      state.drinks = [...state.drinks.slice(0, index), action.payload, ...state.drinks.slice(index + 1)];
    },
    onDrinkDeleted: (state: AdminDrinkSliceState, action: PayloadAction<number>) => {
      state.drinks = state.drinks.filter((x: Drink) => x.id !== action.payload);
    },
    onDrinkInserted: (state: AdminDrinkSliceState, action: PayloadAction<Drink>) => {
      state.drinks = [...(state.drinks ?? []), action.payload];
    },
    onHistoryUpdate: (state: AdminDrinkSliceState, action) => {
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
    },
    onHistoryDelete: (state: AdminDrinkSliceState, action) => {
      state.history = state.history.filter((x) => !compareById(x, action.payload.old));
    },
    onHistoryInsert: (state: AdminDrinkSliceState, action) => {
      state.history = [...(state.history ?? []), action.payload.new];
    },
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

        state.drinks = action.payload ?? [];
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

        state.endReached = !!(action.payload.entries && action.payload.entries.length < 1);

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
      });
  },
});

export const fetchDrinksAsync = createAsyncThunk('adminDrinks', async (_, { rejectWithValue }) => {
  try {
    const response = await AdminDrinksRepository.fetchDrinks();
    return response?.data ?? [];
  } catch (error) {
    captureException(error);
    return rejectWithValue(error);
  }
});

type Props = {
  page: number;
  count: number;
};

export const fetchAdminHistoryAsync = createAsyncThunk(
  'adminHistory',
  async ({ page = 0, count = 20 }: Props, { rejectWithValue }) => {
    try {
      const response = await AdminDrinksRepository.fetchAdminHistory(page, count);
      return {
        entries: response?.data ?? [],
        more: page !== 0,
      };
    } catch (error) {
      captureException(error);
      return rejectWithValue(error);
    }
  }
);

export const { onHistoryUpdate, onHistoryDelete, onHistoryInsert, onDrinkUpdated, onDrinkInserted, onDrinkDeleted } =
  adminDrinksSlice.actions;

export default adminDrinksSlice.reducer;
