import { createSlice } from '@reduxjs/toolkit';
import { User } from '../types/supabaseTypes';

type ApplicationSliceState = {
    user: User,
    mode: string,
    appUpdateAvailable: boolean,
    appVersion: string
}

const initialState = {
    user: {},
    mode: "drinks",
    appUpdateAvailable: false,
    appVersion: ""
} as ApplicationSliceState;

export const applicationReducer = createSlice({
    name: 'application',
    initialState,
    reducers: {
        onAppVersionChange: (state, action) => {
            state.appVersion = action.payload;
        },
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

export const { onUserChange, onModeChange, onAppUpdateAvailableChange, onAppVersionChange } = applicationReducer.actions;

export default applicationReducer.reducer