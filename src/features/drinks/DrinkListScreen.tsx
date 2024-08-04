import {Tune} from "@mui/icons-material";
import CheckIcon from '@mui/icons-material/Check';
import {Box, Checkbox, CircularProgress, Fab, List, ListItem, ListItemAvatar, ListItemText} from "@mui/material";
import {captureException} from "@sentry/react";
import React, {useEffect, useState} from "react";
import {AlertMessage, AlertSnackbar} from "src/components/AlertSnackbar";
import CustomAppBar from "src/components/AppBar";
import {LoadingIndicator} from "src/components/LoadingIndicator";
import {Drink, DrinkCounter, ProductType} from "src/types/supabaseTypes";
import {nameOfProductType} from "src/utils";
import {Error} from "../../components/Error";
import {SwipeableDialog} from "../../components/SwipeableDialog";
import DrinkList from "./components/DrinkList";
import {DrinkListScreenProps} from "./types";
import {SupabaseDrinkRepository} from "../../repository/DrinkRepository";

const SUCCESS_MESSAGE_INFO: AlertMessage = {message: "Getränke erfolgreich gebucht!", severity: "success"};

const DrinkListScreen = ({user, drinks, drinksLoading, drinksError, dispatch}: DrinkListScreenProps) => {

    const [addedDrinks, setAddedDrinks] = useState<DrinkCounter[]>([]);
    const [loading, setLoading] = useState(false);
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const [visibleTypes, setVisibleTypes] = useState<ProductType[]>(localStorage.getItem("visibleTypes")?.split(";") as ProductType[] ?? ["Drink"]);

    useEffect(() => {
        if (drinksError) {
            setAlertInfo({message: drinksError, severity: "error"});
        }
    }, [drinksError]);

    const confirmDrinksDialog = (message: AlertMessage) => {
        setAlertInfo(SUCCESS_MESSAGE_INFO);
        setLoading(false);
    }

    const confirmDrinks = async () => {
        setLoading(true);
        try {
            let {data: paymentId, error} = await SupabaseDrinkRepository.fetchOpenPaymentIdForUser(user.userId);

            if (!paymentId || error) {
                setLoading(false);
                let message = error?.message ?? "Payment could not be created";
                confirmDrinksDialog({message, severity: "error"});
                captureException(Error({message}), (scope) => {
                    scope.clear();
                    scope.setExtra("drinks", JSON.stringify(addedDrinks));
                    return scope;
                });
            } else {
                SupabaseDrinkRepository.insertHistoryItems(Object.values(addedDrinks), user.userId, paymentId)
                    .then(result => {
                        setLoading(false);
                        setAddedDrinks([]);
                        confirmDrinksDialog(SUCCESS_MESSAGE_INFO);
                    });
            }
        } catch (error) {
            setLoading(false);
            let message = (error as Error).message;
            confirmDrinksDialog({message, severity: "error"});
            captureException(Error({message}), (scope) => {
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
            temp[drink.id] = {count: 1, ...drink};
        }
        setAddedDrinks({...temp});
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
        setAddedDrinks({...temp});
    }


    const changeVisibleTypes = (e: React.ChangeEvent<HTMLInputElement>, x: "Drink" | "Special" | "None") => {
        let newValue = e.target.checked ? [...visibleTypes, x] : visibleTypes.filter(y => y !== x);
        setVisibleTypes(newValue);
        localStorage.setItem("visibleTypes", newValue.join(";"));
    }

    return <Box>
        <CustomAppBar/>
        <LoadingIndicator loading={drinksLoading}/>
        <DrinkList drinks={drinks} onAddDrinkClick={onAddDrinkClick} onRemoveDrinkClick={onRemoveDrinkClick}
                   addedDrinks={addedDrinks} visibleTypes={visibleTypes}/>
        {
            Object.values(addedDrinks).length > 0
                ? <Fab sx={{background: "#66bb6a", position: "fixed", right: "16px", bottom: "56px", mb: "16px"}}
                       onClick={confirmDrinks}>
                    {
                        loading ? <CircularProgress/> : <CheckIcon sx={{color: "white"}}/>
                    }
                </Fab>
                : <Fab sx={{background: "#66bb6a", position: "fixed", right: "16px", bottom: "56px", mb: "16px"}}
                       onClick={() => setFilterDialogOpen(true)}>
                    <Tune sx={{color: "white"}}/>
                </Fab>
        }

        <SwipeableDialog open={filterDialogOpen} setOpen={setFilterDialogOpen}
                         onClose={() => setFilterDialogOpen(false)} title="Filter">
            <List>
                {
                    [...new Set(drinks.map(x => x.type))].sort().map(x => <ListItem key={x} divider
                                                                                    disabled={x === "Drink"}>
                        <ListItemAvatar>
                            <Checkbox disabled={x === "Drink"} checked={visibleTypes.some(y => y === x)}
                                      onChange={(e) => changeVisibleTypes(e, x)}/>
                        </ListItemAvatar>
                        <ListItemText primary={nameOfProductType(x)}/>
                    </ListItem>)
                }
            </List>
        </SwipeableDialog>

        <AlertSnackbar close={() => setAlertInfo(null)} alertInfo={alertInfo}/>

    </Box>
}

export default DrinkListScreen;
