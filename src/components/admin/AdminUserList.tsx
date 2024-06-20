import {
    AccountCircle,
    AdminPanelSettings,
    ArrowBack,
    Edit,
    EuroRounded,
    Liquor,
    PersonOff,
    Refresh,
    Verified
} from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import {
    AppBar,
    Badge,
    Box,
    Chip,
    Grid,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    Toolbar,
    Typography
} from "@mui/material";
import React, {Fragment, useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {useNavigate} from "react-router-dom";
import {fetchAdminUsersAsync} from "../../redux/adminUserSlice";
import {RootState, useAppDispatch} from "../../redux/store";
import {User, UserWithGroups} from "../../types/supabaseTypes";
import {AlertMessage, AlertSnackbar} from "../AlertSnackbar";
import {Error} from "../Error";
import {Search, SearchIconWrapper, StyledInputBase} from "../SearchBar";
import EditUserDialog, {UserEdited} from "./EditUserDialog";
import {captureException} from "@sentry/react";
import {AdminUsersRepository} from "../../repository/AdminUsersRepository";

const AdminUserItem = ({user, onEditClick}: { user: User, onEditClick: () => void }) => {
    let color = "rgba(0, 0, 0, 0.54)";
    return <ListItem divider>
        <ListItemAvatar>
            {
                user.role === "user" && <AccountCircle htmlColor={color}/>
            }
            {
                user.role === "finance" && <EuroRounded htmlColor={color}/>
            }
            {
                user.role === "procure" && <Liquor htmlColor={color}/>
            }
            {
                user.role === "admin" && <AdminPanelSettings htmlColor={color}/>
            }
        </ListItemAvatar>
        <ListItemText primary={<Fragment>
            <Box sx={{display: "flex", flexDirection: "row", alignItems: "center"}}>
                <Typography>{user.displayName}</Typography>
                {
                    user.verified && <Verified sx={{ml: 1, color: "rgba(0, 0, 0, 0.54)", fontSize: "12px"}}/>
                }
            </Box>
        </Fragment>}
                      secondary={user.email}/>
        <ListItemSecondaryAction>
            <IconButton onClick={onEditClick}>
                <Edit/>
            </IconButton>
        </ListItemSecondaryAction>
    </ListItem>
}
const AdminUserList = () => {

    const [editUserOpen, setEditUserOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserWithGroups | null>();
    const [searchString, setSearchString] = useState("");
    const [showNotVerifiedUsers, setShowNotVerifiedUsers] = useState(false)
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

    useEffect(() => {
        dispatch(fetchAdminUsersAsync());
    }, [dispatch]);

    const {users, loading, error} = useSelector((state: RootState) => state.adminUsers);

    const editUser = (user: UserWithGroups) => {
        setCurrentUser(user);
        setEditUserOpen(true);
    }

    const deleteUser = async (user: User) => {
        AdminUsersRepository.deactivateUser(user).then(() => {
            setAlertInfo({message: `Successfully deactivated user ${user.email}`, severity: "success"});
        }).catch(error => {
            captureException(error);
            setAlertInfo({message: error, severity: "error"});
        });
    }

    const onUserEditFinished = async (result: UserEdited) => {
        await AdminUsersRepository.updateUser(result);
        setEditUserOpen(false);
        dispatch(fetchAdminUsersAsync());
    }

    if (error)
        return <Error message={error}/>

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <AppBar position="sticky">
            <Toolbar>
                <IconButton
                    size="large"
                    edge="start"
                    color="inherit"
                    onClick={() => navigate(-1)}>
                    <ArrowBack/>
                </IconButton>
                <Search>
                    <SearchIconWrapper>
                        <SearchIcon/>
                    </SearchIconWrapper>
                    <StyledInputBase
                        placeholder="Search…"
                        onChange={(e) => setSearchString(e.target.value)}
                        inputProps={{'aria-label': 'search'}}
                    />
                </Search>

                <IconButton color="inherit" onClick={() => dispatch(fetchAdminUsersAsync())}>
                    <Refresh/>
                </IconButton>
            </Toolbar>
        </AppBar>
        {loading && <LinearProgress style={{position: "fixed", left: 0, right: 0, top: 56}}/>}

        <Badge sx={{mt: 2}} color="info"
               badgeContent={users.filter(x => searchString === "" || x.displayName?.toLowerCase().includes(searchString.toLowerCase())).filter(x => !x.verified).length}>
            <Chip icon={<PersonOff/>} label="Not verified"
                  onClick={() => setShowNotVerifiedUsers(!showNotVerifiedUsers)}
                  variant={showNotVerifiedUsers ? "filled" : "outlined"}/>
        </Badge>

        <List sx={{width: "100%"}}>
            {
                users && users
                    .filter((x: UserWithGroups) => searchString === "" || x.displayName?.toLowerCase().includes(searchString.toLowerCase()))
                    .filter(x => (showNotVerifiedUsers && !x.verified) || (!showNotVerifiedUsers && x.verified))
                    .map((user, index) => <AdminUserItem key={"user" + index} user={user}
                                                         onEditClick={() => editUser(user)}/>)
            }
        </List>
        {
            currentUser && <EditUserDialog
                open={editUserOpen}
                user={currentUser}
                handleClose={() => setEditUserOpen(false)}
                deleteUser={deleteUser}
                onUserEditFinished={onUserEditFinished}/>
        }
        <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)}/>
    </Grid>);
}

export default AdminUserList;