import { Box, CircularProgress, Fab } from "@mui/material";
import { useEffect, useState } from "react";
import CheckIcon from '@mui/icons-material/Check';
import { captureException } from "@sentry/react";
import { Error } from "../Error";
import { useSelector } from "react-redux";
import CustomAppBar from "src/components/AppBar";
import React from "react";
import DrinkList from "./DrinkList";
import { MultiplePaymentsError } from "src/utils";
import { RootState } from "src/redux/store";
import { useAppDispatch } from "src";
import { useDependency } from "src/hooks/useDependency";
import { IDrinkRepository } from "src/repository/IDrinkRepository";
import { Drink, DrinkCounter, User } from "src/types/supabaseTypes";
import { fetchDrinksAsync, fetchPaymentAsync } from "src/redux/drinksSlice";
import { AlertMessage, AlertSnackbar } from "src/components/AlertSnackbar";
import { LoadingIndicator } from "src/components/LoadingIndicator";

const SUCCESS_MESSAGE_INFO: AlertMessage = { message: "Getränke erfolgreich gebucht!", severity: "success" };

export const DrinkListScreenProvider = () => {
    const { user } = useSelector((state: RootState) => state.application);
    const drinksRepository = useDependency<IDrinkRepository>("IDrinkRepository");
    const { drinks, drinksLoading, drinksError } = useSelector((state: RootState) => state.drinks);

    if (!user || !drinksRepository)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository or user was null!", severity: "error" }} />

    return <DrinkListScreen
        repository={drinksRepository}
        user={user}
        drinks={drinks}
        drinksError={drinksError ?? ""}
        drinksLoading={drinksLoading} />
}

type DrinkListScreenProps = {
    repository: IDrinkRepository,
    user: User,
    drinks: Drink[],
    drinksLoading: boolean,
    drinksError: string
}

const DrinkListScreen = ({ repository, user, drinks, drinksLoading, drinksError }: DrinkListScreenProps) => {
    const dispatch = useAppDispatch();

    const [addedDrinks, setAddedDrinks] = useState<DrinkCounter[]>([]);
    const [loading, setLoading] = useState(false);
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

    useEffect(() => {
        if (drinksError) {
            setAlertInfo({ message: drinksError, severity: "error" });
        }
    }, [drinksError])

    useEffect(() => {
        dispatch(fetchPaymentAsync({ repository, userId: user.userId }));
        dispatch(fetchDrinksAsync(repository));
    }, [user, dispatch, repository]);

    const confirmDrinksDialog = (message: AlertMessage) => {
        setAlertInfo(SUCCESS_MESSAGE_INFO);
        setLoading(false);
    }

    const confirmDrinks = async () => {
        setLoading(true);
        try {
            let paymentId: number;
            const result = await repository.fetchCurrentPaymentForUser(user.userId)
            if (!result || !result.data) {
                const paymentCreation = await repository.insertNewPayment(user.userId);

                if (!paymentCreation || (paymentCreation && paymentCreation.error))
                    throw Error({ message: paymentCreation?.error?.message ?? "Could not create payment" });

                if (!paymentCreation.data.id)
                    throw Error({ message: "Could not create payment" });

                paymentId = paymentCreation.data.id;
            } else if (result.data && result.data.length > 1) {
                paymentId = result.data[0].id;
                captureException(new MultiplePaymentsError("Multiple payments found for user."), (scope) => {
                    scope.clear();
                    scope.setExtra("result", JSON.stringify(result));
                    scope.setExtra("user", JSON.stringify(user));
                    return scope;
                });
                confirmDrinksDialog({ message: "There were multiple payments found. Please contact your admin! Your drinks still have been added to your current open payment.", severity: "warning" });
            } else {
                paymentId = result.data[0].id;
            }

            if (!paymentId)
                throw Error({ message: "Payment ID could not be found" })

            const insertResult = await repository.insertHistoryItems(Object.values(addedDrinks), user.userId, paymentId)
            if (!insertResult || insertResult.error) {
                throw Error({ message: "Drink could not be added to your history. [" + insertResult?.error + "]" });
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
                scope.setExtra("drinks", JSON.stringify(addedDrinks));
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

    return <Box>
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

        <AlertSnackbar close={() => setAlertInfo(null)} alertInfo={alertInfo} />

    </Box>
}