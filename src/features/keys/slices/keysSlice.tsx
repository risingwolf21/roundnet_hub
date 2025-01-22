import { createAsyncThunk, createEntityAdapter, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FullItemHolder } from '../../../types/supabaseTypes';
import { RootState } from '../../../redux/store';
import { SupabaseKeysRepository } from '../../../repository/KeysRepository';

const keyHoldersAdapter = createEntityAdapter({
  selectId: (itemHolder: FullItemHolder) => itemHolder.id,
});

export const keyHoldersSelector = keyHoldersAdapter.getSelectors((st: RootState) => st.keys);

const keysSlice = createSlice({
  name: 'groups',
  initialState: keyHoldersAdapter.getInitialState({
    loading: false,
    error: null as string | null,
  }),
  reducers: {
    onKeyHoldersDelete: (state, action: PayloadAction<number>) => {
      keyHoldersAdapter.removeOne(state, action.payload);
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchItemsAsync.fulfilled, (state, action) => {
        keyHoldersAdapter.setAll(state, action.payload);
        state.loading = false;
      })
      .addCase(fetchItemsAsync.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchItemsAsync.rejected, (state, action) => {
        state.error = action.error.message ?? '';
      })

      .addCase(fetchInsertedItemsAsync.fulfilled, (state, action) => {
        if (action.payload) keyHoldersAdapter.upsertMany(state, action.payload);
        state.loading = false;
      });
  },
});

export const fetchItemsAsync = createAsyncThunk('fetchKeysAsync', async () => {
  const response = await SupabaseKeysRepository.getItems();

  return response.data ?? [];
});

export const fetchInsertedItemsAsync = createAsyncThunk(
  'fetchInsertedItemsAsync',
  async ({ key, user }: { key: number; user: string }) => {
    const response = await SupabaseKeysRepository.fetchInsertedItem(key, user);

    return response.data;
  }
);

export const { onKeyHoldersDelete } = keysSlice.actions;

export default keysSlice.reducer;
