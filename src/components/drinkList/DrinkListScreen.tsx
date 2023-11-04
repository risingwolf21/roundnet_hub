import { Alert, CircularProgress, Fab, Grid } from "@mui/material";
import { useEffect, useState } from "react";
import CheckIcon from '@mui/icons-material/Check';
import { captureException } from "@sentry/react";
import { Error } from "../Error";
import { useClient } from "react-supabase";
import { useSelector } from "react-redux";
import CustomAppBar from "src/components/AppBar";
import React from "react";
import DrinkList from "./DrinkList";
import { MultiplePaymentsError } from "src/utils";
import { RootState } from "src/redux/store";
import { useAppDispatch } from "src";
import { useDependency } from "src/hooks/useDependency";
import { IDrinkRepository } from "src/repository/IDrinkRepository";
import { Drink, DrinkCounter } from "src/types/supabaseTypes";
import { useCaptureException } from "src/hooks/useCaptureException";
import { fetchPaymentAsync } from "src/redux/drinksSlice";
import { AlertMessage, AlertSnackbar } from "src/components/AlertSnackbar";
import { LoadingIndicator } from "src/components/LoadingIndicator";

const SUCCESS_MESSAGE_INFO: AlertMessage = { message: "Getränke erfolgreich gebucht!", severity: "success" };

const DrinkListScreen = () => {
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
        if (user && drinksRepository) {
            dispatch(fetchPaymentAsync({ repository: drinksRepository, userId: user.userId }));
        }
    }, [client, user, dispatch, drinksRepository]);

    const confirmDrinksDialog = (message: AlertMessage) => {
        setAlertInfo(message);
        setSuccessMessageOpen(true);
        setLoading(false);
    }

    const confirmDrinks = async () => {
        setLoading(true);
        let data = { date: Date.now(), drinks: Object.values(addedDrinks) };

        try {
            if (!drinksRepository)
                throw Error({ message: "IDrinkRepository was not defined!" })

            let paymentId: number;
            if (!payment || payment.paymentState !== "Open") {
                const result = await drinksRepository.fetchCurrentPaymentForUser(user.userId)
                if (!result || !result.data) {
                    const paymentCreation = await drinksRepository.insertNewPayment(user.userId);

                    if (!paymentCreation || paymentCreation && paymentCreation.error)
                        throw Error({ message: paymentCreation?.error?.message ?? "Could not create payment" });

                    if (!paymentCreation.data.id)
                        throw Error({ message: "Could not create payment" });

                    paymentId = paymentCreation.data.id;
                } else if (result.data && result.data.length > 0) {
                    paymentId = result.data[0].id;
                    captureException(new MultiplePaymentsError(), (scope) => {
                        scope.clear();
                        scope.setExtra("result", JSON.stringify(result));
                        scope.setExtra("user", JSON.stringify(user));
                        return scope;
                    });
                    confirmDrinksDialog({ message: "There were multiple payments found. Please contact your admin! Your drinks still have been added to your current open payment.", severity: "warning" });
                } else {
                    paymentId = result.data[0].id;
                }
            } else {
                paymentId = payment?.id;
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
        <LoadingIndicator loading={drinksLoading} />
        <DrinkList drinks={drinks} onAddDrinkClick={onAddDrinkClick} onRemoveDrinkClick={onRemoveDrinkClick} addedDrinks={addedDrinks} />
        {
            Object.values(addedDrinks).length > 0 && <>
                <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "56px", mb: "16px" }} onClick={confirmDrinks}>
                    {
                        loading ? <CircularProgress /> : <CheckIcon sx={{ color: "white" }} />
                    }
                </Fab>
            </>
        }

        <AlertSnackbar open={successMessageOpen} onClose={() => setSuccessMessageOpen(false)} alertInfo={alertInfo} />

    </Grid >);
}

export default DrinkListScreen;