import { useClient } from "react-supabase";
import { onDrinkDelete, onDrinkInsert, onDrinkUpdate } from "../redux/drinkListReducer";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const SubscriptionHandler = ({ children }) => {

    const client = useClient();
    const dispatch = useDispatch();

    useEffect(() => {
        console.log("adding subscription")
        let subscription = client
            .channel("any")
            .on('postgres_changes', { event: 'DELETE', schema: "public", table: "drink" }, (payload) => dispatch(onDrinkDelete(payload)))
            .on('postgres_changes', { event: 'INSERT', schema: "public", table: "drink" }, (payload) => dispatch(onDrinkInsert(payload)))
            .on('postgres_changes', { event: 'UPDATE', schema: "public", table: "drink" }, (payload) => dispatch(onDrinkUpdate(payload)))
            .subscribe();

        return () => {
            console.log("deleting subscription")

            subscription.unsubscribe();
        }
    }, [dispatch]);

    return children;
}

export default SubscriptionHandler;