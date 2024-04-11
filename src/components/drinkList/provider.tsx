import React, {useEffect} from "react";
import {useSelector} from "react-redux";
import {AlertSnackbar} from "src/components/AlertSnackbar";
import {fetchDrinksAsync} from "src/redux/drinksSlice";
import {RootState, useAppDispatch} from "src/redux/store";
import DrinkListScreen from ".";


const DrinkListScreenProvider = () => {
    const {user} = useSelector((state: RootState) => state.application);
    const {drinks, drinksLoading, drinksError} = useSelector((state: RootState) => state.drinks);
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(fetchDrinksAsync());
    }, [dispatch]);

    if (!user)
        return <AlertSnackbar close={() => {
        }} alertInfo={{message: "Fatal error occured. Repository or user was null!", severity: "error"}}/>

    return <DrinkListScreen
        dispatch={dispatch}
        user={user}
        drinks={drinks}
        drinksError={drinksError ?? ""}
        drinksLoading={drinksLoading}/>
}

export default DrinkListScreenProvider;