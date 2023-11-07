import { Box, Grid, Typography } from "@mui/material"
import React from "react"
import CustomAppBar from "./AppBar"
import { Warning } from "@mui/icons-material"
import { TFunction } from "i18next"
import { withTranslation } from "react-i18next"

const FeatureNotAvailable = ({ t }: { t: TFunction }) => {
    return <Box>
        <CustomAppBar />
        <Grid
            container
            spacing={0}
            direction="column"
            alignItems="center"
            justifyContent="center"
            style={{ minHeight: '100vh' }}>
            <Warning fontSize="large" sx={{ color: "rgba(0,0,0,0.54)" }} />
            <Typography sx={{ mt: 2, wordWrap: "normal", textAlign: "center", color: "rgba(0,0,0,0.54)", padding: 2 }}>
                {t("feature_not_available")}
            </Typography>
        </Grid>
    </Box>
}

export default withTranslation()(FeatureNotAvailable)