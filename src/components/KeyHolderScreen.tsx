import { ArrowBack } from "@mui/icons-material";
import KeyIcon from "@mui/icons-material/Key";
import SearchIcon from "@mui/icons-material/Search";
import { AppBar, Avatar, Box, Button, Dialog, IconButton, LinearProgress, List, ListItem, ListItemAvatar, ListItemButton, ListItemSecondaryAction, ListItemText, Toolbar, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useClient } from "react-supabase";
import { TABLE_USER } from "src/constants";
import { useDependency } from "src/hooks/useDependency";
import { fetchKeyssAsync } from "src/redux/keysSlice";
import { AppDispatch, RootState, useAppDispatch } from "src/redux/store";
import { IKeysRepository } from "src/repository/IKeysRepository";
import { FullKeyHolder, User } from "src/types/supabaseTypes";
import { SlideUpTransition } from "src/utils";
import { AlertSnackbar } from "./AlertSnackbar";
import CustomAppBar from "./AppBar";
import { LoadingIndicator } from "./LoadingIndicator";
import { Search, SearchIconWrapper, StyledInputBase } from "./SearchBar";
import { SwipeableDialog } from "./SwipeableDialog";

const KeyHolderScreenProvider = () => {
    const { user } = useSelector((state: RootState) => state.application);
    const keysRepository = useDependency<IKeysRepository>("IKeysRepository");
    const dispatch = useAppDispatch();
    const { keys, loading } = useSelector((state: RootState) => state.keys);

    if (!user || !keysRepository)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository or user was null!", severity: "error" }} />

    return <KeyHolderScreen
        keysRepository={keysRepository}
        dispatch={dispatch}
        user={user}
        loading={loading}
        keys={keys} />
}

type KeyHolderScreenProps = {
    keysRepository: IKeysRepository,
    dispatch: AppDispatch,
    keys: FullKeyHolder[],
    loading: boolean,
    user: User
}

const KeyHolderScreen = ({ keysRepository, dispatch, keys, loading, user }: KeyHolderScreenProps) => {

    const [searchUserOpen, setSearchUserOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedKeyHolder, setSelectedKeyHolder] = useState<FullKeyHolder | null>(null);

    useEffect(() => {
        dispatch(fetchKeyssAsync(keysRepository));
    }, [dispatch, keysRepository]);

    const userSelected = (user: User) => {
        setSearchUserOpen(false);
        setSelectedUser(user);
    }

    const confirmKeyHandOver = () => {
        if (!selectedKeyHolder || !selectedUser)
            return;
        keysRepository.giveKeyToUser(selectedKeyHolder.key, selectedUser).then((result) => {
            setSelectedUser(null);
            setSelectedKeyHolder(null);
            dispatch(fetchKeyssAsync(keysRepository));
        });
    }

    const selectKeyToHandOver = (key: FullKeyHolder) => {
        setSearchUserOpen(true);
        setSelectedKeyHolder(key);
    }

    const selectKeyToRecieve = (key: FullKeyHolder) => {
        setSelectedKeyHolder(key);
        setSelectedUser(user);
    }

    return <Box>
        <CustomAppBar navigateBack />
        <LoadingIndicator loading={loading} />
        <List>
            {
                keys.map((key: FullKeyHolder, index: number) => <ListItem key={index} divider>
                    <ListItemAvatar>
                        <Avatar sx={{ background: "#88AEBF", width: 40, height: 40, borderRadius: 2 }}>
                            <KeyIcon />
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={key.user.displayName} secondary={key.key.name} />
                    {
                        key.user.userId === user.userId ?
                            <ListItemSecondaryAction>
                                <Button color="primary" onClick={() => selectKeyToHandOver(key)}>
                                    Abgeben
                                </Button>
                            </ListItemSecondaryAction>
                            :
                            <ListItemSecondaryAction>
                                <Button color="primary" onClick={() => selectKeyToRecieve(key)}>
                                    Annehmen
                                </Button>
                            </ListItemSecondaryAction>
                    }
                </ListItem>)
            }
        </List>
        <SearchUserDialog open={searchUserOpen} handleClose={() => setSearchUserOpen(false)} user={user} onUserSelected={userSelected} />
        <SwipeableDialog open={selectedUser !== null} setOpen={() => { }} onClose={() => setSelectedUser(null)} title={"Schlüsselübergabe"}>
            <Typography m={2}>
                {
                    selectedUser?.userId === user.userId ?
                        "Hiermit bestätigst du das du den Schlüssel \"" + selectedKeyHolder?.key.name + "\" von \"" + selectedKeyHolder?.user.displayName + "\" erhalten hast!"
                        : "Bist du sicher das du den Schlüssel \"" + selectedKeyHolder?.key.name + "\" an \"" + selectedUser?.displayName + "\" abgeben möchtest?"
                }
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "row", flexGrow: 1, position: "absolute", left: 0, right: 0, bottom: 0 }}>
                <Button variant="outlined" fullWidth sx={{ ml: 2, mr: 1, mb: 2, borderRadius: "50px !important", fontSize: "16px", fontFamily: "sans-serif", lineSpacing: "24px" }} onClick={() => setSelectedUser(null)}>Abbrechen</Button>
                <Button variant="contained" fullWidth sx={{ ml: 1, mr: 2, mb: 2, borderRadius: "50px !important", fontSize: "16px", fontFamily: "sans-serif", lineSpacing: "24px" }} onClick={confirmKeyHandOver} autoFocus>
                    Bestätigen
                </Button>
            </Box>
        </SwipeableDialog>
    </Box>
}

const SearchUserDialog = ({ onUserSelected, user, open, handleClose }: { onUserSelected: (user: User) => void, user: User, open: boolean, handleClose: () => void }) => {

    const [loading, setLoading] = useState(true);
    const [searchString, setSearchString] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const client = useClient();

    useEffect(() => {
        client.from(TABLE_USER)
            .select("*")
            .eq("verified", true)
            .returns<User[]>().then(result => {
                setUsers(result.data ?? []);
                setLoading(false);
            })
    }, [client]);

    return <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={SlideUpTransition}>
        <Box sx={{
            width: "100%",
            direction: "column",
            alignItems: "center",
            justifyContent: "center"
        }}>
            <AppBar position="sticky">
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        onClick={handleClose}>
                        <ArrowBack />
                    </IconButton>
                    <Search sx={{ marginRight: 2 }}>
                        <SearchIconWrapper>
                            <SearchIcon />
                        </SearchIconWrapper>
                        <StyledInputBase
                            placeholder="Search…"
                            onChange={(e) => setSearchString(e.target.value)}
                            inputProps={{ 'aria-label': 'search' }}
                        />
                    </Search>
                </Toolbar>
            </AppBar>
            {loading && <LinearProgress style={{ position: "fixed", left: 0, right: 0, top: 56 }} />}

            <List sx={{ width: "100%" }}>
                {
                    users && users
                        .filter((x: User) => x.userId !== user.userId)
                        .filter((x: User) => searchString === "" || (x.displayName ?? "").toLowerCase().includes(searchString.toLowerCase()))
                        .map((user: User, index: number) => <ListItemButton key={index} onClick={() => onUserSelected(user)}>
                            <ListItemText primary={user.displayName} secondary={"Benutzername"} />
                        </ListItemButton>)
                }
            </List>
        </Box>

    </Dialog>
}

export default KeyHolderScreenProvider;