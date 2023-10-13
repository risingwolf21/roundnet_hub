import { useClient } from "react-supabase";
import { useEffect } from "react";
import { connect, useSelector } from "react-redux";
import { onHistoryDelete, onHistoryInsert, onHistoryUpdate, onDrinkDeleted, onDrinkInserted, onDrinkUpdated, onPaymentUpdated, onPaymentDeleted } from "../redux/drinksSlice";
import { onEventAttendanceUserDelete, onEventAttendanceUserInsert, onEventAttendanceUserUpdate, onEventCommentDelete, onEventCommentInsert, onEventCommentUpdate, onEventDelete, onEventInsert, onEventUpdate } from "../redux/eventReducer";

const SubscriptionHandler = ({ children, dispatch }) => {

    const client = useClient();
    const { user } = useSelector(state => state.application);

    useEffect(() => {
        let subscription = client
            .channel('any')
            .on('postgres_changes', { event: '*', schema: 'public', table: '*' }, payload => console.log(payload))
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drink' }, payload => dispatch(onDrinkUpdated(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'drink' }, payload => dispatch(onDrinkDeleted(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drink' }, payload => dispatch(onDrinkInserted(payload)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: "user=eq." + user.id }, payload => dispatch(onPaymentUpdated(payload)))
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: "user=eq." + user.id }, payload => dispatch(onPaymentDeleted(payload)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'history', filter: "user=eq." + user.id }, payload => dispatch(onHistoryUpdate(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'history', filter: "user=eq." + user.id }, payload => dispatch(onHistoryDelete(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'history', filter: "user=eq." + user.id }, payload => dispatch(onHistoryInsert(payload)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' }, payload => dispatch(onEventUpdate(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events' }, payload => dispatch(onEventDelete(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => dispatch(onEventInsert(payload)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_attendance_user_mapping', filter: "user=eq." + user.id }, payload => dispatch(onEventAttendanceUserUpdate(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'event_attendance_user_mapping', filter: "user=eq." + user.id }, payload => dispatch(onEventAttendanceUserDelete(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_attendance_user_mapping', filter: "user=eq." + user.id }, payload => dispatch(onEventAttendanceUserInsert(payload)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_comments' }, payload => dispatch(onEventCommentUpdate(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'event_comments' }, payload => dispatch(onEventCommentDelete(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_comments' }, payload => dispatch(onEventCommentInsert(payload)))

            .subscribe(x => console.log(x), x => console.error(x));

        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch, user]);

    return children;
}

export default connect()(SubscriptionHandler);