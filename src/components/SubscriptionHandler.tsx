import { useClient } from "react-supabase";
import { Dispatch, useEffect } from "react";
import { connect, useSelector } from "react-redux";
import { onHistoryDelete, onHistoryInsert, onHistoryUpdate, onDrinkDeleted, onDrinkInserted, onDrinkUpdated, onPaymentUpdated, onPaymentDeleted } from "../redux/drinksSlice";
import { onEventAttendanceUserDelete, onEventAttendanceUserInsert, onEventAttendanceUserUpdate, onEventCommentDelete, onEventCommentInsert, onEventCommentUpdate, onEventDelete, onEventInsert, onEventUpdate } from "../redux/eventSlice";
import { AnyAction } from "@reduxjs/toolkit";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Comment, Drink, Payment } from "../types/supabaseTypes";

declare module "@supabase/supabase-js" {
    export interface RealtimeChannel {
        addBasicSubscriptions(dispatch: Dispatch<AnyAction>, userId: string): RealtimeChannel
        addAdminSubscriptionbs(dispatch: Dispatch<AnyAction>, userId: string, active: boolean): RealtimeChannel
    }
}

RealtimeChannel.prototype.addBasicSubscriptions = function (dispatch: Dispatch<AnyAction>, userId: string): RealtimeChannel {
    return this
        .on<Drink>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drink' }, payload => dispatch(onDrinkUpdated(payload.new)))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'drink' }, payload => dispatch(onDrinkDeleted(payload.old.id)))
        .on<Drink>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drink' }, payload => dispatch(onDrinkInserted(payload.new)))

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
        .on<Comment>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_comments' }, payload => dispatch(onEventCommentInsert(payload.new)));
}

RealtimeChannel.prototype.addAdminSubscriptionbs = function (dispatch: Dispatch<AnyAction>, userId: string, active: boolean): RealtimeChannel {
    return this;
}

const SubscriptionHandler = ({ children, dispatch }: { dispatch: Dispatch<AnyAction>, children: any }) => {

    const client = useClient();
    const { user } = useSelector((state: any) => state.application);

    useEffect(() => {
        let subscription = client
            .channel('any')

            .addBasicSubscriptions(dispatch, user.id)

            .addAdminSubscriptionbs(dispatch, user.id, user.role === "admin")

            .subscribe(x => console.log(x));

        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch, user]);

    return children;
}

export default connect()(SubscriptionHandler);