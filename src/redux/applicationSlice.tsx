import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {Notification, NotificationTags, User} from '../types/supabaseTypes';
import {SupabaseUserRepository} from "../repository/UserRepository";

type ApplicationSliceState = {
    user: User | null,
    mode: string,
    appUpdateAvailable: boolean,
    appVersion: string,
    realtimeState: "CLOSED" | "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR",
    updatingNotificationTags: boolean,
}

const initialState = {
    user: null,
    mode: "drinks",
    appUpdateAvailable: false,
    appVersion: "",
    realtimeState: "CLOSED",
    updatingNotificationTags: false,
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
        builder
            .addCase(fetchCurrentUserAsync.fulfilled, (state, action) => {
                state.user = action.payload
            })
            .addCase(removeNotificationPermissionAsync.pending, (state, action) => {
                state.updatingNotificationTags = true;
            })
            .addCase(removeNotificationPermissionAsync.fulfilled, (state, action) => {
                state.user = action.payload.data;
                state.updatingNotificationTags = false;
            })
            .addCase(addNotificationPermissionAsync.pending, (state, action) => {
                state.updatingNotificationTags = true;
            })
            .addCase(addNotificationPermissionAsync.fulfilled, (state, action) => {
                state.user = action.payload.data;
                state.updatingNotificationTags = false;
            })
    },
});

export const fetchCurrentUserAsync = createAsyncThunk("fetchCurrentUser", async ({userId}: { userId: string }) => {
    const response = await SupabaseUserRepository.fetchUser(userId);
    return response.data;
});

export const removeNotificationPermissionAsync = createAsyncThunk("removeNotificationPermissionAsync",
    async ({
               user,
               notificationToRemove
           }: {
        user: User, notificationToRemove: NotificationTags
    }) => {
        let newNotificationTags = user.notifications
            ?.filter((x) => x !== notificationToRemove) ?? [];
        return await SupabaseUserRepository.updateNotificationTags(newNotificationTags, user);
    });

export const addNotificationPermissionAsync = createAsyncThunk("addNotificationPermissionAsync",
    async ({
               user,
               notificationToAdd
           }: {
        user: User, notificationToAdd: NotificationTags
    }) => {
        let newNotificationTags = new Set([...(user?.notifications ?? []), notificationToAdd]);
        return await SupabaseUserRepository.updateNotificationTags([...newNotificationTags], user);
    });

export const {
    onUserChange,
    onModeChange,
    onAppUpdateAvailableChange,
    onAppVersionChange,
    onRealtimeStateChange
} = applicationReducer.actions;

export default applicationReducer.reducer