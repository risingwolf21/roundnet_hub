import { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient";

export const useFilteredDrinks = ({ dispatch, state }) => {
    const [loading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        let query = supabase
            .from('drinks')
            .select();
        if(state)
            query = query.eq("state", state)

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