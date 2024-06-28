import CloseIcon from '@mui/icons-material/Close';
import {
    Alert,
    AppBar,
    Avatar,
    Button,
    Dialog,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    MenuItem,
    Select,
    Snackbar,
    TextField,
    Toolbar,
    Typography
} from "@mui/material";
import {Box} from "@mui/system";
import React, {useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {RootState} from "src/redux/store";
import {SlideUpTransition} from "../../utils";
import {Item, ItemUpdate} from "../../types/supabaseTypes";
import KeyIcon from "@mui/icons-material/Key";
import {SupabaseKeysRepository} from "../../repository/KeysRepository";

type EditOrAddItemDialogProps = {
    open: boolean,
    handleClose: () => void,
    itemToEdit: Item | null
}

export const EditOrAddItemDialog = ({open, handleClose, itemToEdit}: EditOrAddItemDialogProps) => {

    const user = useSelector((state: RootState) => state.application.user);
    const [currentKey, setCurrentKey] = useState<ItemUpdate>({
        id: itemToEdit?.id,
        name: itemToEdit?.name,
        color: itemToEdit?.color,
        current_holder: itemToEdit?.current_holder,
        type: itemToEdit?.type
    });
    const [errorSnackbar, setErrorSnackbar] = useState<{
        open: boolean,
        message: string,
        severity?: "error" | "success"
    }>({open: false, message: "", severity: "error"});

    useEffect(() => {
        setCurrentKey({
            id: itemToEdit?.id,
            name: itemToEdit?.name,
            color: itemToEdit?.color,
            current_holder: itemToEdit?.current_holder,
            type: itemToEdit?.type
        })
    }, [itemToEdit]);

    const handleSubmit = async () => {
        if (!currentKey.name || currentKey.name.length < 6) {
            setErrorSnackbar({message: "Der Schlüsselname ist zu kurz!", open: true});
            return;
        }
        if (!user) {
            setErrorSnackbar({message: "Something went wrong. Try again later!", open: true});
            return;
        }
        let result;
        if (currentKey.id) {
            result = await SupabaseKeysRepository.updateItem({
                name: currentKey.name,
                color: currentKey.color,
                type: currentKey.type,
                current_holder: currentKey.current_holder
            }, currentKey.id);
        } else {
            result = await SupabaseKeysRepository.insertItem({
                name: currentKey.name,
                color: currentKey.color,
                type: currentKey.type,
                current_holder: currentKey.current_holder
            });
        }
        if (result.error) {
            setErrorSnackbar({message: result.error.message ?? "", open: true});
        } else {
            setErrorSnackbar({message: "", open: false});
            handleClose();
        }
    }

    return <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={SlideUpTransition}>
        <Box component="form" noValidate>
            <AppBar sx={{position: "relative"}}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleClose}
                        aria-label="close">
                        <CloseIcon/>
                    </IconButton>
                    <Typography sx={{ml: 2, flex: 1}} variant="h6" component="div">
                        {`Schlüssel ${itemToEdit?.id > 0 ? "bearbeiten" : "erstellen"}`}
                    </Typography>
                    <Button variant="contained" sx={{background: "white", color: (theme) => theme.palette.primary.main}}
                            onClick={handleSubmit}>Speichern</Button>
                </Toolbar>
            </AppBar>
            <Box>
                <List>
                    <ListItem>
                        <TextField
                            fullWidth
                            variant="outlined"
                            value={currentKey?.name ?? ""}
                            onChange={(e) => setCurrentKey({...currentKey, name: e.target.value})}
                            label="Schlüsselname"
                            margin="normal"/>
                    </ListItem>
                    <ListItem>
                        <ListItemAvatar>
                            <Avatar
                                sx={{background: currentKey?.color ?? "#000", width: 40, height: 40, borderRadius: 2}}>
                                <KeyIcon/>
                            </Avatar>
                        </ListItemAvatar>
                        <TextField
                            fullWidth
                            variant="outlined"
                            value={currentKey?.color ?? "#000"}
                            onChange={(e) => setCurrentKey({...currentKey, color: e.target.value})}
                            label="Farbe"
                            margin="normal"/>
                    </ListItem>
                    <ListItem>
                        <ListItemAvatar>
                        </ListItemAvatar>
                        <Select fullWidth
                                value={currentKey?.type ?? "nothing"}
                                onChange={(e) => setCurrentKey({
                                    ...currentKey,
                                    type: e.target.value === "nothing" ? null : e.target.value
                                })}>
                            <MenuItem value={"mtvStorage"}>MTV Kellerschlüssel</MenuItem>
                            <MenuItem value={"mtvGym"}>MTV Gymschlüssel</MenuItem>
                            <MenuItem value={"mtvGymPalazzo"}>MTV Gym/Palazzoschlüssel</MenuItem>
                            <MenuItem value={"nothing"}>Nichts</MenuItem>
                        </Select>
                    </ListItem>
                </List>
            </Box>
        </Box>
        <Snackbar sx={{position: "fixed", right: "16px", bottom: "16px"}} open={errorSnackbar.open}
                  autoHideDuration={5000} onClose={() => setErrorSnackbar({message: "", open: false})}>
            <Alert severity={errorSnackbar.severity ?? "error"} sx={{width: '100%'}}>
                {errorSnackbar.message}
            </Alert>
        </Snackbar>
    </Dialog>
}