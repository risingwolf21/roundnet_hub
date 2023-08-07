import { createSlice } from '@reduxjs/toolkit';

export const applicationReducer = createSlice({
    name: 'application',
    initialState: {
        mode: "drinks"
    },
    reducers: {
        onModeChange: (state, action) => {
            state.mode = action.payload
        },
    }
});

export const { onModeChange } = applicationReducer.actions;

export default applicationReducer.reducer