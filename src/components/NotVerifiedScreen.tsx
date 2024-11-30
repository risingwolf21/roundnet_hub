import {Warning} from "@mui/icons-material"
import {Button, Typography} from "@mui/material"
import React from "react";
import Layout from "./Layout";

const NotVerifiedScreen = () => {
    return <Layout>
        <Warning fontSize="large" sx={{color: "primary"}}/>
        <Typography sx={{mt: 2, wordWrap: "normal", textAlign: "center", color: "primary", padding: 2}}>
            Du bist zur Zeit nicht verifiziert. Um die Funktionen nutzen zu können, musst du vorher von einem
            Administrator verifiziert werden.
        </Typography>
        <Button onClick={() => window.location.reload()}>Aktualisieren</Button>
    </Layout>
}

export default NotVerifiedScreen;