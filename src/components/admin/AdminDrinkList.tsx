import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import {
    Avatar,
    Badge,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fab,
    Grid,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    Typography
} from "@mui/material";
import _ from "lodash";
import React, {useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {useDependency} from "../../hooks/useDependency";
import {fetchDrinksAsync} from "../../redux/adminDrinksSlice";
import {RootState, useAppDispatch} from "../../redux/store";
import {IAdminDrinksRepository} from "../../repository/IAdminDrinksRepository";
import {Drink} from "../../types/supabaseTypes";
import {AlertMessage, AlertSnackbar} from "../AlertSnackbar";
import CustomAppBar from "../AppBar";
import {Error} from "../Error";
import EditDrinkDialog from "./EditDrinkDialog";
import {captureException} from "@sentry/react";

type AdminDrinkItemProps = {
    drink: Drink,
    onEditClick: () => any,
    onDeleteClick: () => any,
}

const AdminDrinkItem = ({drink, onEditClick, onDeleteClick}: AdminDrinkItemProps) => {
    return <ListItem divider={true}>
        <ListItemAvatar>
            <Badge color={drink?.active ? "success" : "warning"} variant="dot">
                <Avatar sx={{borderRadius: 2}}>
                    {
                        drink?.imageUrl
                            ? <img src={drink.imageUrl} alt="logo" width={40} height={40}/>
                            : <LocalDrinkIcon/>
                    }
                </Avatar>
            </Badge>
        </ListItemAvatar>
        <ListItemText primary={drink.name} secondary={drink.price + " €"}/>
        <ListItemSecondaryAction>
            <IconButton onClick={onEditClick}>
                <EditIcon fontSize={"medium"}/>
            </IconButton>
            <IconButton onClick={onDeleteClick}>
                <DeleteIcon fontSize={"medium"}/>
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
        stock: 0,
        type: "Drink"
    };

const AdminDrinkListProvider = () => {
    const {drinks, drinksError, drinksLoading} = useSelector((state: RootState) => state.adminDrinks);
    const repository = useDependency<IAdminDrinksRepository>("IAdminDrinksRepository");

    if (!repository)
        return <AlertSnackbar close={() => {
        }} alertInfo={{message: "Fatal error occured. Repository or user was null!", severity: "error"}}/>

    return <AdminDrinkList
        repository={repository}
        drinks={drinks}
        drinksError={drinksError}
        drinksLoading={drinksLoading}/>
}

type AdminDrinkListProps = {
    repository: IAdminDrinksRepository,
    drinks: Drink[],
    drinksError: string,
    drinksLoading: boolean
}

const AdminDrinkList = ({repository, drinks, drinksError, drinksLoading}: AdminDrinkListProps) => {

    const dispatch = useAppDispatch();
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedDrink, setSelectedDrink] = useState<Drink>();
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

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
        if (!drink) throw Error({message: "Could not delete Drink, because it was undefined"});
        repository.deleteDrink(drink.id).then(() => {
            setDeleteOpen(false);
        }).catch(error => {
            captureException(error);
            setAlertInfo({message: error, severity: "error"});
        });
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
                repository.addDrink(_.omit({...drink, previousDrink: selectedDrink.id})).then(() => {
                    repository.updateDrink({...selectedDrink, deleted: true, active: false}).catch(error => {
                        captureException(error);
                        setAlertInfo({message: error, severity: "error"});
                    });
                }).catch(error => {
                    captureException(error);
                    setAlertInfo({message: error, severity: "error"});
                });
            } else {
                repository.updateDrink(drink).catch(error => {
                    captureException(error);
                    setAlertInfo({message: error, severity: "error"});
                });
            }
        } else {
            repository.addDrink(_.omit(drink)).catch(error => {
                captureException(error);
                setAlertInfo({message: error, severity: "error"});
            });
        }
        setOpen(false);
    }

    if (drinksError)
        return <Error message={drinksError}/>

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar navigateBack/>
        {
            drinksLoading && <LinearProgress style={{position: "fixed", left: 0, top: 56, right: 0}}/>
        }
        <List sx={{width: "100%", paddingBottom: 12}}>
            {
                drinks.filter((x: Drink) => !x.deleted).map((drink: Drink, index: number) => <AdminDrinkItem
                    key={"drink" + index}
                    drink={drink}
                    onEditClick={() => selectDrink(drink)}
                    onDeleteClick={() => deleteDrinkDialog(drink)}/>)
            }
        </List>
        <Fab sx={{background: "#66bb6a", position: "fixed", right: "16px", bottom: "72px"}}
             onClick={() => selectDrink(EMPTY_DRINK)}>
            <AddIcon sx={{color: "white"}}/>
        </Fab>
        {
            selectedDrink && <EditDrinkDialog
                drink={selectedDrink}
                drinkHistory={getDrinksHistory(selectedDrink)}
                open={open}
                handleClose={() => setOpen(false)}
                onDrinkEditFinished={onDrinkEditFinished}/>
        }
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
            <DialogTitle>Getränk löschen</DialogTitle>
            <DialogContent>
                <Typography>
                    Möchtest du dieses Getränk wirklich löschen?
                    Alle Nutzer mit offenen Getränken von diesem Typen werden diese in Ihrer Historie sehen und
                    weiterhin zahlen müssen.
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
        <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)}/>
    </Grid>);
}

export default AdminDrinkListProvider;