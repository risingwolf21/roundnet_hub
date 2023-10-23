import { Button, Checkbox, Fab, FormControlLabel, Grid, TextField, Box } from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';
import { useClient } from "react-supabase";
import CustomAppBar from "./AppBar";
import { useSelector } from "react-redux";
import React, { FormEvent } from "react";
import { RootState } from "../redux/store";

const UserScreen = () => {

    const { user } = useSelector((state: RootState) => state.application);
    const client = useClient();

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        var displayName = data.get('displayName');
        if (displayName !== user.displayName) {
            await client.from("users").update({ displayName }).eq("userId", user.userId)
            await client.auth.updateUser({
                data: { displayName }
            });
        }
    };

    return <Grid
        width="100%">
        <CustomAppBar navigateBack={true} />
        <Box sx={{ pl: 2, pr: 2 }}>
            {
                user && <>
                    <Box component="form" onSubmit={handleSubmit} noValidate>
                        <TextField
                            fullWidth
                            id="displayName"
                            name="displayName"
                            variant="filled"
                            defaultValue={user.displayName}
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
                            user.role === "admin" && <FormControlLabel key={"adminRights"}
                                control={<Checkbox checked={user.role === "admin"} disabled />}
                                label="Adminrechte"
                            />
                        }
                        <Fab key={"saveButton"} sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "72px" }} type="submit">
                            <CheckIcon sx={{ color: "white" }} />
                        </Fab>
                    </Box>
                    <Button fullWidth variant="contained" color="error" onClick={() => client.auth.signOut()}>
                        Logout
                    </Button>
                </>
            }
        </Box>
    </Grid >
}
export default UserScreen;