import { Warning } from "@mui/icons-material"
import { Box, Button, Grid, Typography } from "@mui/material"
import React from "react";
import { useNavigate } from "react-router";
import CustomAppBar from "./AppBar";

const NotVerifiedScreen = () => {
    const navigate = useNavigate();
    return <Box>
        <CustomAppBar />
        <Grid
            container
            spacing={0}
            direction="column"
            alignItems="center"
            justifyContent="center"
            style={{ minHeight: '100vh' }}>
            <Warning fontSize="large" sx={{ color: "primary" }} />
            <Typography sx={{ mt: 2, wordWrap: "normal", textAlign: "center", color: "primary", padding: 2 }}>
                Du bist zur Zeit nicht verifiziert. Um die Funktionen nutzen zu können, musst du vorher von einem Administrator verifiziert werden.
            </Typography>
        </Grid>
    </Box>
}

export default NotVerifiedScreen;