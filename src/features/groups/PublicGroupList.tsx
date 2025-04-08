import { Groups } from "@mui/icons-material";
import { Avatar, Button, ListItem, ListItemAvatar, ListItemText } from "@mui/material";
import { useNotifications } from "@toolpad/core/useNotifications";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import Layout from "src/components/Layout";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { RootState, useAppDispatch } from "src/redux/store";
import { GroupsRepository } from "src/repository/GroupsRepository";
import { GroupWithUsers } from "src/types/supabaseTypes";
import { useApplication } from "../auth/AuthContext";
import { fetchGroupsAsync, groupsSelector, onEventMappingUserAdded } from "./slices/groupsSlice";

const PublicGroupList = () => {
  const groups = useSelector((state: RootState) => groupsSelector.selectAll(state));
  const { loading } = useSelector((state: RootState) => state.groups);

  const { user } = useApplication();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const notifications = useNotifications();


  useEffect(() => {
    dispatch(fetchGroupsAsync({ client: supabase }));
  }, [dispatch]);

  const joinGroup = (group: GroupWithUsersBase) => {
    if (user)
      GroupsRepository.addUserToGroup(group.id, user?.userId).then(result => {
        dispatch(onEventMappingUserAdded({ user, group: group.id }));
        notifications.show("Erfolgreich der Gruppe beigetreten.");
      }).catch(error => notifications.show("Der Gruppe konnte nicht beigetreten werden", { severity: "error" }))
  }

  return <Layout>
    {
      groups.map(x => <ListItem
        key={x.id}
        divider
        onClick={() => {
          if (x.users.filter(x => x.user?.userId === user?.userId).length > 0)
            navigate('/groups/' + x.id)
        }}
        secondaryAction={
          x.users.filter(x => x.user?.userId === user?.userId).length <= 0 && (
            <Button
              onClick={(event) => {
                event.stopPropagation();
                joinGroup(x)
              }}
            >
              Beitreten
            </Button>
          )
        }
      >
        <ListItemAvatar>
          <Avatar sx={{ backgroundColor: x.color, borderRadius: 2 }}>
            <Groups />
          </Avatar>
        </ListItemAvatar>
        <ListItemText primary={x.name} secondary={x.description} />
      </ListItem>)
    }
  </Layout>
}
export default PublicGroupList