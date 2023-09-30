import { Button, Checkbox, Fab, FormControlLabel, Grid, TextField } from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';
import { Box } from "@mui/system";
import { useAuth } from "../hooks/useAuth";
import { useClient } from "react-supabase";


const UserScreen = () => {

    const { user } = useAuth();
    const client = useClient();

    const handleSubmit = async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        var displayName = data.get('displayName');
        if (displayName !== user["user_metadata"].displayName) {
            await client.from("users").update({ displayName }).eq("userId", user["user_metadata"].userId)
            await client.auth.updateUser({
                data: { displayName }
            });
        }
    };

    return <Grid
        width="100%"
        sx={{ paddingLeft: 2, paddingRight: 2 }}>
        {
            user["user_metadata"] && <>
                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <TextField
                        fullWidth
                        id="displayName"
                        name="displayName"
                        variant="filled"
                        defaultValue={user["user_metadata"].displayName}
                        label="Name"
                        margin="normal" />
                    <TextField
                        fullWidth
                        disabled
                        id="filled-disabled"
                        variant="filled"
                        defaultValue={user.email}
                        label="Email"
                        margin="normal" />
                    {
                        user["user_metadata"].role === "admin" && <FormControlLabel key={"adminRights"}
                            control={<Checkbox checked={user["user_metadata"].role === "admin"} disabled />}
                            label="Adminrechte"
                        />
                    }
                    <Fab key={"saveButton"} sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "16px", bottom: "72px" }} type="submit">
                        <CheckIcon sx={{ color: "white" }} />
                    </Fab>
                </Box>
                <Button fullWidth variant="contained" color="error" onClick={() => client.auth.signOut()}>
                    Logout
                </Button>
            </>
        }
    </Grid >
}
export default UserScreen;