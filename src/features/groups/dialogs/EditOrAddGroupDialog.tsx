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
    Snackbar,
    TextField,
    Toolbar,
    Typography
} from "@mui/material";
import {Box} from "@mui/system";
import React, {useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {RootState} from "src/redux/store";
import {SlideUpTransition} from "../../../utils";
import KeyIcon from "@mui/icons-material/Key";
import {GroupsRepository} from "../../../repository/GroupsRepository";
import {TablesUpdate} from "../../../types/supabase-generated.types";

type EditOrAddGroupDialogProps = {
    open: boolean,
    handleClose: () => void,
    groupToEdit: Group
}

export const EditOrAddGroupDialog = ({open, handleClose, groupToEdit}: EditOrAddGroupDialogProps) => {

    const user: User | null = useSelector((state: RootState) => state.application.user);
    const [currentGroup, setCurrentGroup] = useState<TablesUpdate<'event_group'>>({
        id: groupToEdit.id,
        name: groupToEdit.name,
        color: groupToEdit.color,
        description: groupToEdit.description
    });
    const [errorSnackbar, setErrorSnackbar] = useState<{
        open: boolean,
        message: string,
        severity?: "error" | "success"
    }>({open: false, message: "", severity: "error"});

    useEffect(() => {
        setCurrentGroup({
            id: groupToEdit.id,
            name: groupToEdit.name,
            color: groupToEdit.color,
            description: groupToEdit.description
        })
    }, [groupToEdit]);

    const handleSubmit = async () => {
        if (!currentGroup.name || currentGroup.name.length < 6) {
            setErrorSnackbar({message: "Der Gruppenname ist zu kurz!", open: true});
            return;
        }
        if (!user) {
            setErrorSnackbar({message: "Something went wrong. Try again later!", open: true});
            return;
        }
        GroupsRepository.upsertGroup({
            id: currentGroup.id,
            name: currentGroup.name,
            color: currentGroup.color,
            description: currentGroup.description
        }).then(result => {
            if (!result.data) {
                setErrorSnackbar({message: "Something went wrong creating the group.", open: false});
            } else
                GroupsRepository.addUserToGroup(result.data.id, user.userId).then(result => {
                    setErrorSnackbar({message: "", open: false});
                    handleClose();
                }).catch(error => {
                    setErrorSnackbar({message: error.message ?? "", open: true});
                })

        }).catch(error => {
            setErrorSnackbar({message: error.message ?? "", open: true});
        });
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
                        {`Gruppe ${groupToEdit.id > 0 ? "bearbeiten" : "erstellen"}`}
                    </Typography>
                    <Button variant="contained"
                            sx={{background: "white", color: (theme) => theme.palette.primary.main}}
                            onClick={handleSubmit}>Speichern</Button>
                </Toolbar>
            </AppBar>
            <Box>
                <List>
                    <ListItem>
                        <TextField
                            fullWidth
                            variant="outlined"
                            value={currentGroup?.name ?? ""}
                            onChange={(e) => setCurrentGroup({...currentGroup, name: e.target.value})}
                            label="Gruppenname"
                            margin="normal"/>
                    </ListItem>
                    <ListItem>
                        <TextField
                            fullWidth
                            variant="outlined"
                            value={currentGroup?.description ?? ""}
                            onChange={(e) => setCurrentGroup({...currentGroup, description: e.target.value})}
                            label="Beschreibung"
                            margin="normal"/>
                    </ListItem>
                    <ListItem>
                        <ListItemAvatar>
                            <Avatar sx={{background: currentGroup.color, width: 40, height: 40, borderRadius: 2}}>
                                <KeyIcon/>
                            </Avatar>
                        </ListItemAvatar>
                        <TextField
                            fullWidth
                            variant="outlined"
                            value={currentGroup.color}
                            onChange={(e) => setCurrentGroup({...currentGroup, color: e.target.value})}
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