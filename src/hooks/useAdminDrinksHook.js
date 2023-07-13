import { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient";

export const useAdminDrinks = () => {
    const [drinks, setDrinks] = [];
    const [loading, setIsLoading] = useState(false);

    const updateDrink = async (drink) => {
        const { error } = await supabase
            .from('drinks')
            .update(drink)
            .eq('id', drink.id);
    }

    const deleteDrink = async (id) => {
        const { error } = await supabase
            .from('drinks')
            .delete()
            .eq('id', id);
    }

    const addDrink = async (drink) => {
        const { error } = await supabase
            .from('drinks')
            .insert(drink);
    }

    useEffect(() => {
        setIsLoading(true);
        supabase
            .from('drinks')
            .select()
            .then(res => {
                setDrinks(res.data);
                setIsLoading(false);
            });

        supabase
            .channel('any')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'drinks' }, payload => {
                switch (payload.eventType) {
                    case "DELETE":
                        const i = drinks.findIndex(x => x.id === payload.old.id);
                        const newDrinks = [...drinks];
                        if (i > -1)
                            newDrinks.splice(i, 1);
                        setDrinks(newDrinks);
                        break;
                    case "UPDATE":
                    case "INSERT":
                        const i = drinks.findIndex(x => x.id === payload.new.id);
                        const newDrinks = [...drinks];
                        if (i > -1) {
                            newDrinks[i] = payload.new;
                        } else {
                            newDrinks.push(payload.new);
                        }
                        break;
                }
            })
            .subscribe();
    });

    return { drinks, loading, updateDrink, deleteDrink, addDrink };
}