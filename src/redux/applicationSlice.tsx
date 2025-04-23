import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SupabaseUserRepository } from '../repository/UserRepository';
import { UserWithRolesAndPermissions } from '../types/supabaseTypes';
import { CalendarSettingsResult } from 'src/features/profile/CalendarSettings';

type ApplicationSliceState = {
  user: UserWithRolesAndPermissions | null;
  appUpdateAvailable: boolean;
  appVersion: string;
  realtimeState: 'CLOSED' | 'SUBSCRIBED' | 'TIMED_OUT' | 'CHANNEL_ERROR';
  updatingNotificationTags: boolean;
  serviceWorkerInitialized: boolean;
  serviceWorkerUpdated: boolean;
  serviceWorkerRegistration: ServiceWorkerRegistration | null;
};

const initialState = {
  user: null,
  appUpdateAvailable: false,
  appVersion: '',
  realtimeState: 'CLOSED',
  updatingNotificationTags: false,
  serviceWorkerInitialized: false,
  serviceWorkerUpdated: false,
  serviceWorkerRegistration: null,
} as ApplicationSliceState;

const applicationReducer = createSlice({
  name: 'application',
  initialState,
  reducers: {
    onAppVersionChange: (state, action) => {
      state.appVersion = action.payload;
    },
    onUserChange: (state, action: PayloadAction<UserWithRolesAndPermissions | null>) => {
      state.user = action.payload;
    },
    onUserDatabaseUpdate: (state, action: PayloadAction<UserUpdate>) => {
      if (state.user)
        state.user = {
          ...state.user,
          verified: action.payload.verified ?? state.user.verified,
        };
    },
    onAppUpdateAvailableChange: (state, action) => {
      state.appUpdateAvailable = action.payload;
    },
    onRealtimeStateChange: (state, action: PayloadAction<'CLOSED' | 'SUBSCRIBED' | 'TIMED_OUT' | 'CHANNEL_ERROR'>) => {
      state.realtimeState = action.payload;
    },
    onUpdateServiceWorker: (state, action: PayloadAction<ServiceWorkerRegistration | null>) => {
      state.serviceWorkerRegistration = action.payload;
      state.serviceWorkerUpdated = !state.serviceWorkerUpdated;
    },
    onServiceWorkerInitialized: (state, action: PayloadAction<undefined>) => {
      state.serviceWorkerInitialized = !state.serviceWorkerInitialized;
    },
  },
  extraReducers(builder) {
    builder
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
      });
  },
});

export const removeNotificationPermissionAsync = createAsyncThunk(
  'removeNotificationPermissionAsync',
  async ({ user, notificationToRemove }: { user: User; notificationToRemove: NotificationTags }) => {
    let newNotificationTags = user.notifications?.filter((x: NotificationTags) => x !== notificationToRemove) ?? [];
    return await SupabaseUserRepository.updateNotificationTags(newNotificationTags, user);
  }
);

export const addNotificationPermissionAsync = createAsyncThunk(
  'addNotificationPermissionAsync',
  async ({ user, notificationToAdd }: { user: User; notificationToAdd: NotificationTags }) => {
    let newNotificationTags = new Set([...(user?.notifications ?? []), notificationToAdd]);
    return await SupabaseUserRepository.updateNotificationTags([...newNotificationTags], user);
  }
);

export const updateCalenderSettingsAsync = createAsyncThunk(
  'updateCalenderSettingsAsync',
  async ({ user, calenderSettings }: { user: User; calenderSettings: CalendarSettingsResult }) => {
    return await SupabaseUserRepository.updateCalenderSettings(calenderSettings, user);
  }
);

export const { onUserChange,  onUpdateServiceWorker, onServiceWorkerInitialized } =
  applicationReducer.actions;

export default applicationReducer.reducer;
