import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { User } from '../types/supabaseTypes';
import { IUserRepository } from 'src/repository/IUserRepository';

type ApplicationSliceState = {
    user: User | null,
    mode: string,
    appUpdateAvailable: boolean,
    appVersion: string,
    realtimeState: "CLOSED" | "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR",
}

const initialState = {
    user: null,
    mode: "drinks",
    appUpdateAvailable: false,
    appVersion: "",
    realtimeState: "CLOSED",
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
        onRealtimeStateChange: (state, action: PayloadAction<"CLOSED" | "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR">) => {
            state.realtimeState = action.payload;
        }
    },
    extraReducers(builder) {
        builder.addCase(fetchCurrentUserAsync.fulfilled, (state, action) => {
            state.user = action.payload
        })
    },
});

export const fetchCurrentUserAsync = createAsyncThunk("fetchCurrentUser", async ({ repository, userId }: { userId: string, repository: IUserRepository }) => {
    const response = await repository.fetchUser(userId);
    return response.data;
});


export const { onUserChange, onModeChange, onAppUpdateAvailableChange, onAppVersionChange, onRealtimeStateChange } = applicationReducer.actions;

export default applicationReducer.reducer