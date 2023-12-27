import { Box } from "@mui/material"
import React from "react"
import CustomAppBar from "./AppBar"
import { LoadingIndicator } from "./LoadingIndicator"

export const LoadingScreen = () => {
    return <Box>
        <CustomAppBar />
        <LoadingIndicator loading={true} />
    </Box>
}