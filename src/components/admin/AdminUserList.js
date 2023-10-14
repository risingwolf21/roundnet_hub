import { AppBar, Badge, Box, Checkbox, Chip, Dialog, Grid, IconButton, LinearProgress, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Toolbar, Typography } from "@mui/material";
import { AccountCircle, AdminPanelSettings, ArrowBack, Close, Edit, EuroRounded, Liquor, PersonOff, Refresh, Verified } from "@mui/icons-material";
import SearchIcon from "@mui/icons-material/Search";
import EditUserDialog from "./EditUserDialog";
import { Fragment, useState } from "react";
import { useClient } from "react-supabase";
import { Error } from "../Error";
import { supabase_admin } from "../../supabaseClient";
import { captureException } from "@sentry/react";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { fetchAdminUsersAsync } from "../../redux/adminUserSlice";
import { useNavigate } from "react-router-dom";
import { Search, SearchIconWrapper, StyledInputBase } from "../SearchBar";
import { SlideUpTransition } from "../../utils";

const AdminUserItem = ({ user, onEditClick }) => {
    let color = "rgba(0, 0, 0, 0.54)";
    return <ListItem divider>
        <ListItemAvatar>
            {
                user.role === "user" && <AccountCircle htmlColor={color} />
            }
            {
                user.role === "finance" && <EuroRounded htmlColor={color} />
            }
            {
                user.role === "procure" && <Liquor htmlColor={color} />
            }
            {
                user.role === "admin" && <AdminPanelSettings htmlColor={color} />
            }
        </ListItemAvatar>
        <ListItemText primary={<Fragment>
            <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                <Typography>{user.displayName}</Typography>
                {
                    user.verified && <Verified sx={{ ml: 1, color: "rgba(0, 0, 0, 0.54)" }} fontSize="12px" />
                }
            </Box>
        </Fragment>}
            secondary={user.email} />
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
    const [searchString, setSearchString] = useState("");
    const [open, setOpen] = useState(false);
    const [showVerifiedUsers, setShowVerifiedUsers] = useState(true)
    const [showNotVerifiedUsers, setShowNotVerifiedUsers] = useState(true)
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
        console.log(result)
        await client.from("user").update({ displayName: result.displayName, role: result.role, verified: result.verified }).eq("userId", result.userId);
        await client.auth.admin.updateUserById(
            result.userId,
            { user_metadata: { displayName: result.displayName, role: result.role, verified: result.verified } }
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

                <IconButton color="inherit" onClick={() => dispatch(fetchAdminUsersAsync({ client }))}>
                    <Refresh />
                </IconButton>
            </Toolbar>
        </AppBar>
        {loading && <LinearProgress style={{ position: "fixed", left: 0, right: 0, top: 56 }} />}

        <Badge sx={{ mt: 2 }} color="info" badgeContent={users.filter(x => searchString === "" || x.displayName.toLowerCase().includes(searchString.toLowerCase())).filter(x => !x.verified).length}>
            <Chip icon={<PersonOff />} label="Not verified" onClick={() => setShowNotVerifiedUsers(!showNotVerifiedUsers)} variant={showNotVerifiedUsers ? "filled" : "outlined"} />
        </Badge>

        <List sx={{ width: "100%" }}>
            {
                users && users
                    .filter(x => searchString === "" || x.displayName.toLowerCase().includes(searchString.toLowerCase()))
                    .filter(x => (showNotVerifiedUsers && !x.verified) || (!showNotVerifiedUsers && x.verified))
                    .map((user, index) => <AdminUserItem key={"user" + index} user={user} onEditClick={() => editUser(user)} />)
            }
        </List>
        <EditUserDialog
            open={editUserOpen}
            user={currentUser}
            handleClose={() => setEditUserOpen(false)}
            deleteUser={deleteUser}
            onUserEditFinished={onUserEditFinished} />

        <Dialog
            fullWidth
            scroll="body"
            TransitionComponent={SlideUpTransition}
            sx={{
                "& .MuiDialog-container": {
                    "& .MuiPaper-root": {
                        width: "100%",
                        maxWidth: "100%",
                        minHeight: "50%",
                        position: "fixed",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        marginLeft: 0,
                        marginBottom: 0,
                        marginRight: 0,
                        borderTopLeftRadius: "24px",
                        borderTopRightRadius: "24px",
                        borderBottomRightRadius: 0,
                        borderBottomLeftRadius: 0
                    },
                },
            }}
            onClose={() => setOpen(false)}
            open={open}>
            <Toolbar sx={{ mt: 1 }}>
                <IconButton
                    size="large"
                    edge="start"
                    color="inherit"
                    onClick={() => setOpen(false)}>
                    <Close />
                </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>test</Typography>
            </Toolbar>
            <List>

            </List>
        </Dialog>

    </Grid >);
}

export default AdminUserList;