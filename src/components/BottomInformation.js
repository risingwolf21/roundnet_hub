import { Box, Toolbar, Typography } from "@mui/material"

const BottomInformation = ({totalPrice}) => {
    return <Toolbar sx={{ position: "fixed", width: "100%", bottom: 0, left: 0, right: 0, background: "#252525", padding: 0 }}>
        <Box sx={{ width: "100%", display: "flex", flexDirection: "row", justifyContent: "space-between", paddingLeft: "24px", paddingRight: "24px" }}>
            <Typography variant="h6" component="div" color={"white"}>
                Gesamtpreis
            </Typography>
            <Typography variant="h6" component="div" color={"white"}>
                {totalPrice ?? 0} €
            </Typography>
        </Box>
    </Toolbar>
}

export default BottomInformation;