import { Warning } from "@mui/icons-material"
import { Grid, Typography } from "@mui/material"

export const Error = ({ message }) => {
    return <Grid
        container
        spacing={0}
        direction="column"
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: '100vh' }}>
        <Warning fontSize="large" sx={{ color: "primary" }} />
        <Typography sx={{ mt: 2, wordWrap: "normal", textAlign: "center", color: "primary", padding: 2 }}>{message}</Typography>
    </Grid>
}