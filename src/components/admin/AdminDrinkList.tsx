import { Avatar, Badge, Button, Dialog, DialogActions, DialogContent, DialogTitle, Fab, Grid, IconButton, LinearProgress, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Typography } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EditDrinkDialog from "./EditDrinkDialog";
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import { useEffect, useState } from "react";
import _ from "lodash";
import { Error } from "../Error";
import { useSelector } from "react-redux";
import CustomAppBar from "../AppBar";
import React from "react";
import { Drink } from "../../types/supabaseTypes";
import { useDependency } from "../../hooks/useDependency";
import { IAdminDrinksRepository } from "../../repository/IAdminDrinksRepository";
import { RootState } from "../../redux/store";
import { useAppDispatch } from "../..";
import { fetchDrinksAsync } from "../../redux/adminDrinksSlice";
import { AlertSnackbar } from "../AlertSnackbar";

type AdminDrinkItemProps = {
    drink: Drink,
    onEditClick: () => any,
    onDeleteClick: () => any,
}

const AdminDrinkItem = ({ drink, onEditClick, onDeleteClick }: AdminDrinkItemProps) => {
    return <ListItem divider={true}>
        <ListItemAvatar>
            <Badge color={drink?.active ? "success" : "warning"} variant="dot">
                <Avatar sx={{ borderRadius: 2 }}>
                    {
                        drink?.imageUrl
                            ? <img src={drink.imageUrl} alt="logo" width={40} height={40} />
                            : <LocalDrinkIcon />
                    }
                </Avatar>
            </Badge>
        </ListItemAvatar>
        <ListItemText primary={drink.name} secondary={drink.price + " €"} />
        <ListItemSecondaryAction>
            <IconButton onClick={onEditClick}>
                <EditIcon fontSize={"medium"} />
            </IconButton>
            <IconButton onClick={onDeleteClick}>
                <DeleteIcon fontSize={"medium"} />
            </IconButton>
        </ListItemSecondaryAction>
    </ListItem>
}

const EMPTY_DRINK: Drink =
{
    imageUrl: "",
    name: "",
    price: 0,
    active: false,
    deleted: false,
    id: 0,
    previousDrink: null,
    stock: 0
};

export const AdminDrinkListProvider = () => {
    const { drinks, drinksError, drinksLoading } = useSelector((state: RootState) => state.adminDrinks);
    const repository = useDependency<IAdminDrinksRepository>("IAdminDrinksRepository");

    if (!repository)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository or user was null!", severity: "error" }} />

    return <AdminDrinkList
        repository={repository}
        drinks={drinks}
        drinksError={drinksError}
        drinksLoading={drinksLoading} />
}

type AdminDrinkListProps = {
    repository: IAdminDrinksRepository,
    drinks: Drink[],
    drinksError: string,
    drinksLoading: boolean
}

const AdminDrinkList = ({ repository, drinks, drinksError, drinksLoading }: AdminDrinkListProps) => {

    const dispatch = useAppDispatch();
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedDrink, setSelectedDrink] = useState<Drink>();

    useEffect(() => {
        dispatch(fetchDrinksAsync(repository))
    }, [repository, dispatch]);

    const selectDrink = (drink: Drink) => {
        setSelectedDrink(drink);
        setOpen(true);
    }

    const deleteDrinkDialog = (drink: Drink) => {
        setSelectedDrink(drink);
        setDeleteOpen(true);
    }

    const onDeleteDrink = (drink: Drink | undefined) => {
        if (!drink) throw Error({ message: "Could not delete Drink, because it was undefined" });
        repository.deleteDrink(drink.id);
        setDeleteOpen(false);
    }

    const getDrinksHistory = (drink: Drink): Drink[] => {
        if (!drinks || !drink.previousDrink) return [];

        let prev: Drink | undefined = drinks.filter((x: Drink) => x.deleted).find((x: Drink) => x.id === drink.previousDrink);

        if (!prev)
            return [];

        return [prev, ...getDrinksHistory(prev)]
    }

    const onDrinkEditFinished = (drink: Drink) => {
        if (drink.id && selectedDrink) {
            if (drink.name !== selectedDrink.name || drink.price !== selectedDrink.price) {
                repository.addDrink(_.omit({ ...drink, previousDrink: selectedDrink.id }));
                repository.updateDrink({ ...selectedDrink, deleted: true, active: false });
            } else {
                repository.updateDrink(drink);
            }
        } else {
            repository.addDrink(_.omit(drink));
        }
        setOpen(false);
    }

    if (drinksError)
        return <Error message={drinksError} />

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar navigateBack />
        {
            drinksLoading && <LinearProgress style={{ position: "fixed", left: 0, top: 56, right: 0 }} />
        }
        <List sx={{ width: "100%", paddingBottom: 12 }}>
            {
                drinks.filter((x: Drink) => !x.deleted).map((drink: Drink, index: number) => <AdminDrinkItem
                    key={"drink" + index}
                    drink={drink}
                    onEditClick={() => selectDrink(drink)}
                    onDeleteClick={() => deleteDrinkDialog(drink)} />)
            }
        </List>
        <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "72px" }} onClick={() => selectDrink(EMPTY_DRINK)}>
            <AddIcon sx={{ color: "white" }} />
        </Fab>
        {
            selectedDrink && <EditDrinkDialog
                drink={selectedDrink}
                drinkHistory={getDrinksHistory(selectedDrink)}
                open={open}
                handleClose={() => setOpen(false)}
                onDrinkEditFinished={onDrinkEditFinished} />
        }
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
            <DialogTitle>Getränk löschen</DialogTitle>
            <DialogContent>
                <Typography>
                    Möchtest du dieses Getränk wirklich löschen?
                    Alle Nutzer mit offenen Getränken von diesem Typen werden diese in Ihrer Historie sehen und weiterhin zahlen müssen.
                    Eintragen lassen sich diese Getränke jedoch nicht mehr.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDeleteOpen(false)}>Abbrechen</Button>
                <Button onClick={() => onDeleteDrink(selectedDrink)} autoFocus>
                    Bestätigen
                </Button>
            </DialogActions>
        </Dialog>
    </Grid >);
}

export default AdminDrinkList;