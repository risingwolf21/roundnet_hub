import React, { useEffect, useState } from "react";
import { AppBar, Avatar, Button, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemAvatar, ListItemButton, ListItemSecondaryAction, ListItemText, Radio, Slide, TextField, Toolbar, Typography } from "@mui/material"
import { Box } from "@mui/system";
import { AccountCircle, Close, Email, ExpandLess, ExpandMore, ManageAccounts } from "@mui/icons-material";
import { useFirestore } from "react-redux-firebase";
import { HISTORY_ITEM_PAID } from "../../constants";

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const EditUserDialog = ({ user, open, handleClose, onUserEditFinished, deleteUser }) => {

    const [userRoleCollapseOpen, setUserCollapseOpen] = useState(false);
    const [role, setRole] = useState(user.role);
    const [deleteUserOpen, setDeleteUserOpen] = useState(false);
    const [userInfo, setUserInfo] = useState({ openAmount: 0 })
    const firestore = useFirestore();

    useEffect(() => {
        setRole(user.role);
        firestore.collection(`users/${user.id}/drinks`).get().then(doc => {
            let openAmount = doc.docs.map(x => x.data())
                .filter(x => x.state !== HISTORY_ITEM_PAID)
                .flatMap(x => x.drinks)
                .reduce((prev, curr) => prev + (curr.count * curr.price), 0);
            setUserInfo({ openAmount: openAmount })
        });
    }, [user, firestore]);

    const handleSubmit = (event) => {
        event.preventDefault();
        setUserCollapseOpen(false);
        const data = new FormData(event.currentTarget);

        if (data.get("displayName") && role) {
            onUserEditFinished({
                ...user,
                displayName: data.get("displayName"),
                role
            });
        }
    }

    return <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <AppBar sx={{ position: "relative" }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleClose}
                        aria-label="close">
                        <Close />
                    </IconButton>
                    <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                        Benutzer bearbeiten
                    </Typography>
                    <Button autoFocus color="inherit" type="submit">
                        Speichern
                    </Button>
                </Toolbar>
            </AppBar>
            <Box>
                <List>
                    <ListItem key={"displayName"}>
                        <ListItemAvatar>
                            <Avatar>
                                <AccountCircle />
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id=" displayName"
                                label="DisplayName"
                                name="displayName"
                                defaultValue={user?.displayName ? user.displayName : ""}
                            />
                        </ListItemText>
                    </ListItem>
                    <ListItem key={"email"}>
                        <ListItemAvatar>
                            <Avatar>
                                <Email />
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="email"
                                label="Email"
                                name="email"
                                disabled
                                defaultValue={user?.email ? user.email : ""}
                            />
                        </ListItemText>
                    </ListItem>
                    <ListItemButton key={"editUserRole"} onClick={() => setUserCollapseOpen(!userRoleCollapseOpen)}>
                        <ListItemAvatar>
                            <Avatar>
                                <ManageAccounts />
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText secondary={"Rechte"} primary={role} />
                        <ListItemSecondaryAction>
                            {userRoleCollapseOpen ? <ExpandLess /> : <ExpandMore />}
                        </ListItemSecondaryAction>
                    </ListItemButton>
                    <Collapse in={userRoleCollapseOpen} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {
                                [
                                    { value: "user", display: "Benutzer" },
                                    { value: "procure", display: "Procure" },
                                    { value: "finance", display: "Finanzen" },
                                    { value: "admin", display: "Administrator" }
                                ]
                                    .map(x => <ListItem key={x.value} sx={{ pl: 4 }}>
                                        <ListItemAvatar>
                                            <Radio
                                                checked={role === x.value}
                                                onChange={(e) => setRole(e.target.value)}
                                                value={x.value}
                                                name="role-buttons" />
                                        </ListItemAvatar>
                                        <ListItemText primary={x.display} />
                                    </ListItem>)
                            }
                        </List>
                    </Collapse>
                </List>
                <Box sx={{ position: "fixed", bottom: 0, left: 0, right: 0, pl: 2, pr: 2, pb: 2 }}>
                    <Button
                        onClick={() => setDeleteUserOpen(true)}
                        fullWidth
                        color="error"
                        variant="contained"
                        sx={{ borderRadius: "50px !important", fontSize: "16px", fontFamily: "sans-serif", lineSpacing: "24px" }}>
                        Löschen</Button>
                </Box>
            </Box>
        </Box>
        <Dialog open={deleteUserOpen}>
            <DialogTitle>
                {`Benuter ${user.displayName} löschen?`}
            </DialogTitle>
            <DialogContent>
                <Typography>
                    {`Wenn du diesen Benutzer löscht, wird dieser sowohl in der Datenbank als auch bei Firebase gelöscht. Es werden alle offenen, bezahlten und Getränke in Zahlung gelöscht. Auch der Verlauf der Getränke wird gelöscht. 
                    Der offene Betrag dieses Benutzers liegt bei`}
                </Typography>
                <Typography fontWeight={"bold"} variant="h5">
                    {`${userInfo.openAmount} €`}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDeleteUserOpen(false)}>Abbrechen</Button>
                <Button onClick={() => {
                    setDeleteUserOpen(false);
                    deleteUser(user);
                }} autoFocus>
                    Bestätigen
                </Button>
            </DialogActions>
        </Dialog>
    </Dialog>
}

export default EditUserDialog;