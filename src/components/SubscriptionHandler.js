import { useClient } from "react-supabase";
import { useEffect } from "react";
import { connect } from "react-redux";
import { onHistoryDelete, onHistoryInsert, onHistoryUpdate, onDrinkDeleted, onDrinkInserted, onDrinkUpdated, onPaymentUpdated, onPaymentDeleted } from "../redux/drinksSlice";
import { useAuth } from "../hooks/useAuth";

const SubscriptionHandler = ({ children, dispatch }) => {

    const client = useClient();
    const { user } = useAuth();

    useEffect(() => {
        let subscription = client
            .channel('any')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drink' }, payload => dispatch(onDrinkUpdated(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'drink' }, payload => dispatch(onDrinkDeleted(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drink' }, payload => dispatch(onDrinkInserted(payload)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: "user=eq." + user.id }, payload => dispatch(onPaymentUpdated(payload)))
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payments', filter: "user=eq." + user.id }, payload => dispatch(onPaymentDeleted(payload)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'history', filter: "user=eq." + user.id }, payload => dispatch(onHistoryUpdate(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'history', filter: "user=eq." + user.id }, payload => dispatch(onHistoryDelete(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'history', filter: "user=eq." + user.id }, payload => dispatch(onHistoryInsert(payload)))

            .subscribe(x => console.log(x), x => console.log(x));

        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch, user]);

    return children;
}

export default connect()(SubscriptionHandler);