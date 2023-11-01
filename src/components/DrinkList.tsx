import { Alert, CircularProgress, Divider, Fab, Grid, List, LinearProgress, Snackbar, AlertColor, SnackbarCloseReason } from "@mui/material";
import DrinkItem from "./DrinkItem";
import { SyntheticEvent, useEffect, useState } from "react";
import CheckIcon from '@mui/icons-material/Check';
import { captureException } from "@sentry/react";
import { Error } from "./Error";
import { useClient } from "react-supabase";
import { useSelector } from "react-redux";
import CustomAppBar from "./AppBar";
import { fetchPaymentAsync } from "../redux/drinksSlice";
import React from "react";
import { Drink, DrinkCounter } from "../types/supabaseTypes";
import { RootState } from "../redux/store";
import { useAppDispatch } from "..";
import { TABLE_HISTORY, TABLE_PAYMENTS } from "../constants";
import { Box } from "@mui/system";
import { LocalDrink } from "@mui/icons-material";
import { useCaptureException } from "../hooks/useCaptureException";
import { useDependency } from "../hooks/useDependency";
import { IDrinkRepository } from "../repository/IDrinkRepository";

const SUCCESS_MESSAGE_INFO: AlertMessage = { message: "Getränke erfolgreich gebucht!", severity: "success" };

type AlertMessage = {
    message: string,
    severity: AlertColor
}

const DrinkList = () => {

    const { user } = useSelector((state: RootState) => state.application);
    const client = useClient();
    const dispatch = useAppDispatch();
    const drinksRepository = useDependency<IDrinkRepository>("IDrinkRepository");

    const { drinks, drinksLoading, drinksError, payment } = useSelector((state: RootState) => state.drinks);
    useCaptureException(drinksError);

    const [addedDrinks, setAddedDrinks] = useState<DrinkCounter[]>([]);
    const [loading, setLoading] = useState(false);
    const [successMessageOpen, setSuccessMessageOpen] = useState(false);
    const [alertInfo, setAlertInfo] = useState(SUCCESS_MESSAGE_INFO);

    useEffect(() => {
        if (user) {
            dispatch(fetchPaymentAsync({ repository: drinksRepository, userId: user.userId }));
        }
    }, [client, user, dispatch]);

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
            if (!payment || payment.paymentState !== "Open") {
                const { data: paymentUpdate } = await client.from(TABLE_PAYMENTS)
                    .select("*").eq("userId", user.userId).eq("paymentState", "Open").single();
                if (!paymentUpdate) {
                    const { data, error } = await client.from(TABLE_PAYMENTS).insert({
                        userId: user.userId,
                        paymentState: "Open"
                    }).select().single();
                    if (error)
                        throw Error(error);
                    paymentId = data.id;
                } else {
                    paymentId = paymentUpdate.id;
                }
            } else {
                paymentId = payment?.id;
            }

            if (!paymentId)
                throw Error({ message: "Payment ID could not be found" })

            const { error } = await client.from(TABLE_HISTORY).insert(
                Object.values(addedDrinks).map((drink) => {
                    return {
                        user: user.userId,
                        drink: drink.id,
                        count: drink.count,
                        payment: paymentId,
                        amount: drink.count * (drink.price ?? 1)
                    }
                })
            );
            if (error)
                throw error;

            setLoading(false);
            setAddedDrinks([]);
            confirmDrinksDialog(SUCCESS_MESSAGE_INFO);
        }
        catch (error) {
            setLoading(false);
            const message = error instanceof Error ? (error as Error).message : "Unknown error."
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
                <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "56px", mb: "16px" }} onClick={confirmDrinks}>
                    {
                        loading ? <CircularProgress /> : <CheckIcon sx={{ color: "white" }} />
                    }
                </Fab>
            </>
        }

        <Snackbar sx={{ position: "fixed", right: "16px", bottom: "72px" }} open={successMessageOpen} autoHideDuration={1500} onClose={handleSnackbarClose}>
            <Alert onClose={handleAlertClose} severity={alertInfo.severity} sx={{ width: '100%' }}>
                {alertInfo.message}
            </Alert>
        </Snackbar>
    </Grid >);
}

export default DrinkList;
