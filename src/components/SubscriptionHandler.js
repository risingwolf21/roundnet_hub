import { useClient } from "react-supabase";
import { onDrinkDelete, onDrinkInsert, onDrinkUpdate } from "../redux/drinkListReducer";
import { useEffect } from "react";
import { connect } from "react-redux";
import { onHistoryDelete, onHistoryInsert, onHistoryUpdate } from "../redux/historyReducer";

const SubscriptionHandler = ({ children, dispatch }) => {

    const client = useClient();

    useEffect(() => {
        let subscription = client
            .channel('any')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drink' }, payload => dispatch(onDrinkUpdate(payload)))
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'drink' }, payload => dispatch(onDrinkDelete(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drink' }, payload => dispatch(onDrinkInsert(payload)))

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