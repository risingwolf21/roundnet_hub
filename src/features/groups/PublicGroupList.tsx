import { Add, Groups } from "@mui/icons-material";
import { Avatar, Button, Chip, Fab, ListItem, ListItemAvatar, ListItemText, Stack, Typography } from "@mui/material";
import { useDialogs } from "@toolpad/core";
import { useNotifications } from "@toolpad/core/useNotifications";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import Layout from "src/components/Layout";
import { RootState, useAppDispatch } from "src/redux/store";
import { GroupsRepository } from "src/repository/GroupsRepository";
import { useApplication } from "../auth/AuthContext";
import { CreateGroupDialog } from "./dialogs/CreateGroupDialog";
import { LoadingGroupListItem } from "./LoadingGroupListItem";
import { fetchGroupsAsync, groupsSelector, onEventMappingUserAdded } from "./slices/groupsSlice";
import { GroupWithUserMappings } from "src/types/supabaseTypes";

const PublicGroupList = () => {
  const groups = useSelector((state: RootState) => groupsSelector.selectAll(state));
  const { loading } = useSelector((state: RootState) => state.groups);

  const { user } = useApplication();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const dialogs = useDialogs();

  useEffect(() => {
    dispatch(fetchGroupsAsync());
  }, [dispatch]);

  const joinGroup = (group: GroupWithUserMappings) => {
    if (user)
      GroupsRepository.addUserToGroup(group.id, user?.userId, group.need_request_to_join ? "joinRequested" : "user")
        .then(result => {
          if (result.data) {
            dispatch(onEventMappingUserAdded({ user, result: result.data }));
            notifications.show("Erfolgreich der Gruppe beigetreten.");
          }
        })
        .catch(error => notifications.show("Der Gruppe konnte nicht beigetreten werden", { severity: "error" }))
  }

  return <Layout>
    {
      loading
        ? Array.from({ length: 10 }, (v, k) => k + 1).map((x) => <LoadingGroupListItem key={x} />)
        : groups.map(x => <ListItem
          key={x.id}
          divider
          onClick={() => {
            if (x.user_group_role && x.user_group_role !== "joinRequested")
              navigate('/groups/' + x.id)
          }}
          secondaryAction={
            !x.user_group_role && (
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  joinGroup(x)
                }}
              >
                {x.need_request_to_join ? "Beitritt anfragen" : "Beitreten"}
              </Button>
            )
          }
        >
          <ListItemAvatar>
            <Avatar sx={{ backgroundColor: x.color, borderRadius: 2 }}>
              <Groups />
            </Avatar>
          </ListItemAvatar>
          <Stack direction={"row"} spacing={2} sx={{ display: "flex", alignItems: "center" }}>
            <ListItemText primary={x.name} secondary={x.description} />
            {
              x.user_group_role === "admin" && <Chip variant='outlined' size="small" label="Admin" color='info' />
            }
            {
              x.user_group_role === "joinRequested" && <Chip variant='outlined' size="small" label="Angefragt" color='warning' />
            }
          </Stack>
        </ListItem>)
    }
    <Fab
      sx={{
        background: '#66bb6a',
        position: 'fixed',
        right: '16px',
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
      }}
      onClick={async () => {
        const result = await dialogs.open(CreateGroupDialog);
        if (result) {
          dispatch(fetchGroupsAsync())
        }
      }}
    >
      <Add sx={{ color: 'white' }} />
    </Fab>
  </Layout>
}
export default PublicGroupList