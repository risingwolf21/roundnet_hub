import { Article, Close, Groups, Title } from "@mui/icons-material";
import { AppBar, Avatar, Button, Checkbox, Dialog, IconButton, List, ListItem, ListItemAvatar, MenuItem, Select, TextField, Toolbar, Typography } from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DialogProps, NotificationsProvider, useDialogs, useNotifications } from "@toolpad/core";
import dayjs from "dayjs";
import React, { useState } from "react";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { CreateOrUpdateGroupDialog } from "src/features/groups/dialogs/CreateOrUpdateGroupDialog";
import { useGroups } from "src/tanstack/groups";
import { Tables } from "src/types/supabase-generated.types";
import { UserWithGroups } from "src/types/supabaseTypes";
import { dayjsFromDb, dayjsToDb } from "src/utils";

type CreateChallengePayload = {
  user: UserWithGroups
}

const Content = ({ payload, onClose }: DialogProps<CreateChallengePayload, string | null>) => {
  const notifications = useNotifications();
  const dialogs = useDialogs();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [data, setData] = useState<Tables<'challenge'>>({ name: "", automated: false, description: "", id: "", created_at: "", end_date: null, group: "", max_points_per_week: null });

  const { data: groups = [], isLoading } = useGroups();

  return <><AppBar sx={{ position: 'static', pt: "env(safe-area-inset-top)" }}>
    <Toolbar>
      <IconButton
        edge="start"
        color="inherit"
        onClick={() => onClose(null)}>
        <Close />
      </IconButton>
      <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
        Challenge erstellen
      </Typography>
      <Button color="inherit" onClick={async () => {

        if (!selectedGroup) {
          notifications.show("Der Challenge muss eine Gruppe zugeordnet sein.", { severity: "warning" });
          return;
        }
        if (data.name.length < 6) {
          notifications.show("Der Name der Challenge muss aus mindestens 6 Zeichen bestehen.", { severity: "warning" });
          return;
        }
        if (data.description.length < 6) {
          notifications.show("Die Beschreibung der Challenge muss aus mindestens 6 Zeichen bestehen.", { severity: "warning" });
          return;
        }

        const { error } = await supabase
          .schema("public")
          .from("challenge")
          .insert({
            name: data.name,
            description: data.description,
            end_date: data.end_date,
            group: selectedGroup.id
          });
        if (error) {
          notifications.show("Challenge konnte nicht erstellt werden. " + error.message, { severity: "error" });
        } else {
          notifications.show("Challenge wurde erfolgreich erstellt.", { severity: "success" });
        }
      }}>
        Erstellen
      </Button>
    </Toolbar>
  </AppBar>
    <List sx={{ pl: 2, pr: 2, pb: 10 }}>
      <ListItem sx={{ pt: 0, pb: 0 }} key={'title'}>
        <ListItemAvatar>
          <Avatar sx={{ borderRadius: 2 }}>
            <Title />
          </Avatar>
        </ListItemAvatar>
        <TextField
          fullWidth
          variant="outlined"
          label="Challenge Titel"
          value={data.name}
          onChange={e => setData({ ...data, name: e.target.value })}
          margin="normal"
        />
      </ListItem>
      <ListItem sx={{ pt: 0, pb: 0 }} key={'description'}>
        <ListItemAvatar>
          <Avatar sx={{ borderRadius: 2 }}>
            <Article />
          </Avatar>
        </ListItemAvatar>
        <TextField
          fullWidth
          variant="outlined"
          label="Challenge Beschreibung"
          value={data.description}
          onChange={e => setData({ ...data, description: e.target.value })}
          margin="normal"
        />
      </ListItem>
      <ListItem sx={{ pt: 0, pb: 0 }} key={'group'}>
        <ListItemAvatar>
          {
            selectedGroup && <Avatar sx={{ backgroundColor: selectedGroup.color, borderRadius: 2 }}>
              <Groups />
            </Avatar>
          }
        </ListItemAvatar>
        <Select
          sx={{ mt: 2, mb: 1 }}
          fullWidth
          value={selectedGroup?.id ?? 'none'}
          onChange={async (e) => {
            if (e.target.value === "create") {
              const result = await dialogs.open(CreateOrUpdateGroupDialog, { user: payload.user });
              if (result && result !== "closed") {
                setSelectedGroup(result);
              } else {
                notifications.show("Es wurde keine Gruppe erstellt.", { severity: "error" });
              }
            } else {
              setSelectedGroup(groups.find(x => x.id === e.target.value) ?? null)
            }
          }}
        >
          {
            groups.filter(x => x.user_group_role === "admin").map(x => <MenuItem value={x.id}>{x.name}</MenuItem>)
          }
          {
            isLoading && <MenuItem value="loading">Wird geladen...</MenuItem>
          }
          {
            !isLoading && !selectedGroup && <MenuItem value="none">Keine</MenuItem>
          }
          {
            !isLoading && <MenuItem value="create">Gruppe erstellen</MenuItem>
          }
        </Select>
      </ListItem>
      <ListItem sx={{ pt: 0, pb: 0 }} key={'endDate'}>
        <ListItemAvatar>
          <Checkbox
            sx={{ pl: 0 }}
            checked={data.end_date !== null}
            onChange={() =>
              setData({
                ...data,
                end_date: data.end_date === null ? dayjsToDb(dayjs()) : null,
              })
            }
          />
        </ListItemAvatar>
        <DatePicker
          sx={{ width: '100%', mt: 2, mb: 1 }}
          label="Enddatum"
          disabled={data.end_date === null}
          disablePast
          format="DD MMMM YYYY"
          onChange={(val) =>
            setData({
              ...data,
              end_date: dayjsToDb(val),
            })
          }
          value={dayjsFromDb(data.end_date)}
        />
      </ListItem>
    </List >
  </>
}

export const CreateChallengeDialog = ({ payload, open, onClose }: DialogProps<CreateChallengePayload, string | null>) => {
  return <Dialog fullScreen open={open} onClose={() => onClose(null)}>
    <NotificationsProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Content onClose={onClose} open={open} payload={payload} />
      </LocalizationProvider>
    </NotificationsProvider>
  </Dialog>
}