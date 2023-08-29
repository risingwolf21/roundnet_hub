import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { DRINK_DELETED, DRINK_INSERTED, DRINK_UPDATED } from './names';

const compareDrinkFn = (x, y) => {
  return x.id === y.id;
}

export const drinkListReducer = createSlice({
  name: 'drinkList',
  initialState: {
    items: [],
    status: "idle",
    error: null,
    loading: false
  },
  extraReducers(builder) {
    builder
      .addCase(DRINK_UPDATED, (state, action) => {
        const index = state.items.findIndex((x) =>
          x.id === action.payload.new.id,
        )
        state.items = [
          ...state.items.slice(0, index),
          action.payload.new,
          ...state.items.slice(index + 1)
        ]
      })
      .addCase(DRINK_DELETED, (state, action) => {
        state.items = state.items.filter(x => !compareDrinkFn(x, action.payload.old))
      })
      .addCase(DRINK_INSERTED, (state, action) => {
        state.items = [...(state.items ?? []), action.payload.new]
      })

      .addCase(fetchDrinksAsync.pending, (state, action) => {
        state.loading = true;
      })
      .addCase(fetchDrinksAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = '';

        state.items = action.payload
      })
      .addCase(fetchDrinksAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
  }
});

export const fetchDrinksAsync = createAsyncThunk("drink", async (client) => {
  const response = await client.from("drink").select("id, name, price, stock, imageUrl, active, deleted, previousDrink")
  return response.data;
});


export default drinkListReducer.reducer