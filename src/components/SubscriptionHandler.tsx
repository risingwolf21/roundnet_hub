import { useClient } from "react-supabase";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { onEventAttendanceUserDelete, onEventAttendanceUserInsert, onEventAttendanceUserUpdate, onEventCommentDelete, onEventCommentInsert, onEventCommentUpdate } from "../redux/eventSlice";
import { Comment } from "../types/supabaseTypes";
import { useAppDispatch } from "src";
import { RootState } from "src/redux/store";


export const SubscriptionHandler = ({ children }: { children: any }) => {

    const client = useClient();
    const dispatch = useAppDispatch();
    const { user } = useSelector((state: RootState) => state.application);

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