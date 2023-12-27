import { FiberManualRecord } from "@mui/icons-material";
import { Grid, LinearProgress, List, ListItem, ListItemAvatar, ListItemText } from "@mui/material";
import { SupabaseClient } from "@supabase/supabase-js";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { useClient } from "react-supabase";
import { GroupWithUsers } from "src/types/supabaseTypes";
import { fetchGroupsAsync } from "../../redux/groupsSlice";
import { RootState, useAppDispatch } from "../../redux/store";
import CustomAppBar from "../AppBar";

const ManageGroupsProvider = () => {

    const { groups, loading } = useSelector((state: RootState) => state.groups);
    const client = useClient();

    if (process.env.REACT_APP_training !== "enabled")
        return <Navigate to={"/feature-not-available"} />

    return <ManageGroupsScreen
        groups={groups}
        loading={loading}
        client={client} />
}

type ManageGroupsScreenProps = {
    groups: GroupWithUsers[],
    loading: boolean,
    client: SupabaseClient
}

const ManageGroupsScreen = ({ groups, loading, client }: ManageGroupsScreenProps) => {


    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(fetchGroupsAsync({ client }))
    }, [client, dispatch]);

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar navigateBack />
        {
            loading && <LinearProgress sx={{ position: "fixed", top: 56, left: 0, right: 0 }} />
        }
        <List sx={{ width: "100%" }}>
            {
                groups && groups.map(x => <ListItem divider onClick={() => navigate("/trainer/groups/" + x.id)}>
                    <ListItemAvatar>
                        <FiberManualRecord sx={{ color: x.color }} />
                    </ListItemAvatar>
                    <ListItemText primary={x.name} />
                </ListItem>)
            }
        </List>
    </Grid>
}

export default ManageGroupsProvider;