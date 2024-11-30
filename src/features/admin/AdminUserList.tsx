import {ArrowBack, PersonOff, Refresh} from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import {AppBar, Badge, Chip, Grid, IconButton, LinearProgress, List, Toolbar} from "@mui/material";
import React, {useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {useNavigate} from "react-router-dom";
import {fetchAdminUsersAsync} from "./slices/adminUserSlice";
import {RootState, useAppDispatch} from "../../redux/store";
import {UserWithGroups} from "../../types/supabaseTypes";
import {AlertMessage, AlertSnackbar} from "../../components/AlertSnackbar";
import {Error} from "../../components/Error";
import {Search, SearchIconWrapper, StyledInputBase} from "../../components/SearchBar";
import EditUserDialog, {UserEdited} from "./dialogs/EditUserDialog";
import {captureException} from "@sentry/react";
import {AdminUsersRepository} from "../../repository/AdminUsersRepository";
import {AdminUserItem} from "./components/AdminUserItem";


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