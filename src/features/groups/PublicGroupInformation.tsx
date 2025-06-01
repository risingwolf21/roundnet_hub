import { AccountBox, Edit, ExpandMore, GroupRemove, Groups, PersonAdd, PersonRemove } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Avatar, Card, CardActionArea, Chip, Divider, Fab, List, ListItem, ListItemAvatar, ListItemText, Stack, Typography } from "@mui/material";
import { captureException } from "@sentry/react";
import { useDialogs, useNotifications } from "@toolpad/core";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { LoadingIndicator } from "src/components/LoadingIndicator";
import { useGroup, useLeaveGroupMutation } from "src/tanstack/groups";
import { can } from "src/utils/PermissionService";
import { useAuthentication } from "../auth/AuthContext";
import { AcceptJoinButton } from "./components/AcceptJoinButton";
import { DeclineJoinButton } from "./components/DeclineJoinButton";
import { GroupUserItem } from "./components/GroupUserItem";
import { CreateOrUpdateGroupDialog } from "./dialogs/CreateOrUpdateGroupDialog";
import SearchAndSelectUserDialog from "./dialogs/SearchAndSelectUserDialog";
import { useAddUsersMutation } from "./query/addUsersMutation";
import { useRemoveUsersMutation } from "./query/removeUsersMutation";

const PublicGroupInformation = () => {

  const { groupId } = useParams();
  const { user } = useAuthentication();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const dialogs = useDialogs();
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])

  const { data: group = null, error, isLoading, refetch } = useGroup(groupId);

  useEffect(() => {
    if (error)
      notifications.show(error.message, { severity: "error" })
  }, [error, notifications])


  const addUsersMutation = useAddUsersMutation(group);
  const removeUsersMutation = useRemoveUsersMutation(group);
  const leaveGroupMutation = useLeaveGroupMutation();

  const handleUsersAdded = async (users: User[]) => {
    addUsersMutation.mutate(users, {
      onSuccess: () => {
        notifications.show(`Successfully added ${users.length} users to the group ${group?.name}`, { severity: 'success', });
        setSelectedUsers([]);
      },
      onError: (error) => {
        notifications.show(`Failed to add ${users.length} user to the group ${group?.name} ${error.message}`, { severity: 'error' });
        captureException(error);
        setSelectedUsers([]);
      }
    });
  };

  const handleUsersRemove = async (users: User[]) => {
    removeUsersMutation.mutate(users, {
      onSuccess: () => {
        notifications.show(`Successfully removed ${users.length} users from the group ${group?.name}`, { severity: 'success', });
        setSelectedUsers([]);
      },
      onError: (error) => {
        notifications.show(`Failed to remove ${users.length} user from the group ${group?.name} ${error.message}`, { severity: 'error' });
        setSelectedUsers([]);
      }
    });
  };

  return <>
    <List sx={{ pb: 'calc(64px + env(safe-area-inset-bottom))' }}>
      <LoadingIndicator loading={isLoading} />
      <Typography pl={2} variant="h6" fontWeight="bold">
        Beschreibung
      </Typography>
      <Typography pl={2} pb={1}>
        {group?.description}
      </Typography>
      <Divider />
      <Typography pl={2} pt={1} variant="h6" fontWeight="bold">
        Mitglieder{group && " · " + group?.users.length}
      </Typography>
      <Card sx={{ borderRadius: 2, py: 0, px: 0, m: 1 }}>
        {
          selectedUsers.length > 0 && can("update", "group")
            ? <CardActionArea onClick={() => handleUsersRemove(selectedUsers)}>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ borderRadius: 2, background: "#ba1a1a" }}>
                    <PersonRemove />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={"Gewählte Teilnehmer entfernen"} />
              </ListItem>
            </CardActionArea>
            : can("update", "group") && group?.user_group_role === "admin" && <CardActionArea onClick={() => {
              dialogs.open(SearchAndSelectUserDialog, { usersToFilter: group.users.map(x => x.user.userId) })
                .then(result => {
                  if (result)
                    handleUsersAdded(result)
                })
            }}>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ borderRadius: 2 }}>
                    <PersonAdd />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={"Teilnehmer hinzufügen"}
                />
              </ListItem>
            </CardActionArea>
        }
      </Card>
      <Card sx={{ borderRadius: 2, py: 0, px: 0, m: 1 }}>
        {
          group?.user_group_role === "admin" && group?.users
            .filter(x => x.map.role === "joinRequested")
            .sort((a, b) => a.user.displayName.localeCompare(b.user.displayName))
            .slice(0, 10)
            .map(x =>
              <ListItem key={x.user.userId} secondaryAction={<Stack direction={"row"} spacing={2}>
                <DeclineJoinButton user={x.user} group={group} />
                <AcceptJoinButton user={x.user} group={group} />
              </Stack>}>
                <ListItemAvatar>
                  <Avatar sx={{ borderRadius: 2 }}>
                    {x.user.avatarUrl ? (
                      <img src={x.user.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
                    ) : (
                      <AccountBox />
                    )}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={<Stack direction={"row"} spacing={2}>
                  <Typography>{x.user.name}</Typography>
                  {
                    group.user_group_role === "admin" && <Chip variant='outlined' size="small" label="Angefragt" color='warning' />
                  }
                </Stack>} />
              </ListItem>)
        }
      </Card>
      <Card sx={{ borderRadius: 2, py: 0, px: 0, m: 1 }}>
        {
          group && group?.users
            .filter(x => x.map.role !== "joinRequested")
            .sort((a, b) => a.user.displayName.localeCompare(b.user.displayName))
            .slice(0, 10)
            .map(x => <GroupUserItem
              groupUser={x.user}
              user={user}
              isAdmin={x.map.role === "admin"}
              dialogs={dialogs}
              selected={selectedUsers.includes(x.user)}
              onAvatarClick={(e) => {
                e.stopPropagation();
                if (x.map.role === "admin")
                  return;
                if (selectedUsers.includes(x.user)) {
                  setSelectedUsers([...selectedUsers.filter(y => y.userId !== x.user.userId)])
                } else {
                  setSelectedUsers([...selectedUsers, x.user])
                }
              }} />)
        }
        {
          group && group.users.length > 10 && <Accordion disableGutters sx={{ m: 0 }}>
            <AccordionSummary sx={{ m: 0, pl: 0 }} expandIcon={<ExpandMore />} >
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ borderRadius: 2 }}>
                    <Groups />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={"Alle Mitglieder"} />
              </ListItem>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              {
                group && group?.users
                  .filter(x => x.map.role !== "joinRequested")
                  .sort((a, b) => a.user.displayName.localeCompare(b.user.displayName))
                  .slice(10)
                  .map(x => <GroupUserItem
                    groupUser={x.user}
                    user={user}
                    isAdmin={x.map.role === "admin"}
                    dialogs={dialogs}
                    selected={selectedUsers.includes(x.user)}
                    onAvatarClick={(e) => {
                      e.stopPropagation();
                      if (x.map.role !== "admin")
                        return;
                      if (selectedUsers.includes(x.user)) {
                        setSelectedUsers([...selectedUsers.filter(y => y.userId !== x.user.userId)])
                      } else {
                        setSelectedUsers([...selectedUsers, x.user])
                      }
                    }} />)
              }
            </AccordionDetails>
          </Accordion>
        }
      </Card>
      {
        group?.parent_group !== null && <>
          <Divider />
          <Card sx={{ color: "red", borderRadius: 2, py: 0, px: 0, m: 1 }}>
            <CardActionArea sx={{ px: 1 }}>
              <ListItem
                onClick={() => {
                  if (!group || !user)
                    return;
                  dialogs.confirm(group.need_request_to_join
                    ? "Du kannst der Gruppe nicht mehr direkt beitreten, sondern musst bestätigt werden."
                    : "Die Gruppe ist öffentlich. Du kannst Ihr jederzeit wieder beitreten.",
                    { okText: "Verlassen", cancelText: "Abbrechen", title: "Möchtest du die Gruppe wirklich verlassen?" }).then(result => {
                      if (result) {
                        leaveGroupMutation.mutate({ group, user }, {
                          onSuccess: () => navigate("/groups/list", { replace: true }),
                          onError: (error) => {
                            captureException(error);
                            notifications.show("Es ist ein Fehler aufgetreten.", { severity: "error" })
                          }
                        })
                      }
                    })
                }}>
                <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                  <GroupRemove />
                </ListItemAvatar>
                <ListItemText primary="Gruppe verlassen" />
              </ListItem>
            </CardActionArea>
          </Card>
        </>
      }
    </List>
    {
      group?.user_group_role === "admin" && <Fab
        sx={{
          background: '#66bb6a',
          position: 'fixed',
          right: '16px',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
        onClick={async () => {
          const result = await dialogs.open(CreateOrUpdateGroupDialog, { user, group: group ?? undefined });
          if (result && result !== "closed") {
            refetch();
            notifications.show("Gruppe wurde erfolgreich bearbeitet.", { severity: "success" });
          } else if (!result) {
            notifications.show("Gruppe konnte nicht bearbeitet werden.", { severity: "error" });
          }
        }}
      >
        <Edit sx={{ color: 'white' }} />
      </Fab>
    }
  </>
}

export default PublicGroupInformation