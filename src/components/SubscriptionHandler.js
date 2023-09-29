import { useClient } from "react-supabase";
import { useEffect } from "react";
import { connect } from "react-redux";
import { onHistoryDelete, onHistoryInsert, onHistoryUpdate } from "../redux/historyReducer";
import { drinkDeleted, drinkInserted, drinkUpdated } from "../redux";

const SubscriptionHandler = ({ children, dispatch }) => {

    const client = useClient();

    useEffect(() => {
        let subscription = client
            .channel('any')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drink' }, payload => dispatch(drinkUpdated(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'drink' }, payload => dispatch(drinkDeleted(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drink' }, payload => dispatch(drinkInserted(payload)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'history' }, payload => dispatch(onHistoryUpdate(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'history' }, payload => dispatch(onHistoryDelete(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'history' }, payload => dispatch(onHistoryInsert(payload)))

            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'history' }, payload => dispatch(onHistoryUpdate(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'history' }, payload => dispatch(onHistoryDelete(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'history' }, payload => dispatch(onHistoryInsert(payload)))
            .subscribe(x => console.log(x), x => console.log(x));

        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch]);

    return children;
}

export default connect()(SubscriptionHandler);