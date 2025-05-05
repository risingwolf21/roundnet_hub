import { AccountBox, Check, Edit, ExpandMore, GroupRemove, Groups, PersonAdd, PersonRemove } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, Avatar, Button, Card, CardActionArea, Chip, Divider, Fab, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import { captureException } from "@sentry/react";
import { useDialogs, useNotifications } from "@toolpad/core";
import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router";
import Layout from "src/components/Layout";
import { LoadingIndicator } from "src/components/LoadingIndicator";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { RootState, useAppDispatch } from "src/redux/store";
import { AdminUsersRepository } from "src/repository/AdminUsersRepository";
import { GroupsRepository } from "src/repository/GroupsRepository";
import { GroupWithUserMappings } from "src/types/supabaseTypes";
import { can } from "src/utils/PermissionService";
import { fetchAdminUsersAsync } from "../admin/slices/adminUserSlice";
import { useApplication } from "../auth/AuthContext";
import { CreateOrUpdateGroupDialog } from "./dialogs/CreateOrUpdateGroupDialog";
import SearchAndSelectUserDialog from "./dialogs/SearchAndSelectUserDialog";

const PublicGroupInformation = () => {

  const { groupId } = useParams();
  const { user } = useApplication();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const notifications = useNotifications();
  const dialogs = useDialogs();
  const [group, setGroup] = useState<GroupWithUserMappings | null>(null)
  const [loading, setLoading] = useState(false);
  const [searchAndSelectUsersOpen, setSearchAndSelectUsersOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])

  const { users, loading: adminUsersLoading } = useSelector((state: RootState) => state.adminUsers);

  useEffect(() => {
    dispatch(fetchAdminUsersAsync());
  }, [dispatch]);

  const loadGroup = useCallback((groupId?: string) => {
    if (groupId) {
      setLoading(true)
      GroupsRepository.fetchSingleGroupWithUsers(groupId).then(result => {
        setGroup(result);
        setLoading(false)
      })
    }
  }, [])

  useEffect(() => {
    loadGroup(groupId)
  }, [groupId, loadGroup]);

  const handleUsersAdded = async (users: User[]) => {
    if (group)
      await AdminUsersRepository.addUsersToGroup(group, users)
        .then((r) => {
          setSearchAndSelectUsersOpen(false);
          notifications.show(`Successfully added ${users.length} users to the group ${group.name}`, { severity: 'success', });
          loadGroup(group?.id)
        })
        .catch((error) => {
          captureException(error);
          notifications.show(`Failed to add ${users.length} user to the group ${group.name} ${error.message}`, { severity: 'error' });
        });
  };

  const handleUsersRemove = async (users: User[]) => {
    if (group)
      await AdminUsersRepository.removeUsersFromGroup(group, users)
        .then((r) => {
          notifications.show(`Successfully removed ${users.length} users from the group ${group.name}`, { severity: 'success', });
          loadGroup(group.id);
          setSelectedUsers([])
        })
        .catch((error) => {
          captureException(error);
          notifications.show(`Failed to remove ${users.length} users from the group ${group.name} ${error.message}`, { severity: 'error' });
        });
  };

  return <Layout>
    <List>
      <LoadingIndicator loading={loading} />
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
          selectedUsers.length > 0
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
            : can("update", "group") && group?.user_group_role === "admin" && <CardActionArea onClick={() => setSearchAndSelectUsersOpen(true)}>
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
              <ListItem secondaryAction={<Button
                onClick={() => {
                  supabase
                    .from("group_user_mapping")
                    .update({ role: "user" })
                    .eq("group", group.id)
                    .eq("user", x.user.userId)
                    .eq("role", "joinRequested")
                    .then(result => {
                      if (!result.error) {
                        loadGroup(group.id)
                      }
                    })
                }}>
                Anfrage akzeptieren
              </Button>}>
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
            .map(x => <ListItemButton
              divider
              onClick={() => navigate("/user/" + x.user.userId)}
            >
              <ListItemAvatar onClick={(e) => {
                e.stopPropagation();
                if (x.map.role === "admin")
                  return;
                if (selectedUsers.includes(x.user)) {
                  setSelectedUsers([...selectedUsers.filter(y => y.userId !== x.user.userId)])
                } else {
                  setSelectedUsers([...selectedUsers, x.user])
                }
              }}>
                {
                  selectedUsers.includes(x.user)
                    ? <Avatar sx={{ borderRadius: 2, background: "#0288d1" }}>
                      <Check />
                    </Avatar>
                    : <Avatar sx={{ borderRadius: 2 }}>
                      {x.user.avatarUrl ? (
                        <img src={x.user.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
                      ) : (
                        <AccountBox />
                      )}
                    </Avatar>
                }
              </ListItemAvatar>
              <ListItemText
                primary={<Stack direction={"row"} spacing={2}>
                  <Typography>{x.user.name}</Typography>
                  {
                    x.map.role === "admin" && <Chip variant='outlined' size="small" label="Admin" color='info' />
                  }
                </Stack>} secondary={x.user.email}
              />
            </ListItemButton>)
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
                  .map(x => <ListItemButton
                    divider
                    onClick={() => navigate("/user/" + x.user.userId)}
                  >
                    <ListItemAvatar onClick={(e) => {
                      e.stopPropagation();
                      if (x.map.role === "admin")
                        return;
                      if (selectedUsers.includes(x.user)) {
                        setSelectedUsers([...selectedUsers.filter(y => y.userId !== x.user.userId)])
                      } else {
                        setSelectedUsers([...selectedUsers, x.user])
                      }
                    }}>
                      {
                        selectedUsers.includes(x.user)
                          ? <Avatar sx={{ borderRadius: 2, background: "#0288d1" }}>
                            <Check />
                          </Avatar>
                          : <Avatar sx={{ borderRadius: 2 }}>
                            {x.user.avatarUrl ? (
                              <img src={x.user.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
                            ) : (
                              <AccountBox />
                            )}
                          </Avatar>
                      }
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Stack direction={"row"} spacing={2}>
                        <Typography>{x.user.name}</Typography>
                        {
                          x.map.role === "admin" && <Chip variant='outlined' size="small" label="Admin" color='info' />
                        }
                      </Stack>} secondary={x.user.email}
                    />
                  </ListItemButton>)
              }
            </AccordionDetails>
          </Accordion>
        }
      </Card>
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
                    supabase.schema("public").from("group_user_mapping").delete().eq("group", group.id).eq("user", user.userId).then(result => {
                      if (!result.error) {
                        navigate("/groups/list", { replace: true })
                      } else {
                        captureException(result.error);
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
    </List>
    <Fab
      sx={{
        background: '#66bb6a',
        position: 'fixed',
        right: '16px',
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
      }}
      onClick={async () => {
        const result = await dialogs.open(CreateOrUpdateGroupDialog, group ?? undefined);
        if (result && result !== "closed") {
          loadGroup(result.id)
          notifications.show("Gruppe wurde erfolgreich bearbeitet.", { severity: "success" });
        } else if (!result) {
          notifications.show("Gruppe konnte nicht bearbeitet werden.", { severity: "error" });
        }
      }}
    >
      <Edit sx={{ color: 'white' }} />
    </Fab>
    <SearchAndSelectUserDialog
      open={searchAndSelectUsersOpen}
      handleClose={() => setSearchAndSelectUsersOpen(false)}
      handleSubmit={handleUsersAdded}
      users={users.filter((x) => !(group?.users.map((x) => x.user) ?? []).some((y) => y.userId === x.userId))}
      loading={adminUsersLoading}
    />
  </Layout>
}

export default PublicGroupInformation