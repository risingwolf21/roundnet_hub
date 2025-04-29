import { Article, Close, Title } from "@mui/icons-material";
import { AppBar, Avatar, Button, Checkbox, Dialog, IconButton, List, ListItem, ListItemAvatar, ListItemText, TextField, Toolbar, Typography } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DialogProps, NotificationsProvider, useNotifications } from "@toolpad/core";
import React, { useState } from "react";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { Tables } from "src/types/supabase-generated.types";

const Content = ({ payload, onClose }: DialogProps<undefined, Group | null>) => {
  const notifications = useNotifications();

  const [data, setData] = useState<Tables<'event_group'>>({ name: "", description: "", id: "", created_at: "", color: "#000", is_public: true, need_request_to_join: false });

  return <><AppBar sx={{ position: 'static', pt: "env(safe-area-inset-top)" }}>
    <Toolbar>
      <IconButton
        edge="start"
        color="inherit"
        onClick={() => onClose(null)}>
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
        if (!result_data) {
          notifications.show("Gruppe konnte nicht erstellt werden. " + error?.message, { severity: "error" });
        } else {
          notifications.show("Gruppe wurde erfolgreich erstellt.", { severity: "success" });
          onClose(result_data);
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

export const CreateGroupDialog = ({ payload, open, onClose }: DialogProps<undefined, Group | null>) => {
  return <Dialog fullScreen open={open} onClose={() => onClose(null)}>
    <NotificationsProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Content onClose={onClose} open={open} payload={payload} />
      </LocalizationProvider>
    </NotificationsProvider>
  </Dialog>
}