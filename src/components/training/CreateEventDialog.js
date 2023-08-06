import { AppBar, Box, Button, Dialog, IconButton, Toolbar, Typography } from "@mui/material"
import { SlideUpTransition } from "../../utils"
import { Close } from "@mui/icons-material";

const CreateEventDialog = ({ open, handleClose }) => {

    const handleSubmit = async (event) => {

    }

    return <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={SlideUpTransition}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <AppBar sx={{ position: "relative" }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleClose}
                        aria-label="close">
                        <Close />
                    </IconButton>
                    <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                        Getränk {drink?.id ? "bearbeiten" : "erstellen"}
                    </Typography>
                    <Button autoFocus color="inherit" type="submit">
                        Speichern
                    </Button>
                </Toolbar>
            </AppBar>
        </Box>
    </Dialog>
}

export default CreateEventDialog;