import { Box, Checkbox, CircularProgress, Fab, List, ListItem, ListItemAvatar, ListItemText } from "@mui/material";
import { useEffect, useState } from "react";
import CheckIcon from '@mui/icons-material/Check';
import { captureException } from "@sentry/react";
import { Error } from "../Error";
import { useSelector } from "react-redux";
import CustomAppBar from "src/components/AppBar";
import React from "react";
import DrinkList from "./DrinkList";
import { MultiplePaymentsError, nameOfProductType } from "src/utils";
import { RootState } from "src/redux/store";
import { AppDispatch, useAppDispatch } from "src";
import { useDependency } from "src/hooks/useDependency";
import { IDrinkRepository } from "src/repository/IDrinkRepository";
import { Drink, DrinkCounter, DrinkInsert, DrinkUpdate, ProductType, User } from "src/types/supabaseTypes";
import { fetchDrinksAsync, onDrinkDeleted, onDrinkInserted, onDrinkUpdated } from "src/redux/drinksSlice";
import { AlertMessage, AlertSnackbar } from "src/components/AlertSnackbar";
import { LoadingIndicator } from "src/components/LoadingIndicator";
import { useClient } from "react-supabase";
import { Tune } from "@mui/icons-material";
import { SwipeableDialog } from "../SwipeableDialog";

const SUCCESS_MESSAGE_INFO: AlertMessage = { message: "Getränke erfolgreich gebucht!", severity: "success" };

export const DrinkListScreenProvider = () => {
    const { user } = useSelector((state: RootState) => state.application);
    const drinksRepository = useDependency<IDrinkRepository>("IDrinkRepository");
    const { drinks, drinksLoading, drinksError } = useSelector((state: RootState) => state.drinks);
    const dispatch = useAppDispatch();

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

type DrinkListScreenProps = {
    repository: IDrinkRepository,
    dispatch: AppDispatch,
    user: User,
    drinks: Drink[],
    drinksLoading: boolean,
    drinksError: string
}

const DrinkListScreen = ({ repository, user, drinks, drinksLoading, drinksError, dispatch }: DrinkListScreenProps) => {

    const [addedDrinks, setAddedDrinks] = useState<DrinkCounter[]>([]);
    const [loading, setLoading] = useState(false);
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const [visibleTypes, setVisibleTypes] = useState<ProductType[]>(["Drink"]);
    const client = useClient();

    useEffect(() => {
        let subscription = client.channel("public:drink")
            .on<DrinkUpdate>("postgres_changes", { event: "UPDATE", schema: "public", table: "drink" }, (payload) => dispatch(onDrinkUpdated(payload.new)))
            .on<DrinkInsert>("postgres_changes", { event: "INSERT", schema: "public", table: "drink" }, (payload) => dispatch(onDrinkInserted(payload.new)))
            .on("postgres_changes", { event: "DELETE", schema: "public", table: "drink" }, (payload) => dispatch(onDrinkDeleted(payload.old.id)))
            .subscribe();
        return () => {
            subscription.unsubscribe();
        }
    }, [client, dispatch]);

    useEffect(() => {
        if (drinksError) {
            setAlertInfo({ message: drinksError, severity: "error" });
        }
    }, [drinksError])

    useEffect(() => {
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
            if (!result || !result.data || result.data.length < 1) {
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
        <DrinkList drinks={drinks} onAddDrinkClick={onAddDrinkClick} onRemoveDrinkClick={onRemoveDrinkClick} addedDrinks={addedDrinks} visibleTypes={visibleTypes} />
        {
            Object.values(addedDrinks).length > 0
                ? <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "56px", mb: "16px" }} onClick={confirmDrinks}>
                    {
                        loading ? <CircularProgress /> : <CheckIcon sx={{ color: "white" }} />
                    }
                </Fab>
                : <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "56px", mb: "16px" }} onClick={() => setFilterDialogOpen(true)}>
                    <Tune sx={{ color: "white" }} />
                </Fab>
        }

        <SwipeableDialog open={filterDialogOpen} setOpen={setFilterDialogOpen} onClose={() => setFilterDialogOpen(false)} title="Filter">
            <List>
                {
                    [...new Set(drinks.map(x => x.type))].sort().map(x => <ListItem divider disabled={x === "Drink"}>
                        <ListItemAvatar>
                            <Checkbox disabled={x === "Drink"} checked={visibleTypes.some(y => y === x)} onChange={(e) => setVisibleTypes(e.target.checked ? [...visibleTypes, x] : visibleTypes.filter(y => y !== x))} />
                        </ListItemAvatar>
                        <ListItemText primary={nameOfProductType(x)} />
                    </ListItem>)
                }
            </List>
        </SwipeableDialog>

        <AlertSnackbar close={() => setAlertInfo(null)} alertInfo={alertInfo} />

    </Box>
}