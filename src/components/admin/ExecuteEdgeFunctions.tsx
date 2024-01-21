import { Dialog, DialogContent, Grid, List, ListItemButton, ListItemText } from "@mui/material"
import CustomAppBar from "../AppBar"
import React, { useState } from "react"
import { supabase, supabaseAdmin } from "../services/supabase/supabaseClient"
import { EdgeFunctions } from "src/types/supabaseTypes"

const ExecuteEdgeFunctions = () => {
    const [result, setResult] = useState<string | null>();

    const runEdgeFunction = async (name: EdgeFunctions) => {
        const { data, error } = await supabase.rpc(name);
        if (error)
            setResult(JSON.stringify(error))
        else if (data)
            setResult(JSON.stringify(data))
    }

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar navigateBack />
        <List>
            <ListItemButton onClick={() => runEdgeFunction("eventcreation")}>
                <ListItemText primary={"eventcreation"} />
            </ListItemButton>
        </List>
        <Dialog open={result !== null} onClose={() => setResult(null)}>
            <DialogContent>
                {result}
            </DialogContent>
        </Dialog>
    </Grid>
}

export default ExecuteEdgeFunctions;