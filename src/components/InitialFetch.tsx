import {useEffect} from "react";
import {RootState, useAppDispatch} from "../redux/store";
import {useClient} from "react-supabase";
import {fetchSingleEventAsync} from "../features/events/slices/eventsSlice";
import {useSelector} from "react-redux";
import {fetchNotVerifiedUsersAsync} from "../features/admin/slices/adminUserSlice";
import {
    fetchNotificationsAsync,
    onNotificationDelete,
    onNotificationInsert,
    onNotificationUpdate
} from "../features/notifications/slices/notificationsSlice";

export const useInitialFetch = () => {
    const dispatch = useAppDispatch();
    const client = useClient();
    const {user} = useSelector((state: RootState) => state.application);

    useEffect(() => {
        if (!user)
            return;

        dispatch(fetchNotVerifiedUsersAsync())

    }, [dispatch, client, user]);

    useEffect(() => {

        if (!user)
            return;

        dispatch(fetchNotificationsAsync(user))

        let subscription = client.channel("public:notifications")
            .on<NotificationUpdate>('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                table: 'notifications',
                filter: `user=eq.${user.userId}`
                }, payload => dispatch(onNotificationUpdate(payload.new))
            )
            .on('postgres_changes', {
                    event: 'DELETE',
                    schema: 'public',
                table: 'notifications',
                filter: `user=eq.${user.userId}`
                }, payload => dispatch(onNotificationDelete(payload.old.id))
            )
            .on<NotificationInsert>('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                table: 'notifications',
                filter: `user=eq.${user.userId}`
                }, payload => dispatch(onNotificationInsert(payload.new))
            )
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }

    }, [dispatch, client, user]);

    useEffect(() => {
        if (!user)
            return;
        let subscription = client.channel("public:events")
            .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'events'
                }, payload => dispatch(fetchSingleEventAsync({
                    eventId: payload.new.id,
                    userId: user.userId
                }))
            )
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'key_holders'
            }, payload => dispatch(fetchSingleEventAsync({
                eventId: payload.new.id,
                userId: user.userId
            })))
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }
    }, [dispatch, client, user]);

}