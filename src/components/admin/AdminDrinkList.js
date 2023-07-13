import { Avatar, Badge, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Fab, Grid, IconButton, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Paper, Typography } from "@mui/material";
import { connect } from "react-redux";
import { compose } from "redux";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EditDrinkDialog from "./EditDrinkDialog";
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import { useState } from "react";
import _ from "lodash";
import { lifecycle, withHandlers } from "recompose";

const AdminDrinkItem = ({ drink, onEditClick, onDeleteClick }) => {
    return <Paper sx={{ width: "100%", marginBottom: 2, listStyleType: "none" }}>
        <ListItem>
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
    </Paper>
}

const EMPTY_DRINK = { "imageUrl": "", name: "", price: 0, active: false };

const AdminDrinkList = ({ dispatch, user }) => {

    const { drinks, loading, updateDrink, deleteDrink, addDrink } = useAdminDrinks();

    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedDrink, setSelectedDrink] = useState();

    const selectDrink = (drink) => {
        setSelectedDrink(drink);
        setOpen(true);
    }

    const deleteDrink = (drink) => {
        setSelectedDrink(drink);
        setDeleteOpen(true);
    }

    const onDeleteDrink = (drink) => {
        deleteDrink(drink.id);
        setDeleteOpen(false);
    }

    const onDrinkEditFinished = (drink) => {
        if (drink.id) {
            updateDrink(drink);
        } else {
            addDrink(_.omit(drink, ["id"]));
        }
        setOpen(false);
    }

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center"
        sx={{ paddingTop: 2 }}>
        <Grid container width="100%" direction="column" alignItems="center" justifyContent="center" paddingLeft={2} paddingRight={2}>
            {
                !loading && drinks.map((drink, index) => <AdminDrinkItem
                    key={"drink" + index}
                    drink={drink}
                    onEditClick={() => selectDrink(drink)}
                    onDeleteClick={() => deleteDrink(drink)} />)
            }
            <Box height={"64px"} width={"100%"} />
        </Grid>
        <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "16px" }} onClick={() => selectDrink(EMPTY_DRINK)}>
            <AddIcon sx={{ color: "white" }} />
        </Fab>
        <EditDrinkDialog drink={selectedDrink} open={open} handleClose={() => setOpen(false)} onDrinkEditFinished={onDrinkEditFinished} />
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

const enhance = compose(
    connect((state) => ({
        user: state.application.user
    }))
);

export default enhance(AdminDrinkList);