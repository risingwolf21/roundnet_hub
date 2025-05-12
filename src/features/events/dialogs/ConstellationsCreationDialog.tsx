import { Close } from "@mui/icons-material";
import { AppBar, Box, Button, Dialog, IconButton, List, ListItem, Toolbar, Typography } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DialogProps, NotificationsProvider } from "@toolpad/core";
import React, { useEffect, useState } from "react";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { Tables } from "src/types/supabase-generated.types";
import { GamesTable } from "src/types/supabaseTypes";

type ConstellationCreationDialogProps = {
  users: User[]
}

interface Team {
  players: [Player, Player];
  strength: number;
}

type Match = [Team, Team];

function createTeam(p1: Player, p2: Player): Team {
  return {
    players: [p1, p2],
    strength: (p1.rg_index + p2.rg_index) / 2,
  };
}

function generatePossibleTeams(players: Player[], lockedTeams: [string, string][] = []): Team[] {
  const usedNames = new Set(lockedTeams.flat());
  const teams: Team[] = [];

  // Feste Teams erzeugen
  for (const [name1, name2] of lockedTeams) {
    const p1 = players.find(p => p.player === name1);
    const p2 = players.find(p => p.player === name2);
    if (p1 && p2) teams.push(createTeam(p1, p2));
  }

  // Alle möglichen Paare aus restlichen Spielern
  const remaining = players.filter(p => !usedNames.has(p.player));
  for (let i = 0; i < remaining.length; i++) {
    for (let j = i + 1; j < remaining.length; j++) {
      teams.push(createTeam(remaining[i], remaining[j]));
    }
  }

  return teams;
}

function shuffle<T>(arr: T[]): T[] {
  return arr.map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function generateMatches(
  players: Player[],
  lockedTeams: [string, string][] = [],
  numResults: number = 1
): Match[][] {
  const results: Match[][] = [];

  for (let i = 0; i < numResults; i++) {
    const teams = shuffle(generatePossibleTeams(players, lockedTeams));
    const usedNames = new Set<string>();
    const matches: Match[] = [];

    for (let t1 of teams) {
      if (t1.players.some(p => usedNames.has(p.player))) continue;

      for (let t2 of teams) {
        if (t1 === t2 || t2.players.some(p => usedNames.has(p.player))) continue;

        matches.push([t1, t2]);
        t1.players.forEach(p => usedNames.add(p.player));
        t2.players.forEach(p => usedNames.add(p.player));
        break;
      }
    }

    results.push(matches);
  }

  return results;
}

const Content = ({ payload, onClose }: DialogProps<ConstellationCreationDialogProps, null>) => {

  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<GamesTable<"players">[]>([])
  const [matches, setMatches] = useState<Match[][]>([]);

  useEffect(() => {
    supabase.schema("games").from("players").select("*").in("player", payload.users.map(x => x.userId)).then(result => {
      if (result.data) {
        setPlayers(result.data)
        let m = generateMatches(players, [], 1)
        setMatches(m);
      }
    })
  }, [payload]);

  return <><AppBar sx={{ position: 'static', pt: "env(safe-area-inset-top)" }}>
    <Toolbar>
      <IconButton
        edge="start"
        color="inherit"
        onClick={() => onClose(null)}>
        <Close />
      </IconButton>
      <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
        Konstellationen
      </Typography>
      <Button color="inherit" onClick={() => onClose(null)}>
        Speichern
      </Button>
    </Toolbar>
  </AppBar>
    <List sx={{ pl: 2, pr: 2, pb: 10 }}>
      {
        loading && <p>loading...</p>
      }
      <p>Spieler: {players.length} Matches: {matches.length}</p>
      {
        matches.map(x => x.map(y => <ListItem divider>
          <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                flexGrow: 1,
                flexDirection: 'column',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <Typography
                sx={{
                  fontSize: '1rem',
                  color: 'rgba(0,0,0,0.87)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {y[0].players.map(x => x.rg_id).join("/")}
              </Typography>
              <Typography
                sx={{
                  fontSize: '1rem',
                  color: 'rgba(0,0,0,0.87)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {y[1].players.map(x => x.rg_id).join("/")}
              </Typography>
            </Box>
          </Box>
        </ListItem>))
      }
    </List >
  </>
}

export const ConstellationCreationDialog = ({ payload, open, onClose }: DialogProps<ConstellationCreationDialogProps, null>) => {
  return <Dialog fullScreen open={open} onClose={() => onClose(null)}>
    <NotificationsProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Content onClose={onClose} open={open} payload={payload} />
      </LocalizationProvider>
    </NotificationsProvider>
  </Dialog>
}