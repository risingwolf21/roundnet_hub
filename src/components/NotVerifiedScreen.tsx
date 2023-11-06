import { Warning } from "@mui/icons-material"
import { Button, Grid, Typography } from "@mui/material"
import React from "react";
import { useNavigate } from "react-router";
import CustomAppBar from "./AppBar";

const NotVerifiedScreen = () => {
    const navigate = useNavigate();
    return <Grid
        container
        spacing={0}
        direction="column"
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: '100vh' }}>
        <CustomAppBar />
        <Warning fontSize="large" sx={{ color: "primary" }} />
        <Typography sx={{ mt: 2, wordWrap: "normal", textAlign: "center", color: "primary", padding: 2 }}>
            Du bist zur Zeit nicht verifiziert. Bitte melde dich bei deinem Administrator.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/login", { replace: true })}>Zum Login</Button>
    </Grid>
}

export default NotVerifiedScreen;