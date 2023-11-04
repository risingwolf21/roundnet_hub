import { Alert, CircularProgress, Divider, Fab, Grid, List, LinearProgress, Snackbar, AlertColor, SnackbarCloseReason } from "@mui/material";
import { SyntheticEvent, useEffect, useState } from "react";
import CheckIcon from '@mui/icons-material/Check';
import { captureException } from "@sentry/react";
import { Error } from "./Error";
import { useClient } from "react-supabase";
import { useSelector } from "react-redux";
import CustomAppBar from "./AppBar";
import { fetchDrinksAsync, fetchPaymentAsync } from "../redux/drinksSlice";
import React from "react";
import { Drink, DrinkCounter, PaymentInsert, User } from "../types/supabaseTypes";
import { RootState } from "../redux/store";
import { useAppDispatch } from "..";
import { TABLE_PAYMENTS } from "../constants";
import { useDependency } from "../hooks/useDependency";
import { IDrinkRepository } from "../repository/IDrinkRepository";
import DrinkItem from "./drinkList/DrinkItem";

const SUCCESS_MESSAGE_INFO: AlertMessage = { message: "Getränke erfolgreich gebucht!", severity: "success" };

type AlertMessage = {
    message: string,
    severity: AlertColor
}

export const DrinkListProvider = () => {
    const drinksRepository = useDependency<IDrinkRepository>("IDrinkRepository");
    const { user } = useSelector((state: RootState) => state.application);
    const { drinks, drinksLoading, drinksError } = useSelector((state: RootState) => state.drinks);

    if (!drinksRepository) {
        return;
    }

    return <DrinkList
        drinksRepository={drinksRepository}
        user={user}
        drinks={drinks}
        drinksError={drinksError ?? ""}
        drinksLoading={drinksLoading} />
}

type DrinkListProps = {
    user: User,
    drinksRepository: IDrinkRepository,
    drinks: Drink[],
    drinksLoading: boolean,
    drinksError: string,
}

const DrinkList = ({ user, drinksRepository, drinks, drinksLoading, drinksError }: DrinkListProps) => {

    const client = useClient();
    const dispatch = useAppDispatch();

    const [addedDrinks, setAddedDrinks] = useState<DrinkCounter[]>([]);
    const [loading, setLoading] = useState(false);
    const [successMessageOpen, setSuccessMessageOpen] = useState(false);
    const [alertInfo, setAlertInfo] = useState(SUCCESS_MESSAGE_INFO);

    useEffect(() => {
        dispatch(fetchDrinksAsync(drinksRepository));
        dispatch(fetchPaymentAsync({ repository: drinksRepository, userId: user.userId }));
    }, [user, dispatch, drinksRepository]);

    const handleSnackbarClose = (event: Event | SyntheticEvent<any, Event>, reason: SnackbarCloseReason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSuccessMessageOpen(false);
    };

    const handleAlertClose = (event: SyntheticEvent<Element, Event>) => {
        setSuccessMessageOpen(false);
    }

    const confirmDrinksDialog = (message: AlertMessage) => {
        setAlertInfo(message);
        setSuccessMessageOpen(true);
        setLoading(false);
    }

    const confirmDrinks = async () => {
        setLoading(true);
        let data = { date: Date.now(), drinks: Object.values(addedDrinks) };

        try {
            let paymentId: number;
            const { data: currentPayment, error } = await drinksRepository.fetchCurrentPaymentForUser(user.userId);

            if (error) {
                throw Error(error)
            }

            if (!currentPayment || currentPayment.length === 0) {
                const { data, error } = await client.from(TABLE_PAYMENTS).insert<PaymentInsert>({
                    userId: user.userId,
                    paymentState: "Open",
                    amountToPay: Object.values(addedDrinks).reduce((prev, curr) => prev + (curr.count * (curr.price ?? 1)), 0)
                }).select().single();

                if (error)
                    throw Error(error);
                paymentId = data.id;
            } else if (currentPayment && currentPayment.length > 1) {
                paymentId = currentPayment[0].id;
            } else {
                paymentId = currentPayment[0].id;
            }

            if (!paymentId)
                throw Error({ message: "Payment ID could not be found" })

            const result = await drinksRepository.insertHistoryItems(Object.values(addedDrinks), user.userId, paymentId)
            if (!result || result.error) {
                throw Error({ message: "Drink could not be added to your history. [" + result?.error + "]" });
            }

            setLoading(false);
            setAddedDrinks([]);
            confirmDrinksDialog(SUCCESS_MESSAGE_INFO);
        }
        catch (error) {
            setLoading(false);
            let message = (error as Error).message;
            confirmDrinksDialog({ message, severity: "error" });
            captureException(Error({ message }), (scope) => {
                scope.clear();
                scope.setExtra("data", JSON.stringify(data));
                return scope;
            });
        }
    }

    const onAddDrinkClick = (drink: Drink) => {
        var temp = addedDrinks;
        if (drink.id in temp) {
            temp[drink.id].count = temp[drink.id].count + 1;
        } else {
            temp[drink.id] = { count: 1, ...drink };
        }
        setAddedDrinks({ ...temp });
    }

    const onRemoveDrinkClick = (drink: Drink) => {
        var temp = addedDrinks;
        if (drink.id in temp) {
            if (temp[drink.id].count - 1 === 0) {
                delete temp[drink.id];
            } else {
                temp[drink.id].count = temp[drink.id].count - 1;
            }
        }
        setAddedDrinks({ ...temp });
    }

    if (drinksError)
        return <Error message={drinksError} />

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar />
        {drinksLoading && <LinearProgress style={{ position: "fixed", left: 0, right: 0, top: 56 }} />}
        <List sx={{ width: "100%" }}>
            {
                drinks && drinks.filter((x: Drink) => !x.deleted && x.active).map((drink: Drink, index: number) => {
                    return <div key={index}>
                        <DrinkItem
                            drink={drink}
                            onAddClick={() => onAddDrinkClick(drink)}
                            onMinusClick={() => onRemoveDrinkClick(drink)}
                            count={addedDrinks[drink.id]?.count ?? 0} />
                        <Divider />
                    </div>
                })
            }
        </List>
        {
            Object.values(addedDrinks).length > 0 && <>
                <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "56px", mb: "16px" }} disabled={loading} onClick={confirmDrinks}>
                    {
                        loading ? <CircularProgress /> : <CheckIcon sx={{ color: "white" }} />
                    }
                </Fab>
            </>
        }

        <Snackbar sx={{ position: "fixed", right: "16px", bottom: "72px" }} open={successMessageOpen} onClose={handleSnackbarClose}>
            <Alert onClose={handleAlertClose} severity={alertInfo.severity} sx={{ width: '100%' }}>
                {alertInfo.message}
            </Alert>
        </Snackbar>
    </Grid >);
}

export default DrinkList;
