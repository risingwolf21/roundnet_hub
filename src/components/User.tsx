import {
    Alert,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Container,
    Fab,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    ListSubheader,
    Snackbar,
    Switch,
    TextField,
} from '@mui/material';
import {useClient} from 'react-supabase';
import {useSelector} from 'react-redux';
import React, {useEffect, useState} from 'react';
import {AppDispatch, RootState, useAppDispatch} from '../redux/store';
import {SupabaseClient} from '@supabase/supabase-js';
import {
    AddPhotoAlternateOutlined,
    DeleteOutline,
    EditOutlined,
    EmailOutlined,
    FiberManualRecord,
    Launch,
    Logout,
    NotificationsRounded,
    PasswordOutlined,
    PersonOutlineOutlined,
    Save,
} from '@mui/icons-material';
import {dataURLtoFile, readFile} from 'src/utils';
import {captureException} from '@sentry/react';
import Compressor from 'compressorjs';
import {addNotificationPermissionAsync, removeNotificationPermissionAsync} from 'src/redux/applicationSlice';
import {uuid} from '@supabase/supabase-js/dist/main/lib/helpers';
import {SupabaseEventRepository} from '../repository/EventRepository';
import {requestNotificationPermission} from '../hooks/useFirebase';
import {messaging} from '../firebase/firebaseConfig';
import {Database} from '../types/supabase-generated.types';
import {useNavigate} from 'react-router-dom';
import Layout from './Layout';
import {useAuth} from '../features/auth/AuthContext';
import {UserWithRolesAndPermissions} from "../types/supabaseTypes";
import CropImageDialog from "./CropImageDialog";
import pzLogo from "../images/pz_logo.svg";

type UserScreenProps = {
    user: UserWithRolesAndPermissions;
    groups: Group[];
    client: SupabaseClient<Database>;
    dispatch: AppDispatch;
};

export const UserScreenProvider = () => {
    const user = useAuth();
    const client = useClient();
    const dispatch = useAppDispatch();
    const [groups, setGroups] = useState<Group[]>([]);

    useEffect(() => {
        SupabaseEventRepository.fetchUserGroups(user).then((result) => {
            setGroups(result.data?.map((x) => x.group) ?? []);
        });
    }, [user]);

    return <UserScreen user={user} client={client} dispatch={dispatch} groups={groups}/>;
};

const NotificationSwitch = ({
                                title,
                                tag,
                                loading,
                                user,
                                dispatch,
                            }: {
    title: string;
    tag: NotificationTags;
    loading: boolean;
    user: User;
    dispatch: AppDispatch;
}) => {
    return (
        <ListItem
            secondaryAction={
                loading ? (
                    <CircularProgress/>
                ) : (
                    <Switch
                        checked={user.notifications?.includes(tag) ?? false}
                        onChange={(event) => {
                            event.stopPropagation();
                            if (!event.target.checked) {
                                dispatch(
                                    removeNotificationPermissionAsync({
                                        user,
                                        notificationToRemove: tag,
                                    })
                                );
                            } else {
                                dispatch(
                                    addNotificationPermissionAsync({
                                        user,
                                        notificationToAdd: tag,
                                    })
                                );
                            }
                        }}
                    />
                )
            }
        >
            <ListItemText primary={title}/>
        </ListItem>
    );
};

const UserScreen = ({user, client, dispatch, groups}: UserScreenProps) => {
    const navigate = useNavigate();
    const [selectedImage, setSelectedImage] = useState<string | ArrayBuffer | null>(null);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);
    const [cropImageDialogOpen, setCropImageDialogOpen] = useState(false);
    const [errorSnackbar, setErrorSnackbar] = useState<{
        open: boolean;
        message: string;
        severity?: 'error' | 'success';
    }>({open: false, message: '', severity: 'error'});
    const [currentUser, setCurrentUser] = useState(user);
    const [firstName, setFirstName] = useState(user.displayName.split(' ')[0]);
    const [surName, setSueName] = useState(user.displayName.split(' ')[1] ?? '');
    const [loadingSave, setLoadingSave] = useState(false);
    const {updatingNotificationTags} = useSelector((state: RootState) => state.application);

    const isNotificationSupported = () =>
        'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

    const handleSubmit = async () => {
        setLoadingSave(true);
        if (croppedImage) {
            let fileName = uuid() + '.jpg';
            new Compressor(dataURLtoFile(croppedImage, fileName), {
                convertSize: 1000000, // 1 MB
                success: async (file) => {
                    let compressedFile = await readFile(file);
                    if (compressedFile && typeof compressedFile === 'string') {
                        await removeOldAvatarImages();
                        await uploadAvatarImage(fileName, compressedFile);
                        setCroppedImage(null);
                    } else {
                        setErrorSnackbar({
                            message: 'Something went wrong compressing your image. Please try again.',
                            open: true,
                        });
                    }
                },
            });
        } else {
            await updateDisplayName(currentUser.avatarUrl);
        }
        setLoadingSave(false);
    };

    const removeOldAvatarImages = async () => {
        const {data: list, error} = await client.storage.from('user').list(`${user.userId}`);
        if (error || !list) {
            captureException(error);
            return;
        }
        const filesToRemove = list.map((x) => `${user.userId}/${x.name}`);

        await client.storage.from('user').remove(filesToRemove);
    };

    const uploadAvatarImage = async (fileName: string, compressedImage: string) => {
        const {data: uploadData, error} = await client.storage
            .from('user')
            .upload(`${user.userId}/${fileName}`, dataURLtoFile(compressedImage, fileName), {
                upsert: true,
            });

        if (!error && uploadData && uploadData.path) {
            const {data} = client.storage.from('user').getPublicUrl(uploadData.path);

            const {error} = await client.from('user').update({avatarUrl: data.publicUrl}).eq('userId', user.userId);
            if (error) {
                client.storage.from('user').remove([uploadData.path]);
            }
            setCurrentUser({...currentUser, avatarUrl: data.publicUrl});
            setCroppedImage(null);

            await updateDisplayName(data.publicUrl);
        } else {
            setErrorSnackbar({message: 'Something went wrong uploading your image. Please try it again.', open: true});
            return;
        }
    };

    const updateDisplayName = async (avatarUrl: string | null) => {
        let displayName = [firstName.trim(), surName.trim()].filter((x) => x !== '').join(' ');
        const {error} = await client.from('user').update({displayName, avatarUrl}).eq('userId', user.userId);
        if (error) {
            setErrorSnackbar({message: error.message, open: true});
            captureException(error);
            return;
        }
        const {error: authError} = await client.auth.updateUser({
            data: {displayName},
        });
        if (authError) {
            setErrorSnackbar({message: authError.message, open: true});
            captureException(authError);
            return;
        }
        setErrorSnackbar({message: 'Successfully updated your profile!', open: true, severity: 'success'});
    };

    const onImageInputChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        if (!event.target.files || event.target.files.length === 0) return;

        let imageDataUrl = await readFile(event.target.files[0]);
        setSelectedImage(imageDataUrl);
        setCropImageDialogOpen(true);
        event.target.files = null;
        event.target.value = '';
    };

    return (
        <Layout appBarConfig={{title: 'Profil', showBackButton: true, showProfile: false}}>
            <List sx={{pl: 2, pr: 2, pb: 10}}>
                <Container
                    key={'avatar'}
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        m: 2,
                        p: 0,
                        width: 'auto',
                    }}
                >
                    <Button component="label" sx={{border: 'none', background: 'transparent'}}>
                        <input accept="image/*" type="file" hidden onChange={onImageInputChange}/>
                        <Avatar sx={{borderRadius: 2, width: '150px', height: '150px'}}>
                            {croppedImage ? (
                                <img src={croppedImage} alt="logo" width={'150px'} height={'150px'}/>
                            ) : currentUser.avatarUrl ? (
                                <img src={currentUser.avatarUrl} alt="logo" width={'150px'} height={'150px'}/>
                            ) : (
                                <AddPhotoAlternateOutlined sx={{fontSize: '50px'}}/>
                            )}
                        </Avatar>
                    </Button>
                    <Box sx={{display: 'flex', justifyContent: 'center', mt: 1}}>
                        {currentUser.avatarUrl ? (
                            <>
                                <Button
                                    component="label"
                                    sx={{border: 'none', background: 'transparent', mr: 2}}
                                    startIcon={<EditOutlined/>}
                                >
                                    <input accept="image/*" type="file" hidden onChange={onImageInputChange}/>
                                    Change
                                </Button>
                                <Button
                                    startIcon={<DeleteOutline/>}
                                    onClick={() => setCurrentUser({...currentUser, avatarUrl: null})}
                                >
                                    Remove
                                </Button>
                            </>
                        ) : (
                            <Button
                                component="label"
                                sx={{border: 'none', background: 'transparent'}}
                                startIcon={<AddPhotoAlternateOutlined/>}
                            >
                                <input accept="image/*" type="file" hidden onChange={onImageInputChange}/>
                                Add picture
                            </Button>
                        )}
                    </Box>
                    <Box sx={{display: 'flex', justifyContent: 'center', mt: 1}}>
                        <Button startIcon={<PasswordOutlined/>} onClick={() => navigate('/reset-password')}>
                            Passwort ändern
                        </Button>
                        <Button startIcon={<Logout/>} onClick={() => client.auth.signOut()}>
                            Logout
                        </Button>
                    </Box>
                </Container>
                <ListItem key={'firstName'} sx={{'&.MuiListItem-root': {p: 0}}}>
                    <ListItemAvatar>
                        <PersonOutlineOutlined sx={{color: 'rgba(0,0,0,0.54)'}}/>
                    </ListItemAvatar>
                    <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        label="Vorname"
                        margin="normal"
                    />
                </ListItem>
                <ListItem key={'surName'} sx={{'&.MuiListItem-root': {p: 0}}}>
                    <ListItemAvatar/>
                    <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        value={surName}
                        onChange={(e) => setSueName(e.target.value)}
                        label="Nachname"
                        margin="normal"
                    />
                </ListItem>
                <ListItem key={'email'} sx={{'&.MuiListItem-root': {p: 0}}}>
                    <ListItemAvatar>
                        <EmailOutlined sx={{color: 'rgba(0,0,0,0.54)'}}/>
                    </ListItemAvatar>
                    <ListItemText primary={user.email} secondary={"Email"}/>
                </ListItem>
                {user.player_data?.rg_id && user.player_data?.rg_link &&
                    <ListItem key={'rg_id'} disableGutters sx={{
                        '&.MuiListItem-root': {p: 0},
                    }} secondaryAction={<IconButton onClick={() => window.open(
                        user.player_data?.rg_link ?? undefined,
                        '_blank',
                        'noopener,noreferrer'
                    )}><Launch/></IconButton>}>
                        <ListItemAvatar>
                            <img src={pzLogo} alt={"pz logo"} width="25" height="25"/>
                        </ListItemAvatar>
                        <ListItemText primary={user.player_data.rg_id} secondary={"Roundnet Germany ID"}/>
                    </ListItem>}
                <List
                    key={'groups'}
                    subheader={
                        <ListSubheader sx={{zIndex: '-1', fontWeight: 'bold', lineHeight: 'normal', my: 2, pl: 0}}>
                            Gruppen
                        </ListSubheader>
                    }
                >
                    {groups.map((group, index) => (
                        <ListItem
                            key={`${group.name} ${index}`}
                            sx={{'&.MuiListItem-root': {p: 0}}}
                            divider={index !== groups.length - 1}
                        >
                            <ListItemAvatar>
                                <FiberManualRecord sx={{color: group.color}}/>
                            </ListItemAvatar>
                            <ListItemText primary={group.name} secondary={group.description}/>
                        </ListItem>
                    ))}
                </List>
                <List
                    key={'notifications'}
                    subheader={
                        <ListSubheader
                            sx={{
                                zIndex: '-1',
                                fontWeight: 'bold',
                                lineHeight: 'normal',
                                my: 2,
                                pl: 0,
                            }}
                        >
                            Benachrichtigungen
                        </ListSubheader>
                    }
                >
                    {isNotificationSupported() && Notification.permission === 'granted' && (
                        <>
                            <NotificationSwitch
                                title={'Event Kommentare'}
                                tag={'eventComments'}
                                loading={updatingNotificationTags}
                                user={user}
                                dispatch={dispatch}
                            />

                            <NotificationSwitch
                                title={'Event abgesagt'}
                                tag={'eventCancelled'}
                                loading={updatingNotificationTags}
                                user={user}
                                dispatch={dispatch}
                            />

                            <NotificationSwitch
                                title={'Event aktualisiert'}
                                tag={'eventUpdated'}
                                loading={updatingNotificationTags}
                                user={user}
                                dispatch={dispatch}
                            />

                            <NotificationSwitch
                                title={'Event Anwesenheit aktualisiert'}
                                tag={'eventAttedanceChanged'}
                                loading={updatingNotificationTags}
                                user={user}
                                dispatch={dispatch}
                            />
                        </>
                    )}
                    {isNotificationSupported() && Notification.permission !== 'granted' && (
                        <ListItemButton
                            sx={{p: 0}}
                            onClick={() => {
                                messaging.then((result) => {
                                    if (result) requestNotificationPermission(user, result).then();
                                    else
                                        setErrorSnackbar({
                                            open: true,
                                            message: 'Notifications are not supported in this browser',
                                            severity: 'error',
                                        });
                                });
                            }}
                        >
                            <ListItemAvatar>
                                <NotificationsRounded/>
                            </ListItemAvatar>
                            <ListItemText primary={'Benachrichtigungen aktivieren'}/>
                        </ListItemButton>
                    )}
                </List>
                {(user.displayName !== [firstName.trim(), surName.trim()].filter((x) => x !== '').join(' ') ||
                    croppedImage ||
                    (user.avatarUrl !== null && currentUser.avatarUrl === null)) && (
                    <Fab
                        key={'saveButton'}
                        variant="extended"
                        sx={{
                            background: '#66bb6a',
                            color: '#fff',
                            position: 'fixed',
                            right: '16px',
                            bottom: 'calc(72px + env(safe-area-inset-bottom))',
                        }}
                        onClick={handleSubmit}
                    >
                        {loadingSave ? (
                            <CircularProgress size={'20px'} sx={{color: 'white', mr: 1}}/>
                        ) : (
                            <Save sx={{color: 'white', mr: 1}}/>
                        )}
                        Speichern
                    </Fab>
                )}
            </List>

            {selectedImage && typeof selectedImage === 'string' && (
                <CropImageDialog
                    open={cropImageDialogOpen}
                    handleClose={() => setCropImageDialogOpen(false)}
                    selectedImage={selectedImage}
                    onImageCropFinished={(img) => {
                        setCroppedImage(img);
                        setCropImageDialogOpen(false);
                    }}
                />
            )}

            <Snackbar
                sx={{position: 'fixed', right: '16px', bottom: 'calc(76px + env(safe-area-inset-bottom))'}}
                open={errorSnackbar.open}
                autoHideDuration={5000}
                onClose={() => setErrorSnackbar({message: '', open: false})}
            >
                <Alert severity={errorSnackbar.severity ?? 'error'} sx={{width: '100%'}}>
                    {errorSnackbar.message}
                </Alert>
            </Snackbar>
        </Layout>
    );
};
export default UserScreen;
