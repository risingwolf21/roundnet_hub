import { Warning } from "@mui/icons-material"
import { Box, Grid, Typography } from "@mui/material"
import React from "react";
import CustomAppBar from "./AppBar";

const NotVerifiedScreen = () => {
    return <Box>
        <CustomAppBar />
        <Grid
            container
            spacing={0}
            direction="column"
            alignItems="center"
            justifyContent="center"
            style={{ position: "absolute", top: "56px", left: 0, right: 0, bottom: "56px" }}>
            <Warning fontSize="large" sx={{ color: "primary" }} />
            <Typography sx={{ mt: 2, wordWrap: "normal", textAlign: "center", color: "primary", padding: 2 }}>
                Du bist zur Zeit nicht verifiziert. Um die Funktionen nutzen zu können, musst du vorher von einem Administrator verifiziert werden.
            </Typography>
        </Grid>
    </Box>
}

export default NotVerifiedScreen;