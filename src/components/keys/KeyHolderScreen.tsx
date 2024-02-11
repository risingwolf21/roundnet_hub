import {AddOutlined, ArrowBack, EditOffOutlined, EditOutlined} from "@mui/icons-material";
import KeyIcon from "@mui/icons-material/Key";
import SearchIcon from "@mui/icons-material/Search";
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Dialog,
    Fab,
    IconButton,
    LinearProgress,
    List,
    ListItemAvatar,
    ListItemButton,
    ListItemSecondaryAction,
    ListItemText,
    Toolbar,
    Typography
} from "@mui/material";
import React, {useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {useClient} from "react-supabase";
import {TABLE_USER} from "src/constants";
import {useDependency} from "src/hooks/useDependency";
import {fetchKeysAsync, keyHoldersSelector} from "src/redux/keysSlice";
import {AppDispatch, RootState, useAppDispatch} from "src/redux/store";
import {IKeysRepository} from "src/repository/IKeysRepository";
import {FullKeyHolder, Key, User} from "src/types/supabaseTypes";
import {SlideUpTransition} from "src/utils";
import {AlertMessage, AlertSnackbar} from "../AlertSnackbar";
import CustomAppBar from "../AppBar";
import {LoadingIndicator} from "../LoadingIndicator";
import {Search, SearchIconWrapper, StyledInputBase} from "../SearchBar";
import {SwipeableDialog} from "../SwipeableDialog";
import {can} from "../../utils/PermissionService";
import {EditOrAddKeyDialog} from "./EditOrAddKeyDialog";
import EditIcon from "@mui/icons-material/Edit";
import {TFunction} from "i18next";
import {useTranslation} from "react-i18next";

const KeyHolderScreenProvider = () => {
    const {user} = useSelector((state: RootState) => state.application);
    const keysRepository = useDependency<IKeysRepository>("IKeysRepository");
    const dispatch = useAppDispatch();
    const keyHolders = useSelector((state: RootState) => keyHoldersSelector.selectAll(state));
    const {loading} = useSelector((state: RootState) => state.keys);
    const {t} = useTranslation();

    if (!user || !keysRepository)
        return <AlertSnackbar close={() => {
        }} alertInfo={{message: "Fatal error occured. Repository or user was null!", severity: "error"}}/>

    return <KeyHolderScreen
        t={t}
        keysRepository={keysRepository}
        dispatch={dispatch}
        user={user}
        loading={loading}
        keyHolders={keyHolders}/>
}

type KeyHolderScreenProps = {
    keysRepository: IKeysRepository,
    dispatch: AppDispatch,
    keyHolders: FullKeyHolder[],
    loading: boolean,
    user: User,
    t: TFunction
}

export const EMPTY_KEY = {name: "", color: "#000000", id: 0, created_at: ""};

const KeyHolderScreen = ({keysRepository, dispatch, keyHolders, loading, user, t}: KeyHolderScreenProps) => {

    const [searchUserOpen, setSearchUserOpen] = useState(false);
    const [addOrUpdateKeysOpen, setAddOrUpdateKeysOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedKeyHolder, setSelectedKeyHolder] = useState<FullKeyHolder | null>(null);
    const [isEditingMode, setEditingMode] = useState(false);
    const [keyToEdit, setKeyToEdit] = useState<Key>(EMPTY_KEY);
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

    const userSelected = (user: User) => {
        setSearchUserOpen(false);
        setSelectedUser(user);
    }

    const confirmKeyHandOver = () => {
        if (!selectedKeyHolder || !selectedUser) {
            setAlertInfo({message: t("keyHandOverError", {error: ""}), severity: "error"});
            return;
        }
        keysRepository.giveKeyToUser(selectedKeyHolder.key, selectedUser).then((result) => {
            if (result.error)
                setAlertInfo({message: t("keyHandOverError", {error: result.error}), severity: "error"});
            setSelectedUser(null);
            setSelectedKeyHolder(null);
            dispatch(fetchKeysAsync(keysRepository));
        });
    }

    const selectKeyToHandOver = (key: FullKeyHolder) => {
        setSearchUserOpen(true);
        setSelectedKeyHolder(key);
    }

    const selectKeyToReceive = (key: FullKeyHolder) => {
        setSelectedKeyHolder(key);
        setSelectedUser(user);
    }

    return <Box>
        <CustomAppBar navigateBack/>
        <LoadingIndicator loading={loading}/>
        <List>
            {
                keyHolders.map((key: FullKeyHolder) => <ListItemButton key={key.key.id} divider>
                    <ListItemAvatar>
                        <Avatar sx={{background: key.key.color, width: 40, height: 40, borderRadius: 2}}>
                            <KeyIcon/>
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={key.user.displayName} secondary={key.key.name}/>
                    {
                        isEditingMode
                            ? <ListItemSecondaryAction>
                                <IconButton onClick={() => {
                                    setKeyToEdit(key.key);
                                    setAddOrUpdateKeysOpen(true);
                                }}>
                                    <EditIcon/>
                                </IconButton>
                            </ListItemSecondaryAction>
                            : key.user.userId === user.userId ?
                                <ListItemSecondaryAction>
                                    <Button color="primary" onClick={() => selectKeyToHandOver(key)}>
                                        {t("handover_key")}
                                    </Button>
                                </ListItemSecondaryAction>
                                :
                                <ListItemSecondaryAction>
                                    <Button color="primary" onClick={() => selectKeyToReceive(key)}>
                                        {t("take_key")}
                                    </Button>
                                </ListItemSecondaryAction>
                    }
                </ListItemButton>)
            }
        </List>

        {
            can("edit", "keyFinder") &&
            <Box sx={{position: "fixed", right: "16px", bottom: "76px", display: "flex", flexDirection: "row"}}>
                <Fab sx={{background: "#66bb6a", mr: 2}}
                     onClick={() => {
                         setKeyToEdit(EMPTY_KEY);
                         setAddOrUpdateKeysOpen(true);
                     }}>
                    <AddOutlined sx={{color: "#fff"}}/>
                </Fab>
                <Fab sx={{background: "#66bb6a"}}
                     onClick={() => setEditingMode(!isEditingMode)}>
                    {
                        isEditingMode
                            ? <EditOffOutlined sx={{color: "#fff"}}/>
                            : <EditOutlined sx={{color: "#fff"}}/>
                    }
                </Fab>
            </Box>
        }
        <SearchUserDialog open={searchUserOpen} handleClose={() => setSearchUserOpen(false)} user={user}
                          onUserSelected={userSelected}/>
        <SwipeableDialog open={selectedUser !== null} setOpen={() => {
        }} onClose={() => setSelectedUser(null)} title={t("keyHandOver")}>
            <Typography m={2}>
                {
                    selectedUser?.userId === user.userId ?
                        t("confirmKeyTaken", {
                            keyName: selectedKeyHolder?.key.name,
                            userName: selectedKeyHolder?.user.displayName
                        }) :
                        t("confirmKeyHandover", {
                            keyName: selectedKeyHolder?.key.name,
                            userName: selectedKeyHolder?.user.displayName
                        })
                }
            </Typography>
            <Box sx={{
                display: "flex",
                flexDirection: "row",
                flexGrow: 1,
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0
            }}>
                <Button variant="outlined" fullWidth sx={{
                    ml: 2,
                    mr: 1,
                    mb: 2,
                    borderRadius: "50px !important",
                    fontSize: "16px",
                    fontFamily: "sans-serif",
                    lineSpacing: "24px"
                }} onClick={() => setSelectedUser(null)}>{t("cancel")}</Button>
                <Button variant="contained" fullWidth sx={{
                    ml: 1,
                    mr: 2,
                    mb: 2,
                    borderRadius: "50px !important",
                    fontSize: "16px",
                    fontFamily: "sans-serif",
                    lineSpacing: "24px"
                }} onClick={confirmKeyHandOver} autoFocus>
                    {t("confirm")}
                </Button>
            </Box>
        </SwipeableDialog>
        <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)}/>
        <EditOrAddKeyDialog open={addOrUpdateKeysOpen} handleClose={() => {
            setAddOrUpdateKeysOpen(false);
            setEditingMode(false);
            dispatch(fetchKeysAsync(keysRepository));
        }} keyToEdit={keyToEdit}/>
    </Box>
}

const SearchUserDialog = ({onUserSelected, user, open, handleClose}: {
    onUserSelected: (user: User) => void,
    user: User,
    open: boolean,
    handleClose: () => void
}) => {

    const [loading, setLoading] = useState(true);
    const [searchString, setSearchString] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const client = useClient();
    const {t} = useTranslation();

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
                        <ArrowBack/>
                    </IconButton>
                    <Search sx={{marginRight: 2}}>
                        <SearchIconWrapper>
                            <SearchIcon/>
                        </SearchIconWrapper>
                        <StyledInputBase
                            placeholder="Search…"
                            onChange={(e) => setSearchString(e.target.value)}
                            inputProps={{'aria-label': 'search'}}
                        />
                    </Search>
                </Toolbar>
            </AppBar>
            {loading && <LinearProgress style={{position: "fixed", left: 0, right: 0, top: 56}}/>}

            <List sx={{width: "100%"}}>
                {
                    users && users
                        .filter((x: User) => x.userId !== user.userId)
                        .filter((x: User) => searchString === "" || (x.displayName ?? "").toLowerCase().includes(searchString.toLowerCase()))
                        .map((user: User) => <ListItemButton key={user.userId}
                                                             onClick={() => onUserSelected(user)}>
                            <ListItemText primary={user.displayName} secondary={t("userName")}/>
                        </ListItemButton>)
                }
            </List>
        </Box>
    </Dialog>
}

export default KeyHolderScreenProvider;