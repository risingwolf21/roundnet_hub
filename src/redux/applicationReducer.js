import { createSlice } from '@reduxjs/toolkit';

export const applicationReducer = createSlice({
    name: 'application',
    initialState: {
        user: {},
        mode: "drinks"
    },
    reducers: {
        onUserChange: (state, action) => {
            state.user = action.payload
        },
        onModeChange: (state, action) => {
            state.mode = action.payload
        },
    }
});

export const { onUserChange, onModeChange } = applicationReducer.actions;

export default applicationReducer.reducer