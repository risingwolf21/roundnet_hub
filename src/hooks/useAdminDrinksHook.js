import { supabase } from "../supabaseClient";

export const useAdminDrinks = () => {

    const updateDrink = async (drink) => {
        await supabase
            .from('drinks')
            .update(drink)
            .eq('id', drink.id);
    }

    const deleteDrink = async (id) => {
        await supabase
            .from('drinks')
            .delete()
            .eq('id', id);
    }

    const addDrink = async (drink) => {
        await supabase
            .from('drinks')
            .insert(drink);
    }

    return { updateDrink, deleteDrink, addDrink };
}