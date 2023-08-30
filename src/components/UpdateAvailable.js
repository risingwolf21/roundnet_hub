import { Info, Refresh } from "@mui/icons-material"
import { Grid, Typography } from "@mui/material"

const UpdateAvailable = ({update}) => {
    return <Grid
        container
        spacing={0}
        direction="column"
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: '100vh' }}>
        <Info fontSize="large" sx={{ color: "primary" }} />
        <Typography sx={{ mt: 2, wordWrap: "normal", textAlign: "center", color: "primary", padding: 2 }}>Es ist ein Update für diese App vorhanden. Bitte aktualisiere die Seite</Typography>
        <Button variant="contained" startIcon={<Refresh />} onClick={update}></Button>
    </Grid>
}

export default UpdateAvailable;