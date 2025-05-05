import { Article, Close, ColorLens, Group, Title } from "@mui/icons-material";
import { AppBar, Avatar, Button, Checkbox, Dialog, IconButton, List, ListItem, ListItemAvatar, ListItemText, TextField, Toolbar, Typography } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { captureException } from "@sentry/react";
import { DialogProps, NotificationsProvider, useNotifications } from "@toolpad/core";
import React, { useRef, useState } from "react";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { useApplication } from "src/features/auth/AuthContext";
import { Tables } from "src/types/supabase-generated.types";

const Content = ({ payload, onClose }: DialogProps<Group | undefined, Group | null | "closed">) => {
  const { user } = useApplication();
  const notifications = useNotifications();
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<Tables<'event_group'>>(payload ?? { name: "", description: "", id: "", created_at: "", color: "#000", is_public: true, need_request_to_join: false });

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
          const { error, data: result_data } = await supabase
            .schema("public")
            .from("event_group")
            .insert({
              name: data.name,
              description: data.description,
              is_public: data.is_public,
              color: data.color,
              need_request_to_join: data.need_request_to_join
            })
            .select("*")
            .single();

          if (error) {
            captureException(error);
            onClose(result_data);
          } else if (user) {
            await supabase.schema("public").from("group_user_mapping").insert({
              group: result_data.id,
              user: user?.userId,
              role: "admin"
            })
            onClose(result_data);
          }
        } else {
          const { error, data: result_data } = await supabase
            .schema("public")
            .from("event_group")
            .update({
              name: data.name,
              description: data.description,
              is_public: data.is_public,
              color: data.color,
              need_request_to_join: data.need_request_to_join
            })
            .eq("id", data.id)
            .select("*")
            .single();
          if (error) {
            captureException(error);
          }
          onClose(result_data);
        }
      }}>
        {data.id === "" ? "Erstellen" : "Speichern"}
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

export const CreateOrUpdateGroupDialog = ({ payload, open, onClose }: DialogProps<Group | undefined, Group | null | "closed">) => {
  return <Dialog fullScreen open={open} onClose={() => onClose("closed")}>
    <NotificationsProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Content onClose={onClose} open={open} payload={payload} />
      </LocalizationProvider>
    </NotificationsProvider>
  </Dialog>
}