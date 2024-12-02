import {
    Avatar,
    Container,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListSubheader,
    Typography
} from "@mui/material";
import React, {useEffect, useState} from "react";
import {AddPhotoAlternateOutlined, FiberManualRecord} from "@mui/icons-material";
import {useParams} from "react-router-dom";
import {UserWithGroupsAndRoles} from "../types/supabaseTypes";
import {LoadingIndicator} from "./LoadingIndicator";
import {SupabaseUserRepository} from "../repository/UserRepository";
import Layout from "./Layout";
import {useAuth} from "../features/auth/AuthContext";

const UserScreen = () => {

    const {userId} = useParams();
    const user = useAuth();
    const [loading, setLoading] = useState<boolean>(false);
    const [currentUser, setCurrentUser] = useState<UserWithGroupsAndRoles | null>(null);
    const [overlappingGroups, setOverlappingGroups] = useState<Group[]>([]);

    useEffect(() => {
        if (userId) {
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

    return <Layout>
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
    </Layout>
}
export default UserScreen;