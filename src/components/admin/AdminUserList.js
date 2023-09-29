import { Grid, ListItem, ListItemAvatar, ListItemText, Paper } from "@mui/material";
import { AccountCircle, AdminPanelSettings, EuroRounded, Liquor } from "@mui/icons-material";
import EditUserDialog from "./EditUserDialog";
import { useState } from "react";
import { useRealtime } from "../../hooks/useRealtime";
import { useClient } from "react-supabase";
import { Loading } from "../Loading";
import { Error } from "../Error";
import { supabase_admin } from "../../supabaseClient";
import { captureException } from "@sentry/react";

const AdminUserItem = ({ user, onEditClick }) => {
    return <Paper sx={{ width: "100%", marginBottom: 2, listStyleType: "none" }}>
        <ListItem onClick={onEditClick}>
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
        </ListItem>
    </Paper>
}

const AdminUserList = () => {

    const [editUserOpen, setEditUserOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState({});
    const client = useClient();

    const [{ data: users, fetching, error }] = useRealtime(
        'user',
        {
            select: {
                columns: '*',
                order: (query) => query.order("displayName", { ascending: true })
            }
        },
        (data, payload) => data.id === payload.id);

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

    if (fetching)
        return <Loading />

    if (error)
        return <Error message={error.message} />

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center"
        sx={{ paddingTop: 2 }}>
        <Grid container width="100%" direction="column" alignItems="center" justifyContent="center" paddingLeft={2} paddingRight={2}>
            {
                !fetching && users && users.map((user, index) => <AdminUserItem key={"user" + index} user={user} onEditClick={() => editUser(user)} />)
            }
        </Grid>
        <EditUserDialog
            open={editUserOpen}
            user={currentUser}
            handleClose={() => setEditUserOpen(false)}
            deleteUser={deleteUser}
            onUserEditFinished={onUserEditFinished} />
    </Grid>);
}

export default AdminUserList;