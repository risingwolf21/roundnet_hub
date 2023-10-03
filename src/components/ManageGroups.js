import { Grid, LinearProgress, List, ListItem, ListItemAvatar, ListItemText } from "@mui/material"
import CustomAppBar from "./AppBar"
import { useDispatch, useSelector } from "react-redux";
import { FiberManualRecord } from "@mui/icons-material";
import { useEffect } from "react";
import { useClient } from "react-supabase";
import { fetchGroupsAsync } from "../redux/groupsSlice";

const ManageGroupsScreen = () => {

    const { items: groups, loading, error } = useSelector((state) => state.groups);
    const client = useClient();
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(fetchGroupsAsync({ client }))
    }, []);

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
        <List sx={{width: "100%"}}>
            {
                groups && groups.map(x => <ListItem divider>
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