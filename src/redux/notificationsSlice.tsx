import {createAsyncThunk, createEntityAdapter, createSlice, PayloadAction, Update} from "@reduxjs/toolkit";
import {Notification, NotificationInsert, NotificationUpdate, User} from "../types/supabaseTypes";
import {RootState} from "./store";
import {SupabaseUserRepository} from "../repository/UserRepository";
import {Tables} from "../types/supabase-generated.types";

const notificationsAdapter = createEntityAdapter({
    selectId: (notification: Tables<'notifications'>) => notification.id,
});

export const notificationsSelector = notificationsAdapter.getSelectors((st: RootState) => st.notifications);


const notificationsSlice = createSlice({
    name: "notifications",
    initialState: notificationsAdapter.getInitialState({
        loading: false,
        error: null as string | null
    }),
    reducers: {
        onNotificationDelete: (state, action: PayloadAction<string>) => {
            notificationsAdapter.removeOne(state, action.payload);
        },
        onNotificationInsert: (state, action: PayloadAction<NotificationInsert>) => {
            if (!action.payload.id)
                return;
            notificationsAdapter.addOne(state, {
                id: action.payload.id,
                body: action.payload.body ?? "",
                created_at: action.payload.created_at ?? "",
                user: action.payload.user ?? "",
                title: action.payload.title ?? ""
            } as Notification)
        },
        onNotificationUpdate: (state, action: PayloadAction<NotificationUpdate>) => {
            let notification = notificationsAdapter.getSelectors().selectById(state, action.payload.id ?? -1);
            if (!notification)
                return;
            let update = action.payload;

            let changes = {
                id: notification.id,
                changes: {
                    body: update.body ?? notification.body,
                    created_at: update.created_at ?? notification.created_at,
                    user: update.user ?? notification.user,
                    title: update.title ?? notification.title
                }
            } as Update<Notification>;

            notificationsAdapter.updateOne(state, changes)
        }
    },
    extraReducers(builder) {
        builder
            .addCase(fetchNotificationsAsync.fulfilled, (state, action) => {
                notificationsAdapter.setAll(state, action.payload);
                state.loading = false;
            })
            .addCase(fetchNotificationsAsync.pending, (state) => {
                state.loading = true;
                state.error = "";
            })
            .addCase(fetchNotificationsAsync.rejected, (state, action) => {
                state.error = action.error.message ?? "";
            })
    }
});

export const fetchNotificationsAsync = createAsyncThunk("fetchNotificationsAsync", async (user: User) => {
    const response = await SupabaseUserRepository.loadNotifications(user);

    return response.data ?? [];
});

export const {onNotificationDelete, onNotificationUpdate, onNotificationInsert} = notificationsSlice.actions;


export default notificationsSlice.reducer;