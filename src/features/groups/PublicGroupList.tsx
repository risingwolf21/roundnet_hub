import { Add, Groups } from "@mui/icons-material";
import { Avatar, Chip, Fab, List, ListItem, ListItemAvatar, ListItemText, Stack } from "@mui/material";
import { useQuery } from '@tanstack/react-query';
import { useDialogs } from "@toolpad/core";
import { useNotifications } from "@toolpad/core/useNotifications";
import React, { useEffect } from "react";
import { useNavigate } from "react-router";
import { PullToRefresh } from "src/components/pull-to-refresh/PullToRefresh";
import { GroupsRepository } from "src/repository/GroupsRepository";
import { GroupWithUserMappings } from "src/types/supabaseTypes";
import { useAuthentication } from "../auth/AuthContext";
import { JoinGroupButton } from "./components/JoinGroupButton";
import { CreateOrUpdateGroupDialog } from "./dialogs/CreateOrUpdateGroupDialog";
import { LoadingGroupListItem } from "./LoadingGroupListItem";

const PublicGroupList = () => {
  const { user } = useAuthentication();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const dialogs = useDialogs();

  const { data: groups = [], error, isLoading, refetch } = useQuery<GroupWithUserMappings[]>({
    queryKey: ['groups'],
    queryFn: GroupsRepository.fetchGroups
  })

  useEffect(() => {
    if (error)
      notifications.show(error.message, { severity: "error", actionText: "Neu laden", onAction: () => refetch() })
  }, [error, notifications, refetch])

  if (isLoading) {
    return <List>
      {
        Array.from({ length: 10 }, (v, k) => k + 1).map((x) => <LoadingGroupListItem key={x} />)
      }
    </List>
  }

  return <PullToRefresh onRefresh={() => refetch()}>
    <List sx={{ pb: 'calc(64px + env(safe-area-inset-bottom))' }}>
      {
        groups.map(x => <ListItem
          key={x.id}
          divider
          onClick={() => {
            if (x.user_group_role && x.user_group_role !== "joinRequested")
              navigate('/groups/' + x.id)
          }}
          secondaryAction={
            !x.user_group_role && (
              <JoinGroupButton group={x} user={user} />
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
    </List>
    {
      !error && <Fab
        sx={{
          background: '#66bb6a',
          position: 'fixed',
          right: '16px',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
        onClick={async () => {
          const result = await dialogs.open(CreateOrUpdateGroupDialog, { user });
          if (result && result !== "closed") {
            refetch();
            notifications.show("Gruppe wurde erfolgreich erstellt.", { severity: "success" });
          } else if (!result) {
            notifications.show("Gruppe konnte nicht erstellt werden.", { severity: "error" });
          }
        }}
      >
        <Add sx={{ color: 'white' }} />
      </Fab>
    }
  </PullToRefresh>
}
export default PublicGroupList