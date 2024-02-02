import CloseIcon from '@mui/icons-material/Close';
import {
    Alert,
    AppBar, Avatar,
    Button,
    Dialog,
    IconButton,
    List,
    ListItem,
    ListItemAvatar, Snackbar,
    TextField,
    Toolbar,
    Typography
} from "@mui/material";
import {Box} from "@mui/system";
import React, {useState} from "react";
import {useSelector} from "react-redux";
import {useDependency} from "src/hooks/useDependency";
import {RootState} from "src/redux/store";
import {SlideUpTransition} from "../../utils";
import {IKeysRepository} from "../../repository/IKeysRepository";
import {Key} from "../../types/supabaseTypes";
import KeyIcon from "@mui/icons-material/Key";

type EditOrAddKeyDialogProps = {
    open: boolean,
    handleClose: () => void,
    key?: Key | null
}

export const EditOrAddKeyDialog = ({open, handleClose, key}: EditOrAddKeyDialogProps) => {

    const repo = useDependency<IKeysRepository>("IKeysRepository");
    const user = useSelector((state: RootState) => state.application.user);
    const [currentKey, setCurrentKey] = useState<Key>(key ?? {name: "", color: "#000000", id: 0, created_at: ""});
    const [errorSnackbar, setErrorSnackbar] = useState<{
        open: boolean,
        message: string,
        severity?: "error" | "success"
    }>({open: false, message: "", severity: "error"});

    const handleSubmit = async () => {
        if (!currentKey.name || currentKey.name.length < 6) {
            setErrorSnackbar({ message: "Der Schlüsselname ist zu kurz!", open: true });
            return;
        }
        if(!user || !repo) {
            setErrorSnackbar({ message: "Something went wrong. Try again later!", open: true });
            return;
        }
        const result = await repo.createKey({name: currentKey.name, color: currentKey.color}, user.userId);
        if(result.error){
            setErrorSnackbar({ message: result.error.message ?? "", open: true });
        } else {
            setErrorSnackbar({ message: "", open: false });
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
                        Schlüssel erstellen
                    </Typography>
                    <Button variant="contained" sx={{background: "white", color: (theme) => theme.palette.primary.main}}
                            onClick={handleSubmit}>Speichern</Button>
                </Toolbar>
            </AppBar>
            <Box>
                <List>
                    <ListItem key={"keyName"}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            value={currentKey.name}
                            onChange={(e) => setCurrentKey({...currentKey, name: e.target.value})}
                            label="Schlüsselname"
                            margin="normal"/>
                    </ListItem>
                    <ListItem key={"color"}>
                        <ListItemAvatar>
                            <Avatar sx={{background: currentKey.color, width: 40, height: 40, borderRadius: 2}}>
                                <KeyIcon/>
                            </Avatar>
                        </ListItemAvatar>
                        <TextField
                            fullWidth
                            variant="outlined"
                            value={currentKey.color}
                            onChange={(e) => setCurrentKey({...currentKey, color: e.target.value})}
                            label="Farbe"
                            margin="normal"/>
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