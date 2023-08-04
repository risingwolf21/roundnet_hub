import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const drinkListReducer = createSlice({
  name: 'drinkList',
  initialState: {
    activeDrinks: [],
    status: "idle",
    error: null,
    loading: false
  },
  reducers: {
    onDrinkUpdate: (state, action) => {
      console.log("onUpdate", action);
      state.activeDrinks[action.payload.old.id] = action.payload.new;
    },
    onDrinkDelete: (state, payload) => {
      console.log("onDelete", payload);
    },
    onDrinkInsert: (state, payload) => {
      console.log("OnInsert", payload);
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchActiveDrinksAsync.pending, (state, action) => {
        state.loading = true;
      })
      .addCase(fetchActiveDrinksAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.error = '';

        state.activeDrinks = action.payload
      })
      .addCase(fetchActiveDrinksAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
  }
});

export const fetchActiveDrinksAsync = createAsyncThunk("drink", async (client) => {
  const response = await client.from("drink").select("id, name, price, stock, imageUrl, active").eq("active", true)
  return response.data;
});

export const { onDrinkUpdate, onDrinkDelete, onDrinkInsert } = drinkListReducer.actions;

export default drinkListReducer.reducer