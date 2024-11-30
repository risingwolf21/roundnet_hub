import {AddOutlined, EditOffOutlined, EditOutlined, FiberManualRecord} from "@mui/icons-material";
import {
    Box,
    Fab,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText
} from "@mui/material";
import {SupabaseClient} from "@supabase/supabase-js";
import React, {useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {useNavigate} from "react-router-dom";
import {useClient} from "react-supabase";
import {GroupWithUsers} from "src/types/supabaseTypes";
import {fetchGroupsAsync, groupsSelector} from "./slices/groupsSlice";
import {RootState, useAppDispatch} from "../../redux/store";
import EditIcon from "@mui/icons-material/Edit";
import {EditOrAddGroupDialog} from "./dialogs/EditOrAddGroupDialog";
import {can} from "../../utils/PermissionService";
import Layout from "../../components/Layout";

const ManageGroupsProvider = () => {

    const groups = useSelector((state: RootState) => groupsSelector.selectAll(state));
    const {loading} = useSelector((state: RootState) => state.groups);
    const client = useClient();

    return <ManageGroupsScreen
        groups={groups}
        loading={loading}
        client={client}/>
}

type ManageGroupsScreenProps = {
    groups: GroupWithUsers[],
    loading: boolean,
    client: SupabaseClient
}

export const EMPTY_GROUP = {name: "", color: "#000000", id: 0, description: "", created_at: ""};

const ManageGroupsScreen = ({groups, loading, client}: ManageGroupsScreenProps) => {

    const {user} = useSelector((state: RootState) => state.application);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [isEditingMode, setEditingMode] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState<Group>(EMPTY_GROUP);
    const [addOrUpdateGroupOpen, setAddOrUpdateGroupOpen] = useState(false);

    useEffect(() => {
        dispatch(fetchGroupsAsync({client}))
    }, [client, dispatch]);

    return <Layout>
        {
            loading && <LinearProgress sx={{position: "fixed", top: 56, left: 0, right: 0}}/>
        }
        <List sx={{width: "100%"}}>
            {
                groups && groups
                    .filter(x => user && x.users.some(x => x.userId === user.userId))
                    .map(x => <ListItem key={x.id} divider onClick={() => navigate("/trainer/groups/" + x.id)}>
                        <ListItemAvatar>
                            <FiberManualRecord sx={{color: x.color}}/>
                        </ListItemAvatar>
                        <ListItemText primary={x.name}/>
                        {
                            isEditingMode && <ListItemSecondaryAction>
                                <IconButton onClick={() => {
                                    setGroupToEdit(x);
                                    setAddOrUpdateGroupOpen(true);
                                }}>
                                    <EditIcon/>
                                </IconButton>
                            </ListItemSecondaryAction>
                        }
                    </ListItem>)
            }
        </List>
        {
            can("edit", "groups") &&
            <Box sx={{position: "fixed", right: "16px", bottom: "76px", display: "flex", flexDirection: "row"}}>
                <Fab sx={{background: "#66bb6a", mr: 2}}
                     onClick={() => {
                         setGroupToEdit(EMPTY_GROUP);
                         setAddOrUpdateGroupOpen(true);
                     }}>
                    <AddOutlined sx={{color: "#fff"}}/>
                </Fab>
                <Fab sx={{background: "#66bb6a"}}
                     onClick={() => setEditingMode(!isEditingMode)}>
                    {
                        isEditingMode
                            ? <EditOffOutlined sx={{color: "#fff"}}/>
                            : <EditOutlined sx={{color: "#fff"}}/>
                    }
                </Fab>
            </Box>
        }
        <EditOrAddGroupDialog open={addOrUpdateGroupOpen} handleClose={() => {
            setAddOrUpdateGroupOpen(false);
            setEditingMode(false);
        }} groupToEdit={groupToEdit}/>
    </Layout>
}

export default ManageGroupsProvider;