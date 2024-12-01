import {createAsyncThunk, createSlice, PayloadAction} from '@reduxjs/toolkit';
import {SupabaseUserRepository} from "../repository/UserRepository";
import {UserWithRolesAndPermissions} from "../types/supabaseTypes";

type ApplicationSliceState = {
    user: UserWithRolesAndPermissions | null,
    appUpdateAvailable: boolean,
    appVersion: string,
    realtimeState: "CLOSED" | "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR",
    updatingNotificationTags: boolean,
    serviceWorkerInitialized: boolean,
    serviceWorkerUpdated: boolean,
    serviceWorkerRegistration: ServiceWorkerRegistration | null,
}

const initialState = {
    user: null,
    appUpdateAvailable: false,
    appVersion: "",
    realtimeState: "CLOSED",
    updatingNotificationTags: false,
    serviceWorkerInitialized: false,
    serviceWorkerUpdated: false,
    serviceWorkerRegistration: null,
} as ApplicationSliceState;

export const applicationReducer = createSlice({
    name: 'application',
    initialState,
    reducers: {
        onAppVersionChange: (state, action) => {
            state.appVersion = action.payload;
        },
        onUserChange: (state, action) => {
            state.user = action.payload
        },
        onAppUpdateAvailableChange: (state, action) => {
            state.appUpdateAvailable = action.payload
        },
        onRealtimeStateChange: (state, action: PayloadAction<"CLOSED" | "SUBSCRIBED" | "TIMED_OUT" | "CHANNEL_ERROR">) => {
            state.realtimeState = action.payload;
        },
        onUpdateServiceWorker: (state, action: PayloadAction<ServiceWorkerRegistration | null>) => {
            state.serviceWorkerRegistration = action.payload;
            state.serviceWorkerUpdated = !state.serviceWorkerUpdated;
        },
        onServiceWorkerInitialized: (state, action: PayloadAction<undefined>) => {
            state.serviceWorkerInitialized = !state.serviceWorkerInitialized;
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
                state.updatingNotificationTags = false;
            })
            .addCase(addNotificationPermissionAsync.pending, (state, action) => {
                state.updatingNotificationTags = true;
            })
            .addCase(addNotificationPermissionAsync.fulfilled, (state, action) => {
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
            ?.filter((x: NotificationTags) => x !== notificationToRemove) ?? [];
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
    onUpdateServiceWorker,
    onServiceWorkerInitialized
} = applicationReducer.actions;

export default applicationReducer.reducer;