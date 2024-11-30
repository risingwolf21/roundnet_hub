import {Typography} from "@mui/material"
import React from "react"
import {Warning} from "@mui/icons-material"
import {TFunction} from "i18next"
import {withTranslation} from "react-i18next"
import Layout from "./Layout";

const FeatureNotAvailable = ({t}: { t: TFunction }) => {
    return <Layout>
        <Warning fontSize="large" sx={{color: "rgba(0,0,0,0.54)"}}/>
        <Typography sx={{mt: 2, wordWrap: "normal", textAlign: "center", color: "rgba(0,0,0,0.54)", padding: 2}}>
            {t("feature_not_available")}
        </Typography>
    </Layout>
}

export default withTranslation()(FeatureNotAvailable)