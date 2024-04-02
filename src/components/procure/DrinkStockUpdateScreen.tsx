import {
    Avatar,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Grid,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    TextField
} from "@mui/material";
import CustomAppBar from "../AppBar";
import {useSelector} from "react-redux";
import {Edit, LocalDrink} from "@mui/icons-material";
import React, {useState} from "react";
import {toInteger} from "lodash";
import {RootState} from "../../redux/store";
import {Drink} from "../../types/supabaseTypes";
import {useDependency} from "../../hooks/useDependency";
import {IDrinkRepository} from "../../repository/IDrinkRepository";
import {AlertMessage, AlertSnackbar} from "../AlertSnackbar";
import {captureException} from "@sentry/react";

const DrinkStockUpdateScreen = () => {

    const {drinks, loading} = useSelector((state: RootState) => state.adminDrinks);
    const [editDrink, setEditDrink] = useState<Drink | null>(null);
    const [stockToUpdate, setStockToUpdate] = useState(0);
    const drinksRepository = useDependency<IDrinkRepository>("IDrinkRepository");
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

    const handleSubmit = async () => {
        if (!editDrink || !drinksRepository)
            return;
        await drinksRepository.updateDrinkStock(editDrink.id, (editDrink?.stock ?? 0) + toInteger(stockToUpdate))
            .then(() => setAlertInfo({message: 'Stock successfully updated', severity: "success"}))
            .catch(error => {
                captureException(error);
                setAlertInfo({message: error, severity: 'error'})
            });
        setEditDrink(null);
        setStockToUpdate(0);
    }

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar navigateBack/>
        {loading && <LinearProgress style={{position: "fixed", left: 0, right: 0, top: 56}}/>}

        <List sx={{width: "100%"}}>
            {
                drinks && drinks.filter(x => x.active).map((drink: Drink, index: number) => <ListItem key={index}>
                    <ListItemAvatar>
                        <Avatar sx={{borderRadius: 2}}>
                            {
                                drink.imageUrl
                                    ? <img src={drink.imageUrl} alt="logo" width={40} height={40}/>
                                    : <LocalDrink/>
                            }
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={drink.name} secondary={"Stock: " + drink.stock}/>
                    <ListItemSecondaryAction>
                        <IconButton onClick={() => setEditDrink(drink)}>
                            <Edit fontSize="inherit" sx={{fontSize: "28px"}}/>
                        </IconButton>
                    </ListItemSecondaryAction>
                </ListItem>)
            }
        </List>

        <Dialog open={editDrink !== null} onClose={() => setEditDrink(null)}>
            <DialogTitle>Vorrat ändern</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {`Hier kannst du den Vorrat von ${editDrink?.name} anpassen. Du kannst den Vorrat erhöhen indem du eine positive Zahl angibst oder den Vorrat verkleinern in dem du eine negative Zahl angibst.`}
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    id="name"
                    label="Anzahl"
                    type="number"
                    fullWidth
                    onChange={(e) => setStockToUpdate(toInteger(e.target.value))}
                    variant="standard"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setEditDrink(null)}>Abbrechen</Button>
                <Button onClick={handleSubmit}>Bestätigen</Button>
            </DialogActions>
        </Dialog>
        <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)}/>
    </Grid>

}

export default DrinkStockUpdateScreen;