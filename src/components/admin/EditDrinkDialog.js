import React, { useEffect, useRef, useState } from "react";
import { AppBar, Avatar, Button, Dialog, IconButton, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Slide, TextField, Toolbar, Typography } from "@mui/material"
import CloseIcon from '@mui/icons-material/Close';
import { Box } from "@mui/system";
import Checkbox from '@mui/material/Checkbox';
import ReplayIcon from '@mui/icons-material/Replay';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import EuroIcon from '@mui/icons-material/Euro';
import FormatSizeIcon from '@mui/icons-material/FormatSize';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const EditDrinkDialog = ({ drink, onDrinkEditFinished, open, handleClose }) => {

    useEffect(() => {
        setLogoUrl(drink?.imageUrl ?? "");
        setActiveDrink(drink?.active ?? false);
    }, [drink]);

    const [logoUrl, setLogoUrl] = useState();
    const [activeDrink, setActiveDrink] = useState();
    const valueRef = useRef('');

    const handleSubmit = (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        if (data.get("name") && data.get("price")) {
            let newDrink = {
                id: drink.id,
                name: data.get("name"),
                price: data.get("price"),
                imageUrl: logoUrl ?? "",
                active: activeDrink,
            };
            onDrinkEditFinished(newDrink);
        }
    };

    return <Dialog
        fullScreen
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <AppBar sx={{ position: "relative" }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleClose}
                        aria-label="close">
                        <CloseIcon />
                    </IconButton>
                    <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                        Getränk {drink?.id ? "bearbeiten" : "erstellen"}
                    </Typography>
                    <Button autoFocus color="inherit" type="submit">
                        Speichern
                    </Button>
                </Toolbar>
            </AppBar>
            <List>
                <ListItem>
                    <ListItemAvatar>
                        <Avatar>
                            <FormatSizeIcon />
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="name"
                            label="Name"
                            name="name"
                            defaultValue={drink?.name ? drink.name : ""}
                        />
                    </ListItemText>
                </ListItem>
                <ListItem>
                    <ListItemAvatar>
                        <Avatar>
                            <EuroIcon />
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="price"
                            label="Preis"
                            name="price"
                            type={"number"}
                            defaultValue={drink?.price ? drink.price : 0}
                        />
                    </ListItemText>
                </ListItem>
                <ListItem>
                    <ListItemAvatar>
                        <Avatar>
                            {
                                drink.imageUrl
                                    ? <img src={drink.imageUrl} alt="logo" width={40} height={40} />
                                    : <LocalDrinkIcon />
                            }
                        </Avatar>
                    </ListItemAvatar>
                    <ListItemText>
                        <TextField
                            margin="normal"
                            required
                            sx={{ width: "95%" }}
                            id="logo"
                            label="Logo URL"
                            name="logo"
                            inputRef={valueRef}
                            defaultValue={drink?.imageUrl ? drink.imageUrl : ""}
                        />
                    </ListItemText>
                    <ListItemSecondaryAction sx={{ ml: 5 }}>
                        <IconButton onClick={() => setLogoUrl(valueRef.current.value)}>
                            <ReplayIcon />
                        </IconButton>
                    </ListItemSecondaryAction>
                </ListItem>
                <ListItem onClick={() => setActiveDrink(!activeDrink)} focusRipple>
                    <ListItemAvatar>
                        <Checkbox checked={activeDrink} />
                    </ListItemAvatar>
                    <ListItemText>
                        <Typography>Aktiv</Typography>
                    </ListItemText>
                </ListItem>
            </List>
        </Box>
    </Dialog>
}
export default EditDrinkDialog;