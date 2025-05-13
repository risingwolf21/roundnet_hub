import { ArrowDropDown, Close } from "@mui/icons-material";
import { Accordion, AccordionDetails, AccordionSummary, AppBar, Box, Button, Checkbox, Dialog, IconButton, List, ListItem, ListItemAvatar, ListItemText, ListSubheader, Toolbar, Typography } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DialogProps, NotificationsProvider, useNotifications } from "@toolpad/core";
import React, { useEffect, useState } from "react";
import { NumberInput } from "src/components/mui/NumberInput";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { GamesTable } from "src/types/supabaseTypes";

type ConstellationCreationDialogProps = {
  users: User[]
}

export type TeamType = "men" | "women" | "mixed";

export interface Team {
  players: [PlayerWithUser, PlayerWithUser];
  strength: number;
  adjustedStrength: number;
  type: TeamType;
}

export type Match = [Team, Team];

export interface MatchResult {
  matches: Match[];
  bench: PlayerWithUser[];
}

export interface MatchmakingOptions {
  players: PlayerWithUser[];
  lockedTeams?: [string, string][];
  matchupMode?: "any" | "separate";
  mustPlay?: string[];
  mode: "balanced" | "random";
  maxStrengthDifference?: number | ((remainingPlayers: PlayerWithUser[]) => number);
  fixedMatches?: Match[];
}

// --- Utils

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function determineTeamType(players: [PlayerWithUser, PlayerWithUser]): TeamType {
  const [g1, g2] = players.map(p => p.gender);
  if (g1 === "w" && g2 === "w") return "women";
  if (g1 === "m" && g2 === "m") return "men";
  return "mixed";
}

function createTeam(p1: PlayerWithUser, p2: PlayerWithUser): Team {
  const players: [PlayerWithUser, PlayerWithUser] = [p1, p2];
  const base = (p1.rg_index + p2.rg_index) / 2;
  const type = determineTeamType(players);
  const bonus = type === "mixed" ? -150 : type === "women" ? -300 : 0;
  return { players, strength: base, adjustedStrength: base + bonus, type };
}

function isAllowedMatchup(t1: Team, t2: Team, mode: "any" | "separate"): boolean {
  if (mode === "any") return true;
  const types = new Set([t1.type, t2.type]);
  return !(types.has("mixed") && (types.has("men") || types.has("women")));
}

function generatePossibleTeams(players: PlayerWithUser[], lockedTeams: [string, string][] = []): Team[] {
  const map = new Map(players.map(p => [p.player, p]));
  const locked = lockedTeams.map(([a, b]) => createTeam(map.get(a)!, map.get(b)!));
  const lockedNames = new Set(lockedTeams.flat());
  const freePlayers = players.filter(p => !lockedNames.has(p.player));
  const teams = [...locked];
  for (let i = 0; i < freePlayers.length; i++) {
    for (let j = i + 1; j < freePlayers.length; j++) {
      teams.push(createTeam(freePlayers[i], freePlayers[j]));
    }
  }
  return teams;
}

// --- Main Function

export function generateBalancedMatchesWithBench(options: MatchmakingOptions): MatchResult {
  const {
    players,
    lockedTeams = [],
    matchupMode = "any",
    mustPlay = [],
    mode = "balanced",
    maxStrengthDifference = 200,
    fixedMatches = []
  } = options;

  const allTeams = shuffle(generatePossibleTeams(players, lockedTeams));
  const used = new Set<string>(
    fixedMatches.flatMap(match =>
      [...match[0].players, ...match[1].players].map(p => p.player)
    )
  );

  const matches: Match[] = [...fixedMatches];

  const getDifferenceLimit = (remaining: PlayerWithUser[]) =>
    typeof maxStrengthDifference === "function"
      ? maxStrengthDifference(remaining)
      : maxStrengthDifference;

  const tryAddMatches = (teams: Team[], remaining: PlayerWithUser[], mustPlayOnly = false) => {
    const limit = getDifferenceLimit(remaining);
    const candidates: Match[] = [];

    for (let i = 0; i < teams.length; i++) {
      const t1 = teams[i];
      for (let j = i + 1; j < teams.length; j++) {
        const t2 = teams[j];
        const names = [...t1.players, ...t2.players].map(p => p.player);
        if (new Set(names).size < 4) continue;
        if (!isAllowedMatchup(t1, t2, matchupMode)) continue;
        const diff = Math.abs(t1.adjustedStrength - t2.adjustedStrength);
        if (mode === "balanced" && diff > limit) continue;
        candidates.push([t1, t2]);
      }
    }

    if (mode === "balanced") {
      candidates.sort((a, b) =>
        Math.abs(a[0].adjustedStrength - a[1].adjustedStrength) -
        Math.abs(b[0].adjustedStrength - b[1].adjustedStrength)
      );
    } else {
      shuffle(candidates);
    }

    for (const match of candidates) {
      const names = [...match[0].players, ...match[1].players].map(p => p.player);
      if (names.every(n => !used.has(n))) {
        const stillRequired = mustPlay.filter(n => !used.has(n));
        const included = names.filter(n => stillRequired.includes(n));

        if (mustPlayOnly && included.length === 0) continue;

        matches.push(match);
        names.forEach(n => used.add(n));
      }
    }
  };

  // Phase 1 – normale initiale Paarungen mit Priorität für mustPlay
  tryAddMatches(allTeams, players);

  // Phase 2 – zusätzliche Matches, wenn mindestens 4 Spieler übrig sind
  while (players.filter(p => !used.has(p.player)).length >= 4) {
    const remaining = players.filter(p => !used.has(p.player));
    const teams = shuffle(generatePossibleTeams(remaining));

    const matchCountBefore = matches.length;

    // Versuche gezielt mustPlay-Spieler unterzubringen
    tryAddMatches(teams, remaining, true);

    // Falls keine mustPlay-Spieler mehr offen oder keine Paarung möglich, versuche generell
    if (matches.length === matchCountBefore) {
      tryAddMatches(teams, remaining);
    }

    // Wenn auch dann keine Paarung, brich ab
    if (matches.length === matchCountBefore) break;
  }

  const bench = players.filter(p => !used.has(p.player));
  return { matches, bench };
}


type PlayerWithUser = GamesTable<"players"> & {
  name?: string
}


const Content = ({ payload, onClose }: DialogProps<ConstellationCreationDialogProps, null>) => {

  const notifications = useNotifications();
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<PlayerWithUser[]>([]);
  const [foundPlayers, setFoundPlayers] = useState<PlayerWithUser[]>([]);
  const [rounds, setRounds] = useState<{
    game: MatchResult,
    options: MatchmakingOptions
  }[]>([]);

  useEffect(() => {
    setLoading(true);
    supabase.schema("games").from("players").select("*").in("player", payload.users.map(x => x.userId)).then(result => {
      if (result.data) {
        setPlayers(result.data.map(x => ({ ...x, name: payload.users.find(y => y.userId === x.player)?.name })));
        setFoundPlayers(result.data.map(x => ({ ...x, name: payload.users.find(y => y.userId === x.player)?.name })));
      }
      setLoading(false)
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
      {
        payload.users.filter(x => !foundPlayers.map(y => y.player).includes(x.userId)).length > 0 && <Accordion disableGutters>
          <AccordionSummary expandIcon={<ArrowDropDown />}>
            <Typography component="span">Von {payload.users.filter(x => !foundPlayers.map(y => y.player).includes(x.userId)).length} Spielern kein Index gefunden</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {
                payload.users.filter(x => !foundPlayers.map(y => y.player).includes(x.userId)).map(x => <ListItem divider sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                  <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: "space-between", alignItems: "center", width: '100%' }}>
                    <Typography
                      sx={{
                        textAlign: 'end',
                        fontSize: '1rem',
                        color: `rgba(0,0,0,1)`,
                        fontWeight: '400',
                      }}
                    >
                      {x.name}
                    </Typography>
                    <NumberInput
                      value={players.find(y => y.player === x.userId)?.rg_index ?? 0}
                      placeholder="Index"
                      step={10}
                      onChange={(event, val) => {
                        if (val && val >= 0)
                          setPlayers([...players.filter(y => x.userId !== y.player), {
                            gender: "m",
                            player: x.userId,
                            name: x.name,
                            ka_index: 0,
                            pro_status: false,
                            rg_index: val,
                            created_at: "",
                            rg_avatar_url: null,
                            rg_id: null,
                            rg_link: null
                          }])
                      }}
                    />
                  </Box>
                </ListItem>)
              }
            </List>
          </AccordionDetails>
        </Accordion>
      }
      {
        rounds.map((x, index) => <>
          <List subheader={<ListSubheader disableGutters disableSticky>Runde {index + 1}</ListSubheader>}>
            <Accordion disableGutters>
              <AccordionSummary expandIcon={<ArrowDropDown />}>
                <Typography component="span">Einstellungen</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <ListItem divider sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                  <ListItemAvatar>
                    <Checkbox checked={x.options.mode === "balanced"} onChange={(e) => {
                      if (e.target.checked)
                        setRounds([...rounds.map((z, i) => i === index ? { ...z, options: { ...z.options, mode: "balanced" } as MatchmakingOptions } : z)])
                      else
                        setRounds([...rounds.map((z, i) => i === index ? { ...z, options: { ...z.options, mode: "random" } as MatchmakingOptions } : z)])
                    }} />
                  </ListItemAvatar>
                  <ListItemText primary={"Balanced Teams?"} />
                </ListItem>
                <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: "end", width: '100%' }}>
                  <Button onClick={() => {
                    const result = generateBalancedMatchesWithBench(x.options)
                    setRounds([...rounds.map((z, i) => i === index ? {
                      game: result,
                      options: x.options
                    } : x)])
                  }}>Neu generieren</Button>
                </Box>
              </AccordionDetails>
            </Accordion>
            {
              x.game.matches.map((y) => <ListItem divider sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                <ListItemAvatar>
                  <Checkbox checked={x.options.fixedMatches?.includes(y) ?? false} onChange={(e) => {
                    if (e.target.checked)
                      setRounds([...rounds.map((z, i) => i === index ? { ...z, options: { ...z.options, fixedMatches: [...z.options.fixedMatches ?? [], y] } as MatchmakingOptions } : z)])
                    else
                      setRounds([...rounds.map((z, i) => i === index ? { ...z, options: { ...z.options, fixedMatches: z.options.fixedMatches?.filter(x => x !== y) } as MatchmakingOptions } : z)])
                  }} />
                </ListItemAvatar>
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
                      {y[0].players.map(x => x.name ?? x.rg_id).join(" + ")}
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
                      {y[1].players.map(x => x.name ?? x.rg_id).join(" + ")}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      ml: 2,
                      flexDirection: 'column',
                    }}
                  >
                    <Typography
                      sx={{
                        textAlign: 'end',
                        fontSize: '1rem',
                        color: `rgba(0,0,0,0.6)`,
                        fontWeight: '400',
                      }}
                    >
                      {y[0].strength}
                    </Typography>
                    <Typography
                      sx={{
                        textAlign: 'end',
                        fontSize: '1rem',
                        color: `rgba(0,0,0,0.6)`,
                        fontWeight: '400',
                      }}
                    >
                      {y[1].strength}
                    </Typography>
                  </Box>
                </Box>
              </ListItem>)
            }
          </List >
          <List subheader={<ListSubheader disableSticky disableGutters>Aussetzer</ListSubheader>}>
            {
              x.game.bench.map(x => <ListItem sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                <ListItemText primary={x.name} secondary={x.rg_id} />
              </ListItem>)
            }
          </List>
        </>)
      }
      <ListItem
        sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}
        secondaryAction={
          <Button onClick={() => {
            if (players.length !== payload.users.length) {
              notifications.show("Einige Spieler haben einen ungültigen Index. Bitte passe diese an.", { severity: "error" })
              return
            }
            const options = {
              mode: "balanced",
              matchupMode: "any",
              players
            } as MatchmakingOptions;
            const result = generateBalancedMatchesWithBench(options);
            setRounds([...rounds, {
              game: result,
              options
            }]);
          }}>Neue Runde</Button>
        }
      >
      </ListItem>
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