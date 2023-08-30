import { Info, Refresh } from "@mui/icons-material"
import { Grid, Typography, AppBar, Toolbar, Button } from "@mui/material"

const UpdateAvailable = ({ update }) => {
    return <Grid>
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: "primary" }}>
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Roundnet Karlsruhe
                </Typography>
            </Toolbar>
        </AppBar>
        <Grid
            container
            spacing={0}
            direction="column"
            alignItems="center"
            justifyContent="center"
            style={{ minHeight: '100vh' }}>
            <Info fontSize="large" sx={{ color: "primary" }} />
            <Typography sx={{ mt: 2, wordWrap: "normal", textAlign: "center", color: "primary", padding: 2 }}>Es ist ein Update für diese App vorhanden. Bitte aktualisiere die Seite</Typography>
            <Button variant="contained" startIcon={<Refresh />} onClick={update}>Update</Button>
        </Grid>
    </Grid>
}

export default UpdateAvailable;