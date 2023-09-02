import { createSlice } from '@reduxjs/toolkit';

export const applicationReducer = createSlice({
    name: 'application',
    initialState: {
        user: {},
        mode: "drinks",
        appUpdateAvailable: false
    },
    reducers: {
        onModeChange: (state, action) => {
            state.mode = action.payload
        },
        onUserChange: (state, action) => {
            state.user = action.payload
        },
        onAppUpdateAvailableChange: (state, action) => {
            state.appUpdateAvailable = action.payload
        },
    }
});

export const { onUserChange, onModeChange, onAppUpdateAvailableChange } = applicationReducer.actions;

export default applicationReducer.reducer