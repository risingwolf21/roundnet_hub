import { supabase } from "../supabaseClient";

export const useAdminDrinks = () => {

    const updateDrink = async (drink) => {
        await supabase
            .from('drink')
            .update(drink)
            .eq('id', drink.id);
    }

    const deleteDrink = async (id) => {
        await supabase
            .from('drink')
            .delete()
            .eq('id', id);
    }

    const addDrink = async (drink) => {
        await supabase
            .from('drink')
            .insert(drink);
    }

    return { updateDrink, deleteDrink, addDrink };
}