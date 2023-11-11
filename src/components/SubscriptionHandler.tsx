import { useClient } from "react-supabase";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { onHistoryDelete, onHistoryInsert, onHistoryUpdate, onDrinkDeleted, onDrinkInserted, onDrinkUpdated, onPaymentUpdated, onPaymentDeleted } from "../redux/drinksSlice";
import { onEventAttendanceUserDelete, onEventAttendanceUserInsert, onEventAttendanceUserUpdate, onEventCommentDelete, onEventCommentInsert, onEventCommentUpdate, onEventDelete, onEventInsert, onEventUpdate } from "../redux/eventSlice";
import { Comment, DrinkInsert, DrinkUpdate, Payment } from "../types/supabaseTypes";
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

            .on<DrinkUpdate>("postgres_changes", { event: "UPDATE", schema: "public", table: "drink" }, (payload) => dispatch(onDrinkUpdated(payload.new)))
            .on<DrinkInsert>("postgres_changes", { event: "INSERT", schema: "public", table: "drink" }, (payload) => dispatch(onDrinkInserted(payload.new)))
            .on("postgres_changes", { event: "DELETE", schema: "public", table: "drink" }, (payload) => dispatch(onDrinkDeleted(payload.old.id)))

            .on<Payment>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: "user=eq." + userId }, payload => dispatch(onPaymentUpdated(payload.new)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'payments', filter: "user=eq." + userId }, payload => dispatch(onPaymentDeleted(payload.old.id)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'history', filter: "user=eq." + userId }, payload => dispatch(onHistoryUpdate(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'history', filter: "user=eq." + userId }, payload => dispatch(onHistoryDelete(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'history', filter: "user=eq." + userId }, payload => dispatch(onHistoryInsert(payload)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' }, payload => dispatch(onEventUpdate(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events' }, payload => dispatch(onEventDelete(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => dispatch(onEventInsert(payload)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_attendance_user_mapping', filter: "user=eq." + userId }, payload => dispatch(onEventAttendanceUserUpdate(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'event_attendance_user_mapping', filter: "user=eq." + userId }, payload => dispatch(onEventAttendanceUserDelete(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_attendance_user_mapping', filter: "user=eq." + userId }, payload => dispatch(onEventAttendanceUserInsert(payload)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_comments' }, payload => dispatch(onEventCommentUpdate(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'event_comments' }, payload => dispatch(onEventCommentDelete(payload)))
            .on<Comment>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_comments' }, payload => dispatch(onEventCommentInsert(payload.new)))

            .subscribe(x => console.log(x));

        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch, user]);

    return children;
}