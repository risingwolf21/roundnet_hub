import { Grid, LinearProgress, List, ListItem, ListItemAvatar, ListItemText } from "@mui/material"
import CustomAppBar from "../AppBar"
import { useDispatch, useSelector } from "react-redux";
import { FiberManualRecord } from "@mui/icons-material";
import { useEffect } from "react";
import { useClient } from "react-supabase";
import { fetchGroupsAsync } from "../../redux/groupsSlice";
import SearchAndSelectUserDialog from "../SearchAndSelectUserDialog";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ManageGroupsScreen = () => {

    const { groups, loading, error } = useSelector((state) => state.groups);
    const client = useClient();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchUserOpen, setSearchUserOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState({});

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
        <SearchAndSelectUserDialog open={searchUserOpen} handleClose={() => setSearchUserOpen(false)} handleSubmit={() => { }} loading={loading} selectedGroup={selectedGroup} />
    </Grid>
}

export default ManageGroupsScreen;