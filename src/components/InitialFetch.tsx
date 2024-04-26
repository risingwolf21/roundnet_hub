import {useEffect} from "react";
import {RootState, useAppDispatch} from "../redux/store";
import {useClient} from "react-supabase";
import {fetchSingleEventAsync} from "../redux/events/eventsSlice";
import {useSelector} from "react-redux";
import {fetchNotVerifiedUsersAsync} from "../redux/adminUserSlice";
import {useDependency} from "../hooks/useDependency";
import {IAdminUsersRepository} from "../repository/IAdminUsersRepository";
import {
    fetchNotificationsAsync,
    onNotificationDelete,
    onNotificationInsert,
    onNotificationUpdate
} from "../redux/notificationsSlice";
import {NotificationInsert, NotificationUpdate} from "../types/supabaseTypes";

export const useInitialFetch = () => {
    const dispatch = useAppDispatch();
    const client = useClient();
    const {user} = useSelector((state: RootState) => state.application);
    const adminUserRepository = useDependency<IAdminUsersRepository>("IAdminUsersRepository");

    useEffect(() => {
        if (!user || !adminUserRepository)
            return;

        dispatch(fetchNotVerifiedUsersAsync(adminUserRepository))

    }, [dispatch, client, user, adminUserRepository]);

    useEffect(() => {

        dispatch(fetchNotificationsAsync())

        let subscription = client.channel("public:notifications")
            .on<NotificationUpdate>('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications'
                }, payload => dispatch(onNotificationUpdate(payload.new))
            )
            .on('postgres_changes', {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'notifications'
                }, payload => dispatch(onNotificationDelete(payload.old.id))
            )
            .on<NotificationInsert>('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications'
                }, payload => dispatch(onNotificationInsert(payload.new))
            )
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }

    }, [dispatch, client]);

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