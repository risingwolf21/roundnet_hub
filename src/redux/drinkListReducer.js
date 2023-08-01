import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const drinkListReducer = createSlice({
  name: 'drinkList',
  initialState: {
    items: [],
    status: "idle",
    error: null
  },
  reducers: {
    onFetch: (state, action) => {
      state.items = action.payload.data
    },
    onDelete: (state, action) => {
      // state.items = action.payload
    },
    onInsert: (state, action) => {
      // state.items = action.payload
    },
    onUpdate: (state, action) => {
      // state.items = action.payload
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchDrinkListAsync.pending, (state, action) => {
        state.status = 'loading'
      })
      .addCase(fetchDrinkListAsync.fulfilled, (state, action) => {
        state.status = 'succeeded'
        // Add any fetched posts to the array
        state.items = action.payload
      })
      .addCase(fetchDrinkListAsync.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
  }
});

export const fetchDrinkListAsync = createAsyncThunk("drink", async (client) => {
  const response = await client.from("drink").select("id, name, price, stock, imageUrl, active").eq("active", true)
  return response.data;
});

// Action creators are generated for each case reducer function
export const { onFetch, onDelete, onUpdate, onInsert } = drinkListReducer.actions

export default drinkListReducer.reducer