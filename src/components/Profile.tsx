import {
    Avatar,
    Container,
    Grid,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListSubheader,
    Typography
} from "@mui/material";
import CustomAppBar from "./AppBar";
import React, {useEffect, useState} from "react";
import {AddPhotoAlternateOutlined, FiberManualRecord} from "@mui/icons-material";
import {useParams} from "react-router-dom";
import {UserWithGroups} from "../types/supabaseTypes";
import {LoadingIndicator} from "./LoadingIndicator";
import {useSelector} from "react-redux";
import {RootState} from "../redux/store";
import {SupabaseUserRepository} from "../repository/UserRepository";

const UserScreen = () => {

    const {userId} = useParams();
    const {user} = useSelector((state: RootState) => state.application);
    const [loading, setLoading] = useState<boolean>(false);
    const [currentUser, setCurrentUser] = useState<UserWithGroups | null>(null);
    const [overlappingGroups, setOverlappingGroups] = useState<Group[]>([]);

    useEffect(() => {
        if (userId && user) {
            setLoading(true);
            SupabaseUserRepository.fetchUserWithGroups(userId).then(result => {
                SupabaseUserRepository.fetchUserWithGroups(user.userId).then(userResult => {
                    setOverlappingGroups(result.data?.groups?.filter((x: Group) =>
                        userResult.data?.groups.some((y: Group) => y.id === x.id)) ?? [])
                    setCurrentUser(result.data);
                    setLoading(false);
                });
            });
        }
    }, [userId, user]);

    return <Grid
        width="100%">
        <CustomAppBar navigateBack={true}/>
        <LoadingIndicator loading={loading}/>
        <List sx={{pl: 2, pr: 2, pb: 8}}>
            <Container key={"avatar"} sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                m: 2,
                p: 0,
                width: "auto"
            }}>
                <Avatar sx={{borderRadius: 2, width: "150px", height: "150px"}}>
                    {
                        currentUser?.avatarUrl
                            ? <img src={currentUser?.avatarUrl} alt="logo" width={"150px"} height={"150px"}/>
                            : <AddPhotoAlternateOutlined sx={{fontSize: "50px"}}/>
                    }
                </Avatar>
                <Typography variant={"h5"} sx={{mt: 4}}>{currentUser?.displayName}</Typography>
            </Container>
            <List key={"groups"} subheader={<ListSubheader
                sx={{zIndex: "-1", fontWeight: "bold", lineHeight: "normal", my: 2, pl: 0}}>Gemeinsame
                Gruppen</ListSubheader>}>
                {
                    overlappingGroups.map((group, index) => <ListItem key={`${group.name} ${index}`}
                                                                      sx={{'&.MuiListItem-root': {p: 0}}}
                                                                      divider={index !== overlappingGroups.length - 1}>
                        <ListItemAvatar>
                            <FiberManualRecord sx={{color: group.color}}/>
                        </ListItemAvatar>
                        <ListItemText primary={group.name} secondary={group.description}/>
                    </ListItem>)
                }
            </List>
        </List>
    </Grid>
}
export default UserScreen;