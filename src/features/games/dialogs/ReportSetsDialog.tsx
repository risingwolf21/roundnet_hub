import { Close, Delete } from "@mui/icons-material";
import { AppBar, Button, Dialog, Grid2, IconButton, List, ListItem, TextField, Toolbar, Typography } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DialogProps, NotificationsProvider, useNotifications } from "@toolpad/core";
import React, { useState } from "react";
import { supabase } from "src/components/services/supabase/supabaseClient";

type ReportSetsDialogProps = {
  match: FullUserMatch
}

const Content = ({ payload, onClose }: DialogProps<ReportSetsDialogProps, MatchSet[] | null>) => {

  const notifications = useNotifications();

  const [sets, setSets] = useState<MatchSet[]>([
    { id: '0', created_at: '', set_number: 1, match: '', team_a_score: 0, team_b_score: 0 },
  ]);

  return <>
    <AppBar sx={{ position: 'static', pt: "env(safe-area-inset-top)" }}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={() => onClose(null)}>
          <Close />
        </IconButton>
        <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
          Sätze eintragen
        </Typography>
        <Button color="inherit" onClick={async () => {
          const result = await supabase.schema("games").from("sets").upsert(sets.map(x => ({
            set_number: x.set_number,
            match: payload.match.id!,
            team_a_score: x.team_a_score,
            team_b_score: x.team_b_score,
          })))
            .select("*");
          if (!result.error) {
            onClose(result.data);
          } else {
            notifications.show("Die Sätze konnten nicht gespeichert werden.", { severity: "error" });
          }
        }}>
          Speichern
        </Button>
      </Toolbar>
    </AppBar>
    <List sx={{ pl: 2, pr: 2, pb: 10, width: '100%' }}>
      <ListItem divider disableGutters disablePadding sx={{ width: "100%" }}>
        <>
          <Grid2 size={5} sx={{ p: 2 }}>
            <TextField
              size="small"
              fullWidth
              defaultValue={payload.match.team_a_name}
              value={payload.match.team_a_name}
              label={"Team A"}
              disabled
            />
          </Grid2>
          <Grid2 size={5} sx={{ p: 2 }}>
            <TextField
              size="small"
              fullWidth
              defaultValue={payload.match.team_b_name}
              value={payload.match.team_b_name}
              label={"Team B"}
              disabled
            />
          </Grid2>
          <Grid2 size={2} sx={{ p: 2 }}>

          </Grid2>
        </>
      </ListItem>
      {sets.map((x, index) => (
        <ListItem divider disableGutters disablePadding>
          <>
            <Grid2 size={5} sx={{ p: 2 }}>
              <TextField
                size="small"
                type="number"
                fullWidth
                value={x.team_a_score.toString()}
                onChange={(e) =>
                  setSets(sets.map(y => y.id === x.id ? { ...x, team_a_score: Number(e.target.value) } : y))
                }
                label={`Satz ${x.set_number} - Team A`}
              />
            </Grid2>
            <Grid2 size={5} sx={{ p: 2 }}>
              <TextField
                size="small"
                type="number"
                fullWidth
                value={x.team_b_score.toString()}
                onChange={(e) =>
                  setSets(sets.map(y => y.id === x.id ? { ...x, team_b_score: Number(e.target.value) } : y))
                }
                label={`Satz ${x.set_number} - Team B`}
              />
            </Grid2>
            <Grid2 size={2} sx={{ p: 2 }}>
              {
                index > 0 && <IconButton onClick={() => setSets([...sets.filter((y) => y.set_number !== x.set_number)])}>
                  <Delete />
                </IconButton>
              }
            </Grid2>
          </>
        </ListItem>
      ))}
      <Grid2 size={12} sx={{ p: 2 }}>
        <Button
          onClick={() =>
            setSets([
              ...sets,
              { id: (sets.length + 1).toString(), created_at: '', set_number: sets.length + 1, match: '', team_a_score: 0, team_b_score: 0 },
            ])
          }
        >
          Neuen Satz erstellen
        </Button>
      </Grid2>
    </List>
  </>
}

export const ReportSetsDialog = ({ payload, open, onClose }: DialogProps<ReportSetsDialogProps, MatchSet[] | null>) => {
  return <Dialog fullScreen open={open} onClose={() => onClose(null)}>
    <NotificationsProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Content onClose={onClose} open={open} payload={payload} />
      </LocalizationProvider>
    </NotificationsProvider>
  </Dialog>
}