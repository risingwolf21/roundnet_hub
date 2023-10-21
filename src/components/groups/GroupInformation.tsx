import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useClient } from "react-supabase";
import { Divider, Fab, Grid, List, ListItem, ListItemAvatar, ListItemText, Typography } from "@mui/material";
import CustomAppBar from "../AppBar";
import { toInteger } from "lodash";
import { AccountCircle, GroupAdd } from "@mui/icons-material";
import SearchAndSelectUserDialog from "../SearchAndSelectUserDialog";
import { fetchAdminUsersAsync } from "../../redux/adminUserSlice";
import { RootState } from "../../redux/store";
import { useAppDispatch } from "../..";
import { GroupWithUsers, SimpleUser, UserWithGroups } from "../../types/supabaseTypes";

export const GroupInformation = () => {

    const dispatch = useAppDispatch();
    const client = useClient();
    const { id } = useParams();
    const [selectedGroup, setSelectedGroup] = useState<GroupWithUsers | undefined>(undefined);
    const [searchAndSelectUsersOpen, setSearchAndSelectUsersOpen] = useState(false);

    const groups = useSelector((state: RootState) => state.groups.groups);
    const { users, loading } = useSelector((state: RootState) => state.adminUsers);

    useEffect(() => {
        dispatch(fetchAdminUsersAsync({ client }));
    }, [client, dispatch]);

    useEffect(() => {
        setSelectedGroup(groups?.find(x => x.id === toInteger(id)));
    }, [groups, id]);

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar title={selectedGroup?.name ?? ""} navigateBack />
        <List sx={{ width: "100%" }}>
            <Typography pl={2} variant="h6" fontWeight="bold">Beschreibung</Typography>
            <Typography pl={2} pb={1}>{selectedGroup?.description}</Typography>
            <Divider />
            <Typography pl={2} pt={1} variant="h6" fontWeight="bold">Mitglieder</Typography>
            {
                selectedGroup && selectedGroup.users && selectedGroup.users.map((x, index) => <ListItem key={index} divider>
                    <ListItemAvatar>
                        <AccountCircle />
                    </ListItemAvatar>
                    <ListItemText primary={x.displayName} />
                </ListItem>)
            }
        </List>
        <Fab sx={{ background: "#66bb6a", position: "fixed", right: "16px", bottom: "76px" }}
            onClick={() => setSearchAndSelectUsersOpen(true)}>
            {
                <GroupAdd sx={{ color: "white" }} />
            }
        </Fab>
        <SearchAndSelectUserDialog
            open={searchAndSelectUsersOpen}
            handleClose={() => setSearchAndSelectUsersOpen(false)}
            users={users.filter((x: UserWithGroups) => !selectedGroup?.users?.some((y: SimpleUser) => y.userId === x.userId) ?? false)}
            loading={loading} />
    </Grid>

}