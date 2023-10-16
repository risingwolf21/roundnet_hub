import { CircularProgress, Grid } from "@mui/material"
import React from "react"

export const Loading = () => {
    return <Grid
        container
        spacing={0}
        direction="column"
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: '100vh' }}>
        <CircularProgress />
    </Grid>
}