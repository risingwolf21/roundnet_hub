import React, {FormEvent, useEffect, useState} from "react";
import {
    AppBar,
    Avatar,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListSubheader,
    TextField,
    Toolbar,
    Typography
} from "@mui/material"
import {Box} from "@mui/system";
import {AccountCircle, Close, Edit, Email, FiberManualRecord, ManageAccounts, Verified} from "@mui/icons-material";
import {useClient} from "react-supabase";
import {SlideUpTransition} from "../../../utils";
import {FullHistory, UserWithGroupsAndRoles} from "../../../types/supabaseTypes";
import moment from "moment";
import {captureException} from "@sentry/react";
import {SupabaseDrinkRepository} from "../../../repository/DrinkRepository";
import {Permissions} from "types/supabase"
import {AppRolesDialog} from "./AppRolesDialog";

type EditUserDialogProps = {
    user: UserWithGroupsAndRoles,
    open: boolean,
    handleClose: () => void,
    onUserEditFinished: (user: UserEdited) => void,
    deleteUser: (user: User) => void
}

export type UserEdited = {
    displayName: string,
    verified: boolean,
    userId: string,
    permissions: Permissions[],
    roles: AppRole[]
}

const EditUserDialog = ({user, open, handleClose, onUserEditFinished, deleteUser}: EditUserDialogProps) => {

    const [editUserRolesOpen, setEditUserRolesOpen] = useState(false);
    const [verified, setVerified] = useState(user.verified)
    const [deleteUserOpen, setDeleteUserOpen] = useState(false);
    const [userPermissions, setUserPermissions] = useState<Permissions[]>([]);
    const [userRoles, setUserRoles] = useState<AppRole[]>([]);
    const [userInfo, setUserInfo] = useState({openAmount: 0});
    const [drinksForUser, setDrinksForUser] = useState<FullHistory[]>([]);
    const client = useClient();

    useEffect(() => {
        SupabaseDrinkRepository.fetchOpenDrinksForUser(user.userId).then(result => {
            if (result && result.data) {
                setUserInfo({openAmount: result.data.reduce((prev, curr) => prev + ((curr?.count ?? 0) * (curr?.drink?.price ?? 1)), 0)})
                setDrinksForUser(result.data);
            }
        }).catch(error => {
            captureException(error);
        })
        setVerified(user.verified);
        setUserPermissions(user.permissions ?? []);
        setUserRoles(user.roles);
    }, [user, client]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        onUserEditFinished({
            userId: user.userId,
            displayName: data.get("displayName"),
            verified,
            permissions: userPermissions,
            roles: userRoles
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
                        <Close/>
                    </IconButton>
                    <Typography sx={{ml: 2, flex: 1}} variant="h6" component="div">
                        Benutzer bearbeiten
                    </Typography>
                    <Button sx={{color: "white"}} type="submit">
                        Speichern
                    </Button>
                </Toolbar>
            </AppBar>
            <Box>
                <List>
                    <ListItem key={"displayName"} sx={{pt: 0, pb: 0}}>
                        <ListItemAvatar>
                            <Avatar>
                                <AccountCircle/>
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
                    <ListItem key={"email"} sx={{pt: 0, pb: 0}}>
                        <ListItemAvatar>
                            <Avatar>
                                <Email/>
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
                    <ListItem key={"verified"} secondaryAction={<Checkbox checked={verified}
                                                                          onChange={(e) => setVerified(e.target.checked)}/>}>
                        <ListItemAvatar>
                            <Avatar>
                                <Verified/>
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary="Verified"/>
                    </ListItem>
                    <ListItem key={"user_roles"} onClick={() => setEditUserRolesOpen(true)}
                              secondaryAction={
                                  <IconButton onClick={(event) => {
                                      setEditUserRolesOpen(true);
                                      event.stopPropagation();
                                  }}>
                                      <Edit/>
                                  </IconButton>}>
                        <ListItemAvatar>
                            <Avatar>
                                <ManageAccounts/>
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={user.roles.map(x => x.name).join(", ")}/>
                    </ListItem>
                    <Divider/>
                    <List subheader={<ListSubheader>Gruppen</ListSubheader>}>
                        {
                            user?.groups && user.groups.map((x: Group) => <ListItem key={x.id} divider>
                                <ListItemAvatar>
                                    <FiberManualRecord sx={{color: x.color}}/>
                                </ListItemAvatar>
                                <ListItemText primary={x.name}/>
                            </ListItem>)
                        }
                    </List>
                    <Divider/>
                    <Divider/>
                    <List subheader={<ListSubheader>Offene Getränke</ListSubheader>}>
                        {
                            drinksForUser && drinksForUser.map((x: FullHistory) =>
                                <ListItem
                                    dense
                                    key={x.id}
                                    secondaryAction={
                                        <Typography>{(x.count ?? 0) * (x.drink?.price ?? 1)} €</Typography>}>
                                    <ListItemAvatar>
                                        <Typography>{x.count} x</Typography>
                                    </ListItemAvatar>
                                    <ListItemText primary={x.drink.name}
                                                  secondary={moment(new Date((x.created_at ?? ""))).format("HH:mm")}/>
                                </ListItem>)
                        }
                    </List>
                </List>
                <Box sx={{position: "fixed", bottom: 0, left: 0, right: 0, pl: 2, pr: 2, pb: 2}}>
                    <Button
                        onClick={() => setDeleteUserOpen(true)}
                        fullWidth
                        color="error"
                        variant="contained"
                        sx={{
                            borderRadius: "50px !important",
                            fontSize: "16px",
                            fontFamily: "sans-serif",
                            lineSpacing: "24px"
                        }}>
                        Löschen</Button>
                </Box>
            </Box>
        </Box>
        <AppRolesDialog
            open={editUserRolesOpen}
            roles={user.roles}
            handleClose={() => setEditUserRolesOpen(false)}
            handleSubmit={(roles: AppRole[]) => {
                setUserRoles(roles);
                setEditUserRolesOpen(false)
            }}/>
        <Dialog open={deleteUserOpen}>
            <DialogTitle>
                {`Benuter ${user.displayName} löschen?`}
            </DialogTitle>
            <DialogContent>
                <Typography>
                    {`Wenn du diesen Benutzer löscht, wird dieser sowohl in der Datenbank als auch bei Supabase gelöscht. Es werden alle offenen, bezahlten und Getränke in Zahlung gelöscht. Auch der Verlauf der Getränke wird gelöscht. 
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