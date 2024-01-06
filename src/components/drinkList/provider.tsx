import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { AlertSnackbar } from "src/components/AlertSnackbar";
import { useDependency } from "src/hooks/useDependency";
import { fetchDrinksAsync } from "src/redux/drinksSlice";
import { RootState, useAppDispatch } from "src/redux/store";
import { IDrinkRepository } from "src/repository/IDrinkRepository";
import DrinkListScreen from ".";


const DrinkListScreenProvider = () => {
    const { user } = useSelector((state: RootState) => state.application);
    const drinksRepository = useDependency<IDrinkRepository>("IDrinkRepository");
    const { drinks, drinksLoading, drinksError } = useSelector((state: RootState) => state.drinks);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (drinksRepository)
            dispatch(fetchDrinksAsync(drinksRepository));
    }, [dispatch, drinksRepository]);

    if (!user || !drinksRepository)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository or user was null!", severity: "error" }} />

    return <DrinkListScreen
        repository={drinksRepository}
        dispatch={dispatch}
        user={user}
        drinks={drinks}
        drinksError={drinksError ?? ""}
        drinksLoading={drinksLoading} />
}

export default DrinkListScreenProvider;