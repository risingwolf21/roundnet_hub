import { AppDispatch } from "src/redux/store"
import { IDrinkRepository } from "src/repository/IDrinkRepository"
import { Drink, User } from "src/types/supabaseTypes"

export type DrinkListScreenProps = {
    repository: IDrinkRepository,
    dispatch: AppDispatch,
    user: User,
    drinks: Drink[],
    drinksLoading: boolean,
    drinksError: string
}