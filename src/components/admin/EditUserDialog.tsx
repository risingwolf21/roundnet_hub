import React, { FormEvent, useEffect, useState } from "react";
import { AppBar, Avatar, Button, Checkbox, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, List, ListItem, ListItemAvatar, ListItemButton, ListItemSecondaryAction, ListItemText, ListSubheader, Radio, TextField, Toolbar, Typography } from "@mui/material"
import { Box } from "@mui/system";
import { AccountCircle, Close, Email, ExpandLess, ExpandMore, FiberManualRecord, ManageAccounts, Verified } from "@mui/icons-material";
import { useClient } from "react-supabase";
import { SlideUpTransition } from "../../utils";
import { FullHistory, Group, History, User, UserRole, UserWithGroups } from "../../types/supabaseTypes";
import { useDependency } from "../../hooks/useDependency";
import { IDrinkRepository } from "../../repository/IDrinkRepository";
import moment from "moment";

type EditUserDialogProps = {
    user: UserWithGroups,
    open: boolean,
    handleClose: () => void,
    onUserEditFinished: (user: UserEdited) => void,
    deleteUser: (user: User) => void
}

export type UserEdited = {
    displayName: string,
    verified: boolean,
    role: UserRole,
    userId: string
}

const EditUserDialog = ({ user, open, handleClose, onUserEditFinished, deleteUser }: EditUserDialogProps) => {

    const [userRoleCollapseOpen, setUserCollapseOpen] = useState(false);
    const [role, setRole] = useState<UserRole>(user.role);
    const drinksRepository = useDependency<IDrinkRepository>("IDrinkRepository");
    const [verified, setVerified] = useState(user.verified)
    const [deleteUserOpen, setDeleteUserOpen] = useState(false);
    const [userInfo, setUserInfo] = useState({ openAmount: 0 });
    const [drinksForUser, setDrinksForUser] = useState<FullHistory[]>([]);
    const client = useClient();

    useEffect(() => {
        if (drinksRepository) {
            drinksRepository.fetchOpenDrinksForUser(user.userId).then(result => {
                if (result && result.data) {
                    setUserInfo({ openAmount: result.data.reduce((prev, curr) => prev + ((curr?.count ?? 0) * (curr?.drink?.price ?? 1)), 0) })
                    setDrinksForUser(result.data);
                }
            })
        }
        setRole(user.role);
        setVerified(user.verified);
    }, [user, client, drinksRepository]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setUserCollapseOpen(false);
        const data = new FormData(event.currentTarget);

        onUserEditFinished({
            userId: user.userId,
            displayName: data.get("displayName"),
            role,
            verified
        } as UserEdited);
    }

    return <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={SlideUpTransition}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <AppBar position="sticky">
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
                    <ListItem key={"displayName"} sx={{ pt: 0, pb: 0 }}>
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
                    <ListItem key={"email"} sx={{ pt: 0, pb: 0 }}>
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
                    <ListItem key={"verified"}>
                        <ListItemAvatar>
                            <Avatar>
                                <Verified />
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary="Verified" />
                        <ListItemSecondaryAction>
                            <Checkbox checked={verified} onChange={(e) => setVerified(e.target.checked)} />
                        </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                    <List subheader={<ListSubheader>Gruppen</ListSubheader>}>
                        {
                            user?.groups && user.groups.map((x: Group) => <ListItem divider>
                                <ListItemAvatar>
                                    <FiberManualRecord sx={{ color: x.color }} />
                                </ListItemAvatar>
                                <ListItemText primary={x.name} />
                            </ListItem>)
                        }
                    </List>
                    <Divider />
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
                                Array.from<{ value: UserRole, display: string }>([
                                    { value: "user", display: "Benutzer" },
                                    { value: "procure", display: "Procure" },
                                    { value: "finance", display: "Finanzen" },
                                    { value: "admin", display: "Administrator" }
                                ])
                                    .map(x => <ListItem key={x.value} sx={{ pl: 4 }}>
                                        <ListItemAvatar>
                                            <Radio
                                                checked={role === x.value}
                                                onChange={(e) => setRole(e.target.value as UserRole)}
                                                value={x.value}
                                                name="role-buttons" />
                                        </ListItemAvatar>
                                        <ListItemText primary={x.display} />
                                    </ListItem>)
                            }
                        </List>
                    </Collapse>
                    <Divider />
                    <List subheader={<ListSubheader>Offene Getränke</ListSubheader>}>
                        {
                            drinksForUser && drinksForUser.map((x: FullHistory) => <ListItem dense key={x.created_at}>
                                <ListItemAvatar>
                                    <Typography>{x.count} x</Typography>
                                </ListItemAvatar>
                                <ListItemText primary={x.drink.name} secondary={moment(new Date((x.created_at ?? ""))).format("HH:mm")} />
                                <ListItemSecondaryAction>
                                    <Typography>{(x.count ?? 0) * (x.drink?.price ?? 1)} €</Typography>
                                </ListItemSecondaryAction>
                            </ListItem>)
                        }
                    </List>
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