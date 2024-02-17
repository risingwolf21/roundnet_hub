import {AccountCircle, GroupAdd, GroupRemove} from "@mui/icons-material";
import {Box, Divider, Fab, Grid, List, ListItem, ListItemAvatar, ListItemText, Typography} from "@mui/material";
import {toInteger} from "lodash";
import React, {useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {useParams} from "react-router-dom";
import {useDependency} from "src/hooks/useDependency";
import {IAdminUsersRepository} from "src/repository/IAdminUsersRepository";
import {fetchAdminUsersAsync} from "../../redux/adminUserSlice";
import {RootState, useAppDispatch} from "../../redux/store";
import {GroupWithUsers, SimpleUser, User, UserWithGroups} from "../../types/supabaseTypes";
import {AlertMessage, AlertSnackbar} from "../AlertSnackbar";
import CustomAppBar from "../AppBar";
import SearchAndSelectUserDialog from "../SearchAndSelectUserDialog";
import {fetchSingleGroupAsync, groupsSelector} from "src/redux/groupsSlice";

const GroupInformationProvider = () => {
    const {id} = useParams();
    const dispatch = useAppDispatch();
    const group = useSelector((state: RootState) => groupsSelector.selectById(state, toInteger(id)));

    const {users, loading} = useSelector((state: RootState) => state.adminUsers);
    const adminUsersRepository = useDependency<IAdminUsersRepository>("IAdminUsersRepository");

    useEffect(() => {
        if (adminUsersRepository)
            dispatch(fetchAdminUsersAsync(adminUsersRepository));
    }, [dispatch, adminUsersRepository]);

    if (!group || !adminUsersRepository)
        return <AlertSnackbar close={() => {
        }} alertInfo={{message: "Fatal error occured. Repository or selected group was null!", severity: "error"}}/>

    return <GroupInformation users={users} loading={loading} group={group} repository={adminUsersRepository}/>
}

type GroupInformationProps = {
    users: UserWithGroups[],
    loading: boolean,
    group: GroupWithUsers,
    repository: IAdminUsersRepository
}

const GroupInformation = ({users, loading, group, repository}: GroupInformationProps) => {

    const dispatch = useAppDispatch();
    const [searchAndSelectUsersOpen, setSearchAndSelectUsersOpen] = useState(false);
    const [deleteUsersOpen, setDeleteUsersOpen] = useState(false);
    const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

    const handleUsersRemove = async (users: User[]) => {
        await repository.removeUsersFromGroup(group, users).then(r => {
            if (r.error) {
                setAlertInfo({
                    message: `Failed to remove ${users.length} users from the group ${group.name} ${r.error.message}`,
                    severity: "error"
                });
            } else {
                setAlertInfo({
                    message: `Successfully removed ${users.length} users from the group ${group.name}`,
                    severity: "success"
                });
            }
            setDeleteUsersOpen(false);
            dispatch(fetchSingleGroupAsync({repository, id: group.id}));
        });
    }

    const handleUsersAdded = async (users: User[]) => {
        await repository.addUsersToGroup(group, users).then(r => {
            if (r.error) {
                setAlertInfo({
                    message: `Failed to add ${users.length} user to the group ${group.name} ${r.error.message}`,
                    severity: "error"
                });
            } else {
                setAlertInfo({
                    message: `Successfully added ${users.length} users to the group ${group.name}`,
                    severity: "success"
                });
            }
            setSearchAndSelectUsersOpen(false);
            dispatch(fetchSingleGroupAsync({repository, id: group.id}));
        });
    }

    return <Grid
        container
        width="100%"
        direction="column"
        alignItems="center"
        justifyContent="center">
        <CustomAppBar title={group?.name ?? ""} navigateBack/>
        <List sx={{width: "100%", pb: 10}}>
            <Typography pl={2} variant="h6" fontWeight="bold">Beschreibung</Typography>
            <Typography pl={2} pb={1}>{group?.description}</Typography>
            <Divider/>
            <Typography pl={2} pt={1} variant="h6" fontWeight="bold">Mitglieder</Typography>
            {
                group && group.users && group.users.map((x: SimpleUser, index: number) => <ListItem key={index} divider>
                    <ListItemAvatar>
                        <AccountCircle/>
                    </ListItemAvatar>
                    <ListItemText primary={x.displayName}/>
                </ListItem>)
            }
        </List>
        <Box sx={{position: "fixed", right: "16px", bottom: "76px", display: "flex", flexDirection: "row"}}>
            <Fab sx={{background: "#ba1a1a", mr: 2}}
                 onClick={() => setDeleteUsersOpen(true)}>
                {
                    <GroupRemove sx={{color: "white"}}/>
                }
            </Fab>
            <Fab sx={{background: "#66bb6a"}}
                 onClick={() => setSearchAndSelectUsersOpen(true)}>
                {
                    <GroupAdd sx={{color: "white"}}/>
                }
            </Fab>
        </Box>

        <SearchAndSelectUserDialog
            open={searchAndSelectUsersOpen}
            handleClose={() => setSearchAndSelectUsersOpen(false)}
            handleSubmit={handleUsersAdded}
            users={users.filter((x: UserWithGroups) => !group?.users?.some((y: SimpleUser) => y.userId === x.userId) ?? false)}
            loading={loading}/>

        <SearchAndSelectUserDialog
            open={deleteUsersOpen}
            handleClose={() => setDeleteUsersOpen(false)}
            handleSubmit={handleUsersRemove}
            users={group?.users ?? []}
            loading={loading}/>

        <AlertSnackbar alertInfo={alertInfo} close={() => setAlertInfo(null)} autoHideDuration={1500}/>
    </Grid>

}

export default GroupInformationProvider;