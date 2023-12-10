import { useClient } from "react-supabase";
import { useContext, useEffect } from "react";
import { useSelector } from "react-redux";
import { onEventAttendanceUserDelete, onEventAttendanceUserInsert, onEventAttendanceUserUpdate, onEventCommentDelete, onEventCommentInsert, onEventCommentUpdate } from "../redux/eventSlice";
import { Comment } from "../types/supabaseTypes";
import { DependencyContext, useAppDispatch } from "src";
import { RootState } from "src/redux/store";
import { fetchAdminUsersAsync } from "src/redux/adminUserSlice";
import { fetchDrinksAsync } from "src/redux/adminDrinksSlice";
import { useDependency } from "src/hooks/useDependency";
import { IAdminUsersRepository } from "src/repository/IAdminUsersRepository";
import { IAdminDrinksRepository } from "src/repository/IAdminDrinksRepository";


export const SubscriptionHandler = ({ children }: { children: any }) => {

    const client = useClient();
    const dispatch = useAppDispatch();
    const { container } = useContext(DependencyContext);
    const { user } = useSelector((state: RootState) => state.application);

    useEffect(() => {
        if (user && user.role === "admin") {
            let adminUsersRepository = container?.get<IAdminUsersRepository>("IAdminUsersRepository")
            if (adminUsersRepository)
                dispatch(fetchAdminUsersAsync(adminUsersRepository));
        }
    }, [dispatch, user]);

    useEffect(() => {
        if (user && user.role === "admin") {
            let adminDrinksRepository = container?.get<IAdminDrinksRepository>("IAdminDrinksRepository");
            if (adminDrinksRepository)
                dispatch(fetchDrinksAsync(adminDrinksRepository));
        }
    }, [dispatch, user]);

    useEffect(() => {
        if (!user)
            return;
        let userId = user.userId;
        let subscription = client
            .channel('public:drink')

            // .on<Payment>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: "user=eq." + userId }, payload => dispatch(onPaymentUpdated(payload.new)))
            // .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'payments', filter: "user=eq." + userId }, payload => dispatch(onPaymentDeleted(payload.old.id)))

            // .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' }, payload => dispatch(onEventUpdate(payload)))
            // .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events' }, payload => dispatch(onEventDelete(payload)))
            // .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => dispatch(onEventInsert(payload)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_attendance_user_mapping', filter: "user=eq." + userId }, payload => dispatch(onEventAttendanceUserUpdate(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'event_attendance_user_mapping', filter: "user=eq." + userId }, payload => dispatch(onEventAttendanceUserDelete(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_attendance_user_mapping', filter: "user=eq." + userId }, payload => dispatch(onEventAttendanceUserInsert(payload)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_comments' }, payload => dispatch(onEventCommentUpdate(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'event_comments' }, payload => dispatch(onEventCommentDelete(payload)))
            .on<Comment>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_comments' }, payload => dispatch(onEventCommentInsert(payload.new)))

            .subscribe();

        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch, user]);

    return children;
}