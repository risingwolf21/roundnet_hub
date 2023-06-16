import { Grid, ListItem, ListItemText, Paper } from "@mui/material";
import { connect } from "react-redux";
import { compose } from "redux";
import { firestoreConnect, isLoaded } from "react-redux-firebase";

const users = "users";

const AdminUserItem = ({ user, onEditClick }) => {
    return <Paper sx={{ width: "100%", marginBottom: 2, listStyleType: "none" }}>
        <ListItem onClick={onEditClick}>
            <ListItemText primary={user.displayName} secondary={user.email} />
        </ListItem>
    </Paper>
}

const AdminUserList = ({ dispatch, users, profile, auth }) => {

    return (<Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center"
        sx={{ paddingTop: 2 }}>
        <Grid container width="100%" direction="column" alignItems="center" justifyContent="center" paddingLeft={2} paddingRight={2}>
            {
                isLoaded(users) && users.map(user => <AdminUserItem user={user} onEditClick={() => {}} />)
            }
        </Grid>
    </Grid>);
}

export default compose(
    firestoreConnect((props) => [
        {
            collection: `users`,
            storeAs: users
        }
    ]),
    connect((state) => ({
        users: state.firestore.ordered.users,
        profile: state.firebase.profile,
        auth: state.firebase.auth
    }))
)(AdminUserList);