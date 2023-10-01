import { Avatar, Badge, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Fab, Grid, IconButton, LinearProgress, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Paper, Typography } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EditDrinkDialog from "./EditDrinkDialog";
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import { useState } from "react";
import _ from "lodash";
import { useAdminDrinks } from "../../hooks/useAdminDrinksHook";
import { Error } from "../Error";
import { Loading } from "../Loading";
import { useSelector } from "react-redux";

const AdminDrinkItem = ({ drink, onEditClick, onDeleteClick, divider }) => {
    return <ListItem divider={true}>
        <ListItemAvatar>
            <Badge color={drink?.active ? "success" : "warning"} variant="dot">
                <Avatar>
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

const EMPTY_DRINK = { "imageUrl": "", name: "", price: 0, active: false };

const AdminDrinkList = () => {

    const { drinks, drinksError, drinksLoading } = useSelector((state) => state.adminDrinks);

    const { updateDrink, deleteDrink, addDrink } = useAdminDrinks();

    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedDrink, setSelectedDrink] = useState();

    const selectDrink = (drink) => {
        setSelectedDrink(drink);
        setOpen(true);
    }

    const deleteDrinkDialog = (drink) => {
        setSelectedDrink(drink);
        setDeleteOpen(true);
    }

    const onDeleteDrink = (drink) => {
        deleteDrink(drink.id);
        setDeleteOpen(false);
    }

    const getDrinksHistory = (drink) => {
        if (!drink || !drinks || !drink.previousDrink) return [];

        let prev = drinks.filter(x => x.deleted).find(x => x.id === drink.previousDrink);

        return [prev, ...getDrinksHistory(prev)]
    }

    const onDrinkEditFinished = (drink) => {
        if (drink.id) {
            if (drink.name !== selectedDrink.name || drink.price !== selectedDrink.price) {
                addDrink(_.omit({ ...drink, previousDrink: selectedDrink.id }, ["id"]));
                updateDrink({ ...selectedDrink, deleted: true, active: false });
            } else {
                updateDrink(drink);
            }
        } else {
            addDrink(_.omit(drink, ["id"]));
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
        {
            drinksLoading && <LinearProgress style={{ position: "fixed", left: 0, top: 56, right: 0 }} />
        }
        <List sx={{ width: "100%", paddingBottom: 12 }}>
            {
                drinks && drinks.filter(x => !x.deleted).map((drink, index) => <AdminDrinkItem
                    key={"drink" + index}
                    drink={drink}
                    drinkHistory={getDrinksHistory(drink)}
                    onEditClick={() => selectDrink(drink)}
                    onDeleteClick={() => deleteDrinkDialog(drink)} />)
            }
        </List>
        <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "72px" }} onClick={() => selectDrink(EMPTY_DRINK)}>
            <AddIcon sx={{ color: "white" }} />
        </Fab>
        <EditDrinkDialog drink={selectedDrink} drinkHistory={getDrinksHistory(selectedDrink)} open={open} handleClose={() => setOpen(false)} onDrinkEditFinished={onDrinkEditFinished} />
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