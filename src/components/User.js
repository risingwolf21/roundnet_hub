import { Checkbox, Fab, FormControlLabel, Grid, TextField } from "@mui/material";
import { connect } from "react-redux";
import { compose } from "redux";
import CheckIcon from '@mui/icons-material/Check';
import { isLoaded, useFirebase } from "react-redux-firebase";
import { Box } from "@mui/system";


const UserScreen = ({ auth, profile }) => {

    const firebase = useFirebase();

    const handleSubmit = (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        var displayName = data.get('displayName');
        if (displayName !== profile.displayName) {

            firebase.updateProfile({ displayName: displayName });
            firebase.updateAuth({ displayName: displayName });
        }
    };

    return <Grid
        width="100%"
        sx={{ paddingLeft: 2, paddingRight: 2 }}>
        {
            isLoaded(profile) && <>
                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <TextField
                        fullWidth
                        id="displayName"
                        name="displayName"
                        variant="filled"
                        defaultValue={profile.displayName}
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
                    {
                        profile.role === "admin" && <FormControlLabel
                            control={<Checkbox checked={profile.role === "admin"} disabled />}
                            label="Adminrechte"
                        />
                    }
                    <Fab sx={{ background: "#66bb6a", position: "absolute", right: "16px", bottom: "16px" }} type="submit">
                        <CheckIcon sx={{ color: "white" }} />
                    </Fab>
                </Box>
            </>
        }
    </Grid >
}
export default compose(
    connect((state) => ({
        profile: state.firebase.profile,
        auth: state.firebase.auth
    }))
)(UserScreen);