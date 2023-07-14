import { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient";
import { useSubscription } from './useSubscription';

export const useRealtime = () => {

    const [drinks, setDrinks] = useState([])
    const [loading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        supabase
            .from('drinks')
            .select()
            .eq('active', true)
            .then(res => {
                setDrinks(res.data)
                setIsLoading(false);
            });
    }, []);

    useSubscription({ event: '*', schema: 'public', table: 'drinks' }, payload => {
        switch (payload.eventType) {
            case "DELETE":
                {
                    const i = drinks.findIndex(x => x.id === payload.old.id);
                    const newDrinks = [...drinks];
                    if (i > -1)
                        newDrinks.splice(i, 1);
                    setDrinks(newDrinks);
                }
                break;
            case "UPDATE":
            case "INSERT":
                const i = drinks.findIndex(x => x.id === payload.new.id);
                const newDrinks = [...drinks];
                if (i > -1) {
                    newDrinks[i] = payload.new;
                } else if (payload.new.active) {
                    newDrinks.push(payload.new);
                }
                setDrinks(newDrinks.filter(x => x.active));
                break;
            default:
        }
    });

    return { loadingDrinks: loading, drinks };
}
