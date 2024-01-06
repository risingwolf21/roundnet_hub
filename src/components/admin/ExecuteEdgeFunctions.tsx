import { Grid, List, ListItemButton, ListItemText } from "@mui/material"
import CustomAppBar from "../AppBar"
import React from "react"
import { supabaseAdmin } from "../services/supabase/supabaseClient"

const ExecuteEdgeFunctions = () => {
    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar navigateBack />
        <List>
            <ListItemButton onClick={() => supabaseAdmin.functions.invoke("event-creation")}>
                <ListItemText primary={"eventCreation"} />
            </ListItemButton>
        </List>
    </Grid>
}

export default ExecuteEdgeFunctions;