import { Article, Close, ColorLens, Group, Groups, Title } from "@mui/icons-material";
import { AppBar, Avatar, Button, Checkbox, Dialog, IconButton, List, ListItem, ListItemAvatar, ListItemText, MenuItem, Select, TextField, Toolbar, Typography } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { captureException } from "@sentry/react";
import { DialogProps, NotificationsProvider, useNotifications } from "@toolpad/core";
import React, { useRef, useState } from "react";
import { useAuthentication } from "src/features/auth/AuthProvider";
import { useCreateGroupMutation, useUpdateGroupMutation } from "src/tanstack/groups";
import { Tables } from "src/types/supabase-generated.types";
import { GroupWithUserRole, UserWithGroups } from "src/types/supabaseTypes";
import { formatDateToDatabase } from "src/utils";

type CreateOrUpdateGroupDialogProps = {
  group?: Group
  user: UserWithGroups
}

const Content = ({ payload, onClose }: DialogProps<CreateOrUpdateGroupDialogProps, GroupWithUserRole | null | "closed">) => {
  const notifications = useNotifications();
  const { isAuthorized } = useAuthentication();
  const inputRef = useRef<HTMLInputElement>(null);
  const usersParentGroups = payload.user.groups.filter(x => x.parent_group === null);
  const [data, setData] = useState<Tables<'event_group'>>(payload.group ?? { name: "", description: "", id: "", created_at: "", color: "#000", is_public: true, need_request_to_join: false, parent_group: usersParentGroups.length === 1 ? usersParentGroups[0].id : null, visible: true });
  const createGroup = useCreateGroupMutation();
  const updateGroup = useUpdateGroupMutation(payload.group?.id);

  return <><AppBar sx={{ position: 'static', pt: "env(safe-area-inset-top)" }}>
    <Toolbar>
      <IconButton
        edge="start"
        color="inherit"
        onClick={() => onClose("closed")}>
        <Close />
      </IconButton>
      <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
        Gruppe erstellen
      </Typography>
      <Button color="inherit" onClick={async () => {
        if (data.name.length < 6) {
          notifications.show("Der Name der Challenge muss aus mindestens 6 Zeichen bestehen.", { severity: "warning" });
          return;
        }
        if (data.description.length < 6) {
          notifications.show("Die Beschreibung der Challenge muss aus mindestens 6 Zeichen bestehen.", { severity: "warning" });
          return;
        }

        if (data.id === "") {
          createGroup.mutate({
            group: {
              name: data.name,
              description: data.description,
              is_public: data.is_public,
              color: data.color,
              need_request_to_join: data.need_request_to_join,
              created_at: formatDateToDatabase(new Date()),
              parent_group: data.parent_group,
              visible: true
            },
            user: payload.user
          }, {
            onSuccess: (data) => onClose({ ...data, user_role: "admin" })
          })
        } else {
          updateGroup.mutate({ group: data }, {
            onError: (e) => {
              captureException(e);
              onClose(null);
            },
            onSuccess: (data) => {
              onClose({ ...data, user_role: "admin" });
            }
          });
        }
      }}>
        {data.id === "" ? "Erstellen" : "Speichern"}
      </Button>
    </Toolbar>
  </AppBar>
    <List sx={{ pl: 2, pr: 2, pb: 10 }}>
      {
        usersParentGroups.length > 0 && isAuthorized("groups.manage.admin") && <ListItem sx={{ pt: 0, pb: 0 }} key={'mainGroup'}>
          <ListItemAvatar>
            {
              data.parent_group && <Avatar sx={{ borderRadius: 2 }}>
                <Groups />
              </Avatar>
            }
          </ListItemAvatar>
          <Select
            sx={{ mt: 2, mb: 1 }}
            fullWidth
            value={data.parent_group ?? 'none'}
            disabled={usersParentGroups.length === 1}
            onChange={async (e) => {
              setData({
                ...data,
                parent_group: e.target.value === "none" ? null : e.target.value
              })
            }}
          >
            {
              usersParentGroups.map(x => <MenuItem value={x.id}>{x.name}</MenuItem>)
            }
            {
              <MenuItem value={"none"}>Neue Hauptgruppe</MenuItem>
            }
          </Select>
        </ListItem>
      }
      <ListItem sx={{ pt: 0, pb: 0 }} key={'title'}>
        <ListItemAvatar>
          <Avatar sx={{ borderRadius: 2 }}>
            <Title />
          </Avatar>
        </ListItemAvatar>
        <TextField
          fullWidth
          variant="outlined"
          label="Gruppen Titel"
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
          label="Gruppen Beschreibung"
          value={data.description}
          onChange={e => setData({ ...data, description: e.target.value })}
          margin="normal"
        />
      </ListItem>
      <ListItem
        secondaryAction={
          <IconButton
            LinkComponent={'span'}
            onClick={(e) => {
              if (inputRef.current) {
                inputRef.current.click();
              }
            }}
          >
            <input
              ref={inputRef}
              hidden
              type="color"
              value={data.color}
              onChange={(e) => setData({ ...data, color: e.target.value })}
            />
            <ColorLens />
          </IconButton>
        }
      >
        <ListItemAvatar>
          <Avatar sx={{ background: data.color, width: 40, height: 40, borderRadius: 2 }}>
            <Group />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          sx={{ mr: 2 }}
          slotProps={{
            primary: {
              whiteSpace: 'nowrap',
              overflow: 'clip',
              textOverflow: 'ellipsis',
            },
          }}
          primary={
            <TextField
              fullWidth
              variant="outlined"
              value={data.color}
              onChange={(e) => setData({ ...data, color: e.target.value })}
              label="Farbe"
              margin="normal"
            />
          }
        />
      </ListItem>
      {
        isAuthorized("groups.manage.admin") && <ListItem sx={{ pt: 0, pb: 0 }} key={'public'}>
          <ListItemAvatar>
            <Checkbox
              sx={{ pl: 0 }}
              checked={data.is_public}
              onChange={(e) =>
                setData({
                  ...data,
                  is_public: e.target.checked,
                })
              }
            />
          </ListItemAvatar>
          <ListItemText primary={"Öffentliche Gruppe"} />
        </ListItem>
      }
      <ListItem sx={{ pt: 0, pb: 0 }} key={'endDate'}>
        <ListItemAvatar>
          <Checkbox
            sx={{ pl: 0 }}
            checked={data.need_request_to_join}
            onChange={(e) =>
              setData({
                ...data,
                need_request_to_join: e.target.checked,
              })
            }
          />
        </ListItemAvatar>
        <ListItemText primary={"Benutzer müssen bestätigt werden?"} />
      </ListItem>
    </List >
  </>
}

export const CreateOrUpdateGroupDialog = ({ payload, open, onClose }: DialogProps<CreateOrUpdateGroupDialogProps, GroupWithUserRole | null | "closed">) => {
  return <Dialog fullScreen open={open} onClose={() => onClose("closed")}>
    <NotificationsProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Content onClose={onClose} open={open} payload={payload} />
      </LocalizationProvider>
    </NotificationsProvider>
  </Dialog>
}