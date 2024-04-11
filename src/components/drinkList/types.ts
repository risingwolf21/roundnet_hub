import {AppDispatch} from "src/redux/store"
import {Drink, User} from "src/types/supabaseTypes"

export type DrinkListScreenProps = {
    dispatch: AppDispatch,
    user: User,
    drinks: Drink[],
    drinksLoading: boolean,
    drinksError: string
}