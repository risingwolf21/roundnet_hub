import { Grid, LinearProgress, List, ListItem, ListItemAvatar, ListItemText } from "@mui/material"
import CustomAppBar from "../AppBar"
import { useSelector } from "react-redux";
import { FiberManualRecord } from "@mui/icons-material";
import React, { useEffect } from "react";
import { useClient } from "react-supabase";
import { fetchGroupsAsync } from "../../redux/groupsSlice";
import { useNavigate } from "react-router-dom";
import { RootState } from "../../redux/store";
import { useAppDispatch } from "../..";

const ManageGroupsScreen = () => {

    const { groups, loading } = useSelector((state: RootState) => state.groups);
    const client = useClient();
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

export default ManageGroupsScreen;