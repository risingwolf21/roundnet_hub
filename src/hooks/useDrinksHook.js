import { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient";

export const useAllDrinks = ({ dispatch }) => {
    const [loading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        supabase
            .from('drinks')
            .select()
            .then(res => {
                dispatch(drinks_changed(res.data));
                setIsLoading(false);
            });

        supabase
            .channel('any')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'drinks' }, payload => {
                switch (payload.eventType) {
                    case "DELETE":
                        dispatch(drink_deleted(payload.old.id));
                        break;
                    case "UPDATE":
                    case "INSERT":
                        dispatch(drink_updated(payload.new))
                        break;
                }
            })
            .subscribe();
    });

    return loading;
}