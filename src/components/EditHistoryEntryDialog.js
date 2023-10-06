import {
    Button, AppBar, Toolbar, IconButton, Typography, Box, Dialog, DialogActions, DialogContent,
    DialogTitle, FormControl, FormControlLabel, Radio, RadioGroup, List, ListItem, ListItemText, ListItemAvatar, Avatar
} from "@mui/material";
import { NON_REPEAT } from "../constants";
import { Close, Remove, Add, LocalDrink } from "@mui/icons-material";
import { useEffect, useState } from "react";
import { SlideUpTransition } from "../utils";

const EditHistoryEntryDialog = ({ open, handleClose, entry, handleSubmit }) => {

    const [newCount, setNewCount] = useState(entry?.count);

    useEffect(() => {
        setNewCount(entry?.count);
    }, [entry]);

    return <Dialog
        fullWidth
        open={open}
        onClose={handleClose}
        TransitionComponent={SlideUpTransition}>
        <DialogTitle>Getränk bearbeiten</DialogTitle>
        <DialogContent sx={{pl: 1, pr: 0}}>
            <Box sx={{ width: "100%" }}>
                <List sx={{ width: "100%" }}>
                    <ListItem>
                        <ListItemAvatar>
                            <Avatar>
                                {
                                    entry?.drink?.imageUrl
                                        ? <img src={entry?.drink?.imageUrl} alt="logo" width={40} height={40} />
                                        : <LocalDrink />
                                }
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={entry?.drink?.name} secondary={(newCount * entry?.drink?.price) + " €"} />
                        <Box sx={{ display: "flex", flexDirection: "row" }}>
                            {
                                (newCount > 0) && <>
                                    <IconButton disableRipple onClick={() => setNewCount(newCount - 1)}>
                                        <Remove fontSize="inherit" sx={{ fontSize: "28px" }} />
                                    </IconButton>
                                    <Typography sx={{ p: 1, fontSize: "20px", color: "rgba(0,0,0,0.54)" }}>{newCount}</Typography>
                                </>
                            }
                            <IconButton disableRipple onClick={() => setNewCount(newCount + 1)} >
                                <Add fontSize="inherit" sx={{ fontSize: "28px" }} />
                            </IconButton>
                        </Box>
                    </ListItem>
                </List>
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleClose}>Abbrechen</Button>
            <Button onClick={() => handleSubmit({ ...entry, count: newCount })}>Speichern</Button>
        </DialogActions>
    </Dialog>
}
export default EditHistoryEntryDialog;