import { createSlice } from '@reduxjs/toolkit';

export const applicationReducer = createSlice({
    name: 'application',
    initialState: {
        mode: "drinks",
        user: {}
    },
    reducers: {
        onModeChange: (state, action) => {
            state.mode = action.payload
        },
        onUserChange: (state, action) => {
            state.user = action.payload
        },
    }
});

export const { onUserChange, onModeChange } = applicationReducer.actions;

export default applicationReducer.reducer