import { AccountCircle, GroupAdd } from "@mui/icons-material";
import { Divider, Fab, Grid, List, ListItem, ListItemAvatar, ListItemText, Typography } from "@mui/material";
import { toInteger } from "lodash";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, useParams } from "react-router-dom";
import { useClient } from "react-supabase";
import { useDependency } from "src/hooks/useDependency";
import { IAdminUsersRepository } from "src/repository/IAdminUsersRepository";
import { fetchAdminUsersAsync } from "../../redux/adminUserSlice";
import { RootState, useAppDispatch } from "../../redux/store";
import { GroupWithUsers, SimpleUser, User, UserWithGroups } from "../../types/supabaseTypes";
import { AlertSnackbar } from "../AlertSnackbar";
import CustomAppBar from "../AppBar";
import SearchAndSelectUserDialog from "../SearchAndSelectUserDialog";

const GroupInformationProvider = () => {
    const { id } = useParams();
    const groups = useSelector((state: RootState) => state.groups.groups);
    const { users, loading } = useSelector((state: RootState) => state.adminUsers);
    const [selectedGroup, setSelectedGroup] = useState<GroupWithUsers | undefined>(undefined);
    const adminUsersRepository = useDependency<IAdminUsersRepository>("IAdminUsersRepository");

    useEffect(() => {
        setSelectedGroup(groups?.find(x => x.id === toInteger(id)));
    }, [groups, id]);

    if (process.env.REACT_APP_training !== "enabled")
        return <Navigate to={"/feature-not-available"} />

    if (!selectedGroup || !adminUsersRepository)
        return <AlertSnackbar close={() => { }} alertInfo={{ message: "Fatal error occured. Repository or selected group was null!", severity: "error" }} />

    return <GroupInformation users={users} loading={loading} group={selectedGroup} repository={adminUsersRepository} />
}

type GroupInformationProps = {
    users: UserWithGroups[],
    loading: boolean,
    group: GroupWithUsers,
    repository: IAdminUsersRepository
}

const GroupInformation = ({ users, loading, group, repository }: GroupInformationProps) => {

    const dispatch = useAppDispatch();
    const client = useClient();
    const [searchAndSelectUsersOpen, setSearchAndSelectUsersOpen] = useState(false);

    useEffect(() => {
        dispatch(fetchAdminUsersAsync(repository));
    }, [client, dispatch, repository]);

    const handleUsersAdded = async (users: User[]) => {
        await repository.addUsersToGroup(group, users);
    }

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar title={group?.name ?? ""} navigateBack />
        <List sx={{ width: "100%" }}>
            <Typography pl={2} variant="h6" fontWeight="bold">Beschreibung</Typography>
            <Typography pl={2} pb={1}>{group?.description}</Typography>
            <Divider />
            <Typography pl={2} pt={1} variant="h6" fontWeight="bold">Mitglieder</Typography>
            {
                group && group.users && group.users.map((x: SimpleUser, index: number) => <ListItem key={index} divider>
                    <ListItemAvatar>
                        <AccountCircle />
                    </ListItemAvatar>
                    <ListItemText primary={x.displayName} secondary="Benutzername" />
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
            handleSubmit={handleUsersAdded}
            users={users.filter((x: UserWithGroups) => !group?.users?.some((y: SimpleUser) => y.userId === x.userId) ?? false)}
            loading={loading} />
    </Grid>

}

export default GroupInformationProvider;