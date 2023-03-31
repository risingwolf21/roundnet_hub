import { Fab, Grid, Input, TextField } from "@mui/material";
import { connect } from "react-redux";
import { compose } from "redux";
import CheckIcon from '@mui/icons-material/Check';
import { useFirebase } from "react-redux-firebase";


const UserScreen = ({ auth, profile }) => {

    const firebase = useFirebase();

    const updateProfile = () => {
        firebase.updateProfile({ role: "admin" });
    }

    return <Grid
        width="100%"
        sx={{ paddingLeft: 2, paddingRight: 2 }}>
        <TextField
            fullWidth
            id="filled-disabled"
            variant="filled"
            defaultValue={auth.displayName ? auth.displayName : ""}
            label="Name"
            margin="normal" />
        <TextField
            fullWidth
            disabled
            id="filled-disabled"
            variant="filled"
            defaultValue={auth.email}
            label="Email"
            margin="normal" />
        <Fab sx={{ background: "#66bb6a", position: "absolute", right: "8px", bottom: "64px" }} onClick={updateProfile}>
            <CheckIcon sx={{ color: "white" }} />
        </Fab>
    </Grid >
}
export default compose(
    connect((state) => ({
        profile: state.firebase.profile,
        auth: state.firebase.auth
    }))
)(UserScreen);