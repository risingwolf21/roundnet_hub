import { Button, Checkbox, Fab, FormControlLabel, Grid, TextField, Box, Container, Avatar, Snackbar, Alert } from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';
import { useClient } from "react-supabase";
import CustomAppBar from "./AppBar";
import { useSelector } from "react-redux";
import React, { FormEvent, useState } from "react";
import { RootState } from "../redux/store";
import { TABLE_USER } from "../constants";
import { AlertSnackbar } from "./AlertSnackbar";
import { User } from "src/types/supabaseTypes";
import { SupabaseClient } from "@supabase/supabase-js";
import CropImageDialog from "./CropImageDialog";
import { AccountBox, RestaurantMenu, Save } from "@mui/icons-material";
import { uuid } from "@supabase/gotrue-js/dist/module/lib/helpers";
import { dataURLtoFile, readFile } from "src/utils";
import { captureException } from "@sentry/react";
import { Database } from "src/types/supabase";

type UserScreenProps = {
    user: User,
    client: SupabaseClient<Database>
}

export const UserScreenProvider = () => {
    const { user } = useSelector((state: RootState) => state.application);
    const client = useClient();

    if (!user)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. User was null!", severity: "error" }} />

    return <UserScreen user={user} client={client} />
}

const UserScreen = ({ user, client }: UserScreenProps) => {

    const [selectedImage, setSelectedImage] = useState<string | ArrayBuffer | null>(null);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);
    const [cropImageDialogOpen, setCropImageDialogOpen] = useState(false);
    const [displayName, setDisplayName] = useState(user.displayName);
    const [errorSnackbar, setErrorSnackbar] = useState<{ open: boolean, message: string, severity?: "error" | "success" }>({ open: false, message: "", severity: "error" });


    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (croppedImage) {
            var fileName = uuid() + ".jpg";

            const { data: uploadData, error } = await client
                .storage
                .from('user')
                .upload(`${user.userId}/${fileName}`, dataURLtoFile(croppedImage, fileName), {
                    upsert: true
                });

            if (!error && uploadData && uploadData.path) {
                const { data } = client.storage.from('user').getPublicUrl(uploadData.path)

                const { error } = await client.from("user").update({ avatarUrl: data.publicUrl }).eq("userId", user.userId);
                if (error) {
                    client.storage.from('user').remove([uploadData.path])
                }

                let result = await updateDisplayName();

                if (result) {
                    setErrorSnackbar({ message: "Successfully updated your profile!", open: true, severity: "success" });
                }


            } else {
                setErrorSnackbar({ message: "Something went wrong uploading your image. Please try it again.", open: true });
                return;
            }
        } else {
            updateDisplayName();
        }
    };

    const updateDisplayName = async () => {
        const { error } = await client.from(TABLE_USER).update({ displayName }).eq("userId", user.userId);
        if (error) {
            setErrorSnackbar({ message: error.message, open: true });
            captureException(error);
            return false;
        }
        const { error: authError } = await client.auth.updateUser({
            data: { displayName }
        });
        if (authError) {
            setErrorSnackbar({ message: authError.message, open: true });
            captureException(authError);
            return false;
        }
        return true;
    }

    return <Grid
        width="100%">
        <CustomAppBar navigateBack={true} title="Profil" onLogout={() => client.auth.signOut()} />
        <Box sx={{ pl: 2, pr: 2 }}><Box component="form" onSubmit={handleSubmit} noValidate>
            <Container sx={{ display: "flex", justifyContent: "center", m: 2, p: 0, width: "auto" }}>
                <Button component="label" sx={{ border: "none", background: "transparent" }}>
                    <input accept="image/*" type="file" hidden onChange={async (event) => {
                        if (!event.target.files || event.target.files.length === 0)
                            return;

                        var filesize = ((event.target.files[0].size / 1024) / 1024);
                        if (filesize > 1) {
                            setErrorSnackbar({ message: `Your image exceeded the upload limit of 1 MB. [Image size: ${filesize.toFixed(4)} MB]`, open: true });
                            return;
                        }
                        let imageDataUrl = await readFile(event.target.files[0]);
                        setSelectedImage(imageDataUrl);
                        setCropImageDialogOpen(true);
                        event.target.files = null;
                        event.target.value = '';
                    }} />
                    <Avatar sx={{ borderRadius: 2, width: "100px", height: "100px" }}>
                        {
                            croppedImage
                                ? <img src={croppedImage} alt="logo" width={"100px"} height={"100px"} />
                                :
                                user.avatarUrl
                                    ? <img src={user.avatarUrl} alt="logo" width={"100px"} height={"100px"} />
                                    : <AccountBox sx={{ fontSize: "50px" }} />
                        }
                    </Avatar>
                </Button>
            </Container>
            <TextField
                fullWidth
                variant="filled"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                label="Name"
                margin="normal" />
            <TextField
                fullWidth
                disabled
                variant="filled"
                defaultValue={user.email}
                label="Email"
                margin="normal" />
            {
                user.role === "admin" && <FormControlLabel key={"adminRights"}
                    control={<Checkbox checked={user.role === "admin"} disabled />}
                    label="Adminrechte"
                />
            }
            {
                (user.displayName !== displayName || croppedImage) &&
                <Fab key={"saveButton"} variant="extended" sx={{ background: "#66bb6a", color: "#fff", position: "fixed", right: "16px", bottom: "72px" }} type="submit">
                    <Save sx={{ color: "white", mr: 1 }} />
                    Speichern
                </Fab>
            }
        </Box>
        </Box>
        {
            (selectedImage && typeof (selectedImage) === "string") && <CropImageDialog
                open={cropImageDialogOpen}
                handleClose={() => setCropImageDialogOpen(false)}
                selectedImage={selectedImage}
                onImageCropFinished={(img) => {
                    setCroppedImage(img);
                    setCropImageDialogOpen(false);
                }} />
        }
        <Snackbar sx={{ position: "fixed", right: "16px", }} open={errorSnackbar.open} autoHideDuration={5000} onClose={() => setErrorSnackbar({ message: "", open: false })}>
            <Alert severity={errorSnackbar.severity ?? "error"} sx={{ width: '100%' }}>
                {errorSnackbar.message}
            </Alert>
        </Snackbar>
    </Grid >
}
export default UserScreen;