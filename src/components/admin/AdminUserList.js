import { AppBar, Grid, IconButton, InputBase, LinearProgress, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Toolbar, alpha, styled } from "@mui/material";
import { AccountCircle, AdminPanelSettings, ArrowBack, Edit, EuroRounded, Liquor } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import EditUserDialog from "./EditUserDialog";
import { useState } from "react";
import { useClient } from "react-supabase";
import { Error } from "../Error";
import { supabase_admin } from "../../supabaseClient";
import { captureException } from "@sentry/react";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { fetchAdminUsersAsync } from "../../redux/adminUserSlice";
import { useNavigate } from "react-router-dom";

const Search = styled('div')(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    '&:hover': {
        backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
        marginLeft: theme.spacing(3),
        width: 'auto',
    },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: 'inherit',
    '& .MuiInputBase-input': {
        padding: theme.spacing(1, 1, 1, 0),
        // vertical padding + font size from searchIcon
        paddingLeft: `calc(1em + ${theme.spacing(4)})`,
        transition: theme.transitions.create('width'),
        width: '100%',
        [theme.breakpoints.up('md')]: {
            width: '20ch',
        },
    },
}));

const AdminUserItem = ({ user, onEditClick }) => {
    return <ListItem divider>
        <ListItemAvatar>
            {
                user.role === "user" && <AccountCircle />
            }
            {
                user.role === "finance" && <EuroRounded />
            }
            {
                user.role === "procure" && <Liquor />
            }
            {
                user.role === "admin" && <AdminPanelSettings />
            }
        </ListItemAvatar>
        <ListItemText primary={user.displayName} secondary={user.email} />
        <ListItemSecondaryAction>
            <IconButton onClick={onEditClick}>
                <Edit />
            </IconButton>
        </ListItemSecondaryAction>
    </ListItem>
}

const AdminUserList = () => {

    const [editUserOpen, setEditUserOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState({});
    const [searchString, setSearchString] = useState({});
    const client = useClient();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(fetchAdminUsersAsync({ client }));
    }, [dispatch, client]);

    const { users, loading, error } = useSelector(state => state.adminUsers);

    const editUser = (user) => {
        setCurrentUser(user);
        setEditUserOpen(true);
    }

    const deleteUser = async (user) => {
        const { error } = await supabase_admin.auth.admin.deleteUser(user.userId);
        const { error: e2 } = await client.from("payments").delete().eq("userId", user.userId)
        const { error: e1 } = await client.from("user").delete().eq("userId", user.userId);
        setEditUserOpen(false);

        if (error) {
            captureException(error, (scope) => {
                scope.clear();
                scope.setExtra("user", JSON.stringify(user));
                return scope;
            });
        }
        if (e1) {
            captureException(e1, (scope) => {
                scope.clear();
                scope.setExtra("user", JSON.stringify(user));
                return scope;
            });
        }
        if (e2) {
            captureException(e2, (scope) => {
                scope.clear();
                scope.setExtra("user", JSON.stringify(user));
                return scope;
            });
        }
    }

    const onUserEditFinished = async (result) => {

        await client.from("user").update({ displayName: result.displayName, role: result.role }).eq("userId", result.userId);
        await client.auth.admin.updateUserById(
            result.userId,
            { user_metadata: { displayName: result.displayName, role: result.role } }
        );

        setEditUserOpen(false);
    }

    if (error)
        return <Error message={error} />

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
                    <ArrowBack />
                </IconButton>
                <Search>
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
                users && users.filter(x => searchString === "" || x.displayName.toLowerCase().includes(searchString.toLowerCase())).map((user, index) => <AdminUserItem key={"user" + index} user={user} onEditClick={() => editUser(user)} />)
            }
        </List>
        <EditUserDialog
            open={editUserOpen}
            user={currentUser}
            handleClose={() => setEditUserOpen(false)}
            deleteUser={deleteUser}
            onUserEditFinished={onUserEditFinished} />
    </Grid>);
}

export default AdminUserList;