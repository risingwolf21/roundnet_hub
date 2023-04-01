import { Box, Toolbar, Typography } from "@mui/material"

const BottomInformation = ({ totalPrice, title }) => {
    return <Toolbar sx={{ position: "fixed", width: "100%", bottom: 0, left: 0, right: 0, background: "#252525", padding: 0 }}>
        <Box sx={{ width: "100%", display: "flex", flexDirection: "row", justifyContent: "space-between", paddingLeft: 2, paddingRight: 2 }}>
            <Typography variant="h6" component="div" color={"white"}>
                {title}
            </Typography>
            <Typography variant="h6" component="div" color={"white"}>
                {totalPrice}
            </Typography>
        </Box>
    </Toolbar>
}

export default BottomInformation;