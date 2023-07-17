import React, { useEffect, useState } from "react";
import { AppBar, Avatar, Button, Dialog, IconButton, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Slide, TextField, Toolbar, Typography } from "@mui/material"
import CloseIcon from '@mui/icons-material/Close';
import { Box } from "@mui/system";
import Checkbox from '@mui/material/Checkbox';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import EuroIcon from '@mui/icons-material/Euro';
import InventoryIcon from '@mui/icons-material/Inventory';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import CropImageDialog from "../CropImageDialog";
import { useClient } from "react-supabase";
import { uuid } from "@supabase/gotrue-js/dist/module/lib/helpers";

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const EditDrinkDialog = ({ drink, onDrinkEditFinished, open, handleClose }) => {

    useEffect(() => {
        setActiveDrink(drink?.active ?? false);
    }, [drink]);

    // image cropping
    const client = useClient();
    const [selectedImage, setSelectedImage] = useState(null);
    const [croppedImage, setCroppedImage] = useState(null);

    const [cropImageDialogOpen, setCropImageDialogOpen] = useState(false);
    const [activeDrink, setActiveDrink] = useState();

    const handleSubmit = async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        if (data.get("name") && data.get("price") && data.get("stock")) {
            let newDrink = {
                id: drink.id,
                name: data.get("name"),
                price: Number.parseFloat(data.get("price")),
                imageUrl: "",
                active: activeDrink,
                stock: Number.parseFloat(data.get("stock"))
            };

            var fileName = uuid() + ".jpg";

            var fileToUpload = fetch(croppedImage).then(res => res.blob()).then(blob => new File([blob], fileName, { type: "image/jpeg", lastModified: new Date() }))

            const { data: uploadData, error } = await client
                .storage
                .from('drink')
                .upload(`avatars/${fileName}`, fileToUpload, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadData && uploadData.path) {
                const { error } = await client.from("drink").update({ imageUrl: uploadData.path }).eq("id", drink.id)
                console.log(error, uploadData.path)
            }

            setCroppedImage(null);
            setSelectedImage(null);
            onDrinkEditFinished(newDrink);
        }
    };

    return <Box>
        <Dialog
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
                                <InventoryIcon />
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="stock"
                                label="Anzahl"
                                name="stock"
                                type={"number"}
                                defaultValue={drink?.stock ? drink.stock : 0}
                            />
                        </ListItemText>
                    </ListItem>
                    <ListItem>
                        <ListItemAvatar>
                            <Avatar>
                                {
                                    croppedImage
                                        ? <img src={croppedImage} alt="logo" width={40} height={40} />
                                        : <LocalDrinkIcon />
                                }
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemSecondaryAction sx={{ ml: 5 }}>
                            <Button variant="contained" component="label">
                                Upload
                                <input accept="image/*" type="file" hidden onChange={async (event) => {
                                    if (!event.target.files || event.target.files.length === 0)
                                        return;
                                    let imageDataUrl = await readFile(event.target.files[0]);
                                    setSelectedImage(imageDataUrl);
                                    setCropImageDialogOpen(true);
                                }} />
                            </Button>
                        </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem onClick={() => setActiveDrink(!activeDrink)}>
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
        <CropImageDialog open={cropImageDialogOpen} handleClose={() => setCropImageDialogOpen(false)} selectedImage={selectedImage} onImageCropFinished={(img) => {
            setCroppedImage(img);
            setCropImageDialogOpen(false);
        }} />
    </Box>
}
export default EditDrinkDialog;

function readFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.addEventListener('load', () => resolve(reader.result), false)
        reader.readAsDataURL(file)
    })
}