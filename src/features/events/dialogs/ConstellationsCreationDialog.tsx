import SearchAndSelectUserDialog from '@/features/groups/dialogs/SearchAndSelectUserDialog';
import { customEnLocale } from '@/lib/date-fns';
import { supabase } from '@/lib/supabase';
import { GamesRepository } from '@/repository/GamesRepository';
import { EventsUserView, GamesTable } from '@/types/supabaseTypes';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DialogProps, NotificationsProvider, useDialogs, useNotifications } from '@toolpad/core';
import { useEffect, useState } from 'react';

import NumberField from '@/components/mui/NumberField';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Save from '@mui/icons-material/Save';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { captureException } from '@sentry/react';

type ConstellationCreationDialogProps = {
  users: User[];
  event: EventsUserView;
};

export type TeamType = 'men' | 'women' | 'mixed';

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
  lockedTeams?: [PlayerWithUser, PlayerWithUser][];
  matchupMode?: 'any' | 'separate' | 'mixed';
  mustPlay?: PlayerWithUser[];
  mode?: 'balanced' | 'random';
  maxStrengthDifference?: number | ((remainingPlayers: PlayerWithUser[]) => number);
  fixedMatches?: Match[];
  benchFromLastMatchMustPlay?: boolean; // UI-only
  matchHistory?: string[][];
}

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function determineTeamType(players: [PlayerWithUser, PlayerWithUser]): TeamType {
  const [g1, g2] = players.map((p) => p.gender);
  if (g1 === 'w' && g2 === 'w') return 'women';
  if (g1 === 'm' && g2 === 'm') return 'men';
  return 'mixed';
}

function createTeam(p1: PlayerWithUser, p2: PlayerWithUser): Team {
  const players: [PlayerWithUser, PlayerWithUser] = [p1, p2];
  const noise = Math.random() * 50 - 50; // -10 bis +10
  const base = ((p1.rg_index ?? 1000) + (p2.rg_index ?? 1000)) / 2 + noise;
  const type = determineTeamType(players);
  const bonus = type === 'mixed' ? -150 : type === 'women' ? -300 : 0;
  return { players, strength: Math.floor(base), adjustedStrength: base + bonus, type };
}

function isAllowedMatchup(t1: Team, t2: Team, mode: 'any' | 'separate' | 'mixed'): boolean {
  if (mode === 'any') return true;
  if (mode === 'mixed') {
    return t1.type === 'mixed' && t2.type === 'mixed';
  }
  const types = new Set([t1.type, t2.type]);
  return !(types.has('mixed') && (types.has('men') || types.has('women')));
}

function generatePossibleTeams(
  players: PlayerWithUser[],
  lockedTeams: [PlayerWithUser, PlayerWithUser][] = []
): Team[] {
  const map = players.reduce((acc, p) => acc.set(p.player, p), new Map<string, PlayerWithUser>());
  const locked = lockedTeams.map(([a, b]) => createTeam(map.get(a.player)!, map.get(b.player)!));
  const lockedNames = new Set(lockedTeams.flat().map((x) => x.player));
  const freePlayers = players.filter((p) => !lockedNames.has(p.player));
  const teams = [...locked];
  for (let i = 0; i < freePlayers.length; i++) {
    for (let j = i + 1; j < freePlayers.length; j++) {
      teams.push(createTeam(freePlayers[i], freePlayers[j]));
    }
  }
  return teams;
}

function hasMustPlayPlayer(match: Match, mustPlay: string[], used: Set<string>) {
  return [...match[0].players, ...match[1].players].some((p) => mustPlay.includes(p.player) && !used.has(p.player));
}

function getMatchKey(match: Match): string {
  const allPlayers = [...match[0].players, ...match[1].players].map((p) => p.player);
  return allPlayers.sort().join('|');
}

function isSimilarToHistory(matchKey: string, history: string[][]): boolean {
  const current = matchKey.split('|');
  return history.some((prev) => {
    const intersection = prev.filter((p) => current.includes(p));
    return intersection.length >= 3;
  });
}

export function generateBalancedMatchesWithBench(options: MatchmakingOptions): MatchResult {
  const {
    players,
    lockedTeams = [],
    matchupMode = 'any',
    mustPlay = [],
    mode = 'balanced',
    maxStrengthDifference = 200,
    fixedMatches = [],
    matchHistory = [],
  } = options;

  const seenMatches = new Set<string>(); // lokal pro Aufruf

  if (matchupMode === 'separate') {
    const fixedPlayers = new Set(
      fixedMatches.flatMap((match) => [...match[0].players, ...match[1].players].map((p) => p.player))
    );

    const remainingPlayers = players.filter((p) => !fixedPlayers.has(p.player));
    const men = remainingPlayers.filter((p) => p.gender === 'm');
    const women = remainingPlayers.filter((p) => p.gender === 'w');

    const menMatches = generateBalancedMatchesWithBench({
      ...options,
      players: men,
      matchupMode: 'any',
      fixedMatches: undefined,
      mustPlay: mustPlay.filter((p) => p.gender === 'm'),
    });

    const womenMatches = generateBalancedMatchesWithBench({
      ...options,
      players: women,
      matchupMode: 'any',
      fixedMatches: undefined,
      mustPlay: mustPlay.filter((p) => p.gender === 'w'),
    });

    return {
      matches: [...fixedMatches, ...menMatches.matches, ...womenMatches.matches],
      bench: [...menMatches.bench, ...womenMatches.bench],
    };
  }

  const mustPlayNames = mustPlay.map((p) => p.player);
  const used = new Set<string>(
    fixedMatches.flatMap((match) => [...match[0].players, ...match[1].players].map((p) => p.player))
  );

  const matches: Match[] = [...fixedMatches];

  const getDifferenceLimit = (remaining: PlayerWithUser[]) =>
    typeof maxStrengthDifference === 'function' ? maxStrengthDifference(remaining) : maxStrengthDifference;

  const tryAddMatches = (teams: Team[], remaining: PlayerWithUser[], mustPlayOnly = false) => {
    const limit = getDifferenceLimit(remaining);
    let candidates: Match[] = [];

    for (let i = 0; i < teams.length; i++) {
      const t1 = teams[i];
      for (let j = i + 1; j < teams.length; j++) {
        const t2 = teams[j];
        const names = [...t1.players, ...t2.players].map((p) => p.player);
        if (new Set(names).size < 4) continue;
        if (!isAllowedMatchup(t1, t2, matchupMode)) continue;
        const diff = Math.abs(t1.adjustedStrength - t2.adjustedStrength);
        if (mode === 'balanced' && diff > limit) continue;
        const match: Match = [t1, t2];
        const key = getMatchKey(match);
        if (seenMatches.has(key)) continue;
        if (matchHistory && isSimilarToHistory(key, matchHistory)) continue;
        candidates.push(match);
      }
    }

    if (mode === 'balanced') {
      candidates.sort(
        (a, b) =>
          Math.abs(a[0].adjustedStrength - a[1].adjustedStrength) -
          Math.abs(b[0].adjustedStrength - b[1].adjustedStrength)
      );
      const top = candidates.slice(0, 20);
      shuffle(top);
      candidates = top;
    } else {
      shuffle(candidates);
    }

    for (const match of candidates) {
      const names = [...match[0].players, ...match[1].players].map((p) => p.player);
      if (names.every((n) => !used.has(n))) {
        if (mustPlayOnly && !hasMustPlayPlayer(match, mustPlayNames, used)) {
          continue;
        }
        matches.push(match);
        seenMatches.add(getMatchKey(match));
        names.forEach((n) => used.add(n));
      }
    }
  };

  const remaining1 = players.filter((p) => !used.has(p.player));
  const teams1 = shuffle(generatePossibleTeams(remaining1, lockedTeams));
  tryAddMatches(teams1, remaining1, true);

  while (players.filter((p) => !used.has(p.player)).length >= 4) {
    const remaining = players.filter((p) => !used.has(p.player));
    const remainingLockedTeams = lockedTeams.filter(
      ([a, b]) => remaining.find((p) => p.player === a.player) && remaining.find((p) => p.player === b.player)
    );
    const teams = shuffle(generatePossibleTeams(remaining, remainingLockedTeams));

    const matchCountBefore = matches.length;

    tryAddMatches(teams, remaining, true);

    if (matches.length === matchCountBefore) {
      tryAddMatches(teams, remaining);
    }

    if (matches.length === matchCountBefore) break;
  }

  const bench = players.filter((p) => !used.has(p.player));
  return { matches, bench };
}

type PlayerWithUser = GamesTable<'players'> & {
  name?: string;
};

const Content = ({ payload, onClose }: DialogProps<ConstellationCreationDialogProps, null>) => {
  const notifications = useNotifications();
  const dialogs = useDialogs();
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<PlayerWithUser[]>([]);
  const [foundPlayers, setFoundPlayers] = useState<PlayerWithUser[]>([]);
  const [preSelectedPlayer1, setPreSelectedPlayer1] = useState<PlayerWithUser | null>(null);
  const [preSelectedPlayer2, setPreSelectedPlayer2] = useState<PlayerWithUser | null>(null);
  const [preMustPlay, setPreMustPlay] = useState<PlayerWithUser | null>(null);
  const [rounds, setRounds] = useState<
    {
      game: MatchResult;
      options: MatchmakingOptions;
    }[]
  >([]);

  useEffect(() => {
    supabase
      .schema('games')
      .from('players')
      .select('*')
      .in(
        'player',
        payload.users.map((x) => x.id)
      )
      .then((result) => {
        if (result.data) {
          const loadedPlayers = result.data.map((x) => ({
            ...x,
            name: payload.users.find((y) => y.id === x.player)?.name,
          }));
          setPlayers(loadedPlayers);
          setFoundPlayers(result.data.map((x) => ({ ...x, name: payload.users.find((y) => y.id === x.player)?.name })));

          setRounds([
            {
              game: {
                matches: [],
                bench: [],
              },
              options: {
                players: loadedPlayers,
                mode: 'balanced',
                matchupMode: 'any',
              },
            },
          ]);
        }
        setLoading(false);
      });
  }, [payload]);

  return (
    <>
      <AppBar sx={{ position: 'sticky', pt: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onClose(null)}>
            <Close />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Konstellationen
          </Typography>
        </Toolbar>
      </AppBar>
      <List sx={{ pl: 0, pr: 0, pb: 10 }}>
        {loading && <p>loading...</p>}
        {payload.users.filter((x) => !foundPlayers.map((y) => y.player).includes(x.id)).length > 0 && (
          <Accordion disableGutters defaultExpanded>
            <AccordionSummary expandIcon={<ArrowDropDown />}>
              <Typography component="span">
                Von {payload.users.filter((x) => !foundPlayers.map((y) => y.player).includes(x.id)).length} Spielern
                kein Index gefunden
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {payload.users
                  .filter((x) => !foundPlayers.map((y) => y.player).includes(x.id))
                  .map((x) => (
                    <ListItem key={'name'} divider sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                        }}
                      >
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
                        <NumberField
                          value={players.find((y) => y.player === x.id)?.rg_index ?? 0}
                          step={10}
                          label="Initialer Index"
                          onValueChange={(val) => {
                            if (val && val >= 0) {
                              setPlayers([
                                ...players.filter((y) => x.id !== y.player),
                                {
                                  gender: 'm',
                                  player: x.id,
                                  name: x.name,
                                  ka_index: 0,
                                  pro_status: false,
                                  rg_index: val,
                                  created_at: '',
                                  rg_avatar_url: null,
                                  rg_id: null,
                                  rg_link: null,
                                  effective_rating_cached: 1000,
                                  hide_rating: false,
                                  display_name: null,
                                  linked_user_id: x.id,
                                  matches_played: 0,
                                },
                              ]);
                              setRounds([
                                ...rounds.map((z) => ({
                                  ...z,
                                  options: { ...z.options, players: players } as MatchmakingOptions,
                                })),
                              ]);
                            }
                          }}
                        />
                      </Box>
                    </ListItem>
                  ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ArrowDropDown />}>
            <Typography component="span">{`Spieler bearbeiten - ${players.length}`}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'start', width: '100%' }}>
                <Button
                  onClick={() => {
                    dialogs
                      .open(SearchAndSelectUserDialog, { usersToFilter: players.map((x) => x.player) })
                      .then((result) => {
                        if (result) {
                          supabase
                            .schema('games')
                            .from('players')
                            .select('*')
                            .in(
                              'player',
                              result.map((x) => x.id)
                            )
                            .then((res) => {
                              if (res.data) {
                                setPlayers([
                                  ...players.filter((x) => !result.map((x) => x.id).includes(x.player)),
                                  ...res.data.map((x) => ({
                                    ...x,
                                    name: result.find((y) => y.id === x.player)?.name,
                                  })),
                                ]);
                              }
                            });
                        }
                      });
                  }}
                >
                  Spieler hinzufügen
                </Button>
              </Box>
              <Divider />
              {players.map((x) => (
                <ListItem
                  key={x.player}
                  disableGutters
                  disablePadding
                  divider
                  secondaryAction={
                    <IconButton onClick={() => setPlayers(players.filter((y) => y.player !== x.player))}>
                      <Delete />
                    </IconButton>
                  }
                >
                  <ListItemText primary={x.name} secondary={'Index: ' + x.rg_index} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
        <Divider sx={{ my: 1 }} />
        {rounds.map((x, index) => (
          <Accordion key={index} defaultExpanded={index === 0} disableGutters>
            <AccordionSummary expandIcon={<ArrowDropDown />}>
              <Typography component="span">Runde {index + 1}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: 1 }}>
              <Accordion disableGutters>
                <AccordionSummary expandIcon={<ArrowDropDown />}>
                  <Typography component="span">Einstellungen</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <ListItem dense divider sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                    <FormControl fullWidth>
                      <Select
                        fullWidth
                        value={x.options.mode ?? 'balanced'}
                        onChange={(e) => {
                          setRounds([
                            ...rounds.map((z, i) =>
                              i === index
                                ? { ...z, options: { ...z.options, mode: e.target.value } as MatchmakingOptions }
                                : z
                            ),
                          ]);
                        }}
                      >
                        <MenuItem value={'balanced'}>Balanced</MenuItem>
                        <MenuItem value={'random'}>Random</MenuItem>
                      </Select>
                      <FormHelperText sx={{ ml: 0 }}>Spielmodus (heterogen/homogen)</FormHelperText>
                    </FormControl>
                  </ListItem>
                  <ListItem dense divider sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                    <FormControl fullWidth>
                      <Select
                        fullWidth
                        value={x.options.matchupMode ?? 'any'}
                        onChange={(e) => {
                          setRounds([
                            ...rounds.map((z, i) =>
                              i === index
                                ? { ...z, options: { ...z.options, matchupMode: e.target.value } as MatchmakingOptions }
                                : z
                            ),
                          ]);
                        }}
                      >
                        <MenuItem value={'any'}>Gemischt</MenuItem>
                        <MenuItem value={'separate'}>Herren / Damen</MenuItem>
                        <MenuItem value={'mixed'}>Mixed</MenuItem>
                      </Select>
                      <FormHelperText sx={{ ml: 0 }}>Teammodus</FormHelperText>
                    </FormControl>
                  </ListItem>
                  {index > 0 && (
                    <ListItem dense divider sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                      <ListItemAvatar>
                        <Checkbox
                          sx={{ pl: 0 }}
                          checked={x.options.benchFromLastMatchMustPlay}
                          onChange={(e) => {
                            console.log(rounds[index - 1].game.bench);
                            setRounds([
                              ...rounds.map((z, i) =>
                                i === index
                                  ? {
                                    ...z,
                                    options: {
                                      ...z.options,
                                      benchFromLastMatchMustPlay: e.target.checked,
                                      mustPlay: e.target.checked ? [...rounds[index - 1].game.bench] : [],
                                    } as MatchmakingOptions,
                                  }
                                  : z
                              ),
                            ]);
                          }}
                        />
                      </ListItemAvatar>
                      <ListItemText primary={'Setze zuvor ausgesetzte Spieler ein.'} />
                    </ListItem>
                  )}
                </AccordionDetails>
              </Accordion>
              <Accordion disableGutters>
                <AccordionSummary expandIcon={<ArrowDropDown />}>
                  <Typography component="span">Feste Teams</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {x.options.lockedTeams &&
                      x.options.lockedTeams?.map(([player1, player2]) => (
                        <Box
                          key={player1.player + player2.player}
                          sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden',
                              flexGrow: 1,
                              minWidth: 0,
                            }}
                          >
                            <Typography
                              sx={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {player1.name}
                            </Typography>
                            <Typography
                              sx={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {player2.name}
                            </Typography>
                          </Box>
                          <IconButton
                            onClick={() => {
                              setRounds([
                                ...rounds.map((z, i) =>
                                  i === index
                                    ? {
                                      game: z.game,
                                      options: {
                                        ...z.options,
                                        lockedTeams: (z.options.lockedTeams ?? []).filter(
                                          (y) => y[0].player !== player1.player && y[1].player !== player2.player
                                        ),
                                      } as MatchmakingOptions,
                                    }
                                    : z
                                ),
                              ]);
                              setPreSelectedPlayer1(null);
                              setPreSelectedPlayer2(null);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      ))}
                    <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'end', width: '100%' }}>
                      <Select
                        size="small"
                        value={preSelectedPlayer1?.player ?? 'none'}
                        onChange={(e) =>
                          setPreSelectedPlayer1(players.find((y) => y.player === e.target.value) ?? null)
                        }
                      >
                        {players
                          .filter((y) => y.player !== preSelectedPlayer2?.player)
                          .filter((y) => !x.options.lockedTeams?.flatMap((x) => x).includes(y))
                          .map((z) => (
                            <MenuItem key={z.player} value={z.player}>
                              {z.name}
                            </MenuItem>
                          ))}
                        <MenuItem value={'none'}>Kein Nutzer</MenuItem>
                      </Select>
                      <Select
                        size="small"
                        value={preSelectedPlayer2?.player ?? 'none'}
                        onChange={(e) =>
                          setPreSelectedPlayer2(players.find((y) => y.player === e.target.value) ?? null)
                        }
                      >
                        {players
                          .filter((y) => y.player !== preSelectedPlayer1?.player)
                          .filter((y) => !x.options.lockedTeams?.flatMap((x) => x).includes(y))
                          .map((z) => (
                            <MenuItem key={z.player} value={z.player}>
                              {z.name}
                            </MenuItem>
                          ))}
                        <MenuItem value={'none'}>Kein Nutzer</MenuItem>
                      </Select>
                      <IconButton
                        onClick={() => {
                          if (!preSelectedPlayer1 || !preSelectedPlayer2) return;
                          setRounds([
                            ...rounds.map((z, i) =>
                              i === index
                                ? {
                                  game: z.game,
                                  options: {
                                    ...z.options,
                                    lockedTeams: [
                                      ...(z.options.lockedTeams ?? []),
                                      [preSelectedPlayer1, preSelectedPlayer2],
                                    ],
                                  } as MatchmakingOptions,
                                }
                                : z
                            ),
                          ]);
                          setPreSelectedPlayer1(null);
                          setPreSelectedPlayer2(null);
                        }}
                      >
                        <Save />
                      </IconButton>
                    </Box>
                  </List>
                </AccordionDetails>
              </Accordion>
              <Accordion disableGutters>
                <AccordionSummary expandIcon={<ArrowDropDown />}>
                  <Typography component="span">Feste Spieler</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {x.options.mustPlay &&
                      x.options.mustPlay?.map((player) => (
                        <Box
                          key={player.player}
                          sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden',
                              flexGrow: 1,
                              minWidth: 0,
                            }}
                          >
                            <Typography
                              sx={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {player.name}
                            </Typography>
                          </Box>
                          <IconButton
                            onClick={() => {
                              setRounds([
                                ...rounds.map((z, i) =>
                                  i === index
                                    ? {
                                      game: z.game,
                                      options: {
                                        ...z.options,
                                        mustPlay: (z.options.mustPlay ?? []).filter(
                                          (y) => y.player !== player.player
                                        ),
                                      } as MatchmakingOptions,
                                    }
                                    : z
                                ),
                              ]);
                              setPreMustPlay(null);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      ))}
                    <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'end', width: '100%' }}>
                      <Select
                        size="small"
                        value={preMustPlay?.player ?? 'none'}
                        onChange={(e) => setPreMustPlay(players.find((y) => y.player === e.target.value) ?? null)}
                      >
                        {players
                          .filter((y) => !x.options.mustPlay?.includes(y))
                          .filter((y) => !x.options.lockedTeams?.flatMap((x) => x).includes(y))
                          .map((z) => (
                            <MenuItem key={z.player} value={z.player}>
                              {z.name}
                            </MenuItem>
                          ))}
                        <MenuItem value={'none'}>Kein Nutzer</MenuItem>
                      </Select>
                      <IconButton
                        onClick={() => {
                          if (!preMustPlay) return;
                          setRounds([
                            ...rounds.map((z, i) =>
                              i === index
                                ? {
                                  game: z.game,
                                  options: {
                                    ...z.options,
                                    mustPlay: [...(z.options.mustPlay ?? []), preMustPlay],
                                  } as MatchmakingOptions,
                                }
                                : z
                            ),
                          ]);
                          setPreMustPlay(null);
                        }}
                      >
                        <Save />
                      </IconButton>
                    </Box>
                  </List>
                </AccordionDetails>
              </Accordion>
              <Accordion expanded={false} disableGutters>
                <AccordionSummary>
                  <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                    <Button
                      onClick={() => {
                        for (const match of x.game.matches) {
                          const [name1a, ...surname1a] = match[0].players[0].name!.split(' ');
                          const [name2a, ...surname2a] = match[0].players[1].name!.split(' ');
                          const [name1b, ...surname1b] = match[1].players[0].name!.split(' ');
                          const [name2b, ...surname2b] = match[1].players[1].name!.split(' ');
                          const team_a_name = (surname1a.pop() ?? name1a) + '/' + (surname2a.pop() ?? name2a);
                          const team_b_name = (surname1b.pop() ?? name1b) + '/' + (surname2b.pop() ?? name2b);

                          const team_a = {
                            name: team_a_name,
                            player_1: match[0].players[0].player,
                            player_1_rating: match[0].players[0].ka_index,
                            player_2: match[0].players[1].player,
                            player_2_rating: match[0].players[1].ka_index,
                          };
                          const team_b = {
                            name: team_b_name,
                            player_1: match[1].players[0].player,
                            player_1_rating: match[1].players[0].ka_index,
                            player_2: match[1].players[1].player,
                            player_2_rating: match[1].players[1].ka_index,
                          };
                          GamesRepository.reportScores([], team_a, team_b, payload.event.id).catch((error) => {
                            captureException(error, {
                              extra: { match, eventId: payload.event.id, team_a, team_b },
                              tags: { feature: 'constellations' },
                            });
                            notifications.show(error.message, { severity: 'error' });
                          });
                        }
                      }}
                    >
                      Matches erstellen
                    </Button>
                    <Button
                      onClick={() => {
                        const result = generateBalancedMatchesWithBench(x.options);
                        setRounds([
                          ...rounds.map((z, i) =>
                            i === index
                              ? {
                                game: result,
                                options: {
                                  ...z.options,
                                  ...(z.options.benchFromLastMatchMustPlay &&
                                    i > 0 && { mustPlay: rounds[i - 1].game.bench }),
                                },
                              }
                              : z
                          ),
                        ]);
                      }}
                    >
                      Generieren
                    </Button>
                  </Box>
                </AccordionSummary>
              </Accordion>
              {x.game.matches.map((y, index) => (
                <Accordion disableGutters key={index}>
                  <AccordionSummary expandIcon={<ArrowDropDown />}>
                    <ListItem disableGutters disablePadding sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                      <ListItemAvatar>
                        <Checkbox
                          checked={x.options.fixedMatches?.includes(y) ?? false}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked)
                              setRounds([
                                ...rounds.map((z, i) =>
                                  i === index
                                    ? {
                                      ...z,
                                      options: {
                                        ...z.options,
                                        fixedMatches: [...(z.options.fixedMatches ?? []), y],
                                      } as MatchmakingOptions,
                                    }
                                    : z
                                ),
                              ]);
                            else
                              setRounds([
                                ...rounds.map((z, i) =>
                                  i === index
                                    ? {
                                      ...z,
                                      options: {
                                        ...z.options,
                                        fixedMatches: z.options.fixedMatches?.filter((x) => x !== y),
                                      } as MatchmakingOptions,
                                    }
                                    : z
                                ),
                              ]);
                          }}
                        />
                      </ListItemAvatar>
                      <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', alignItems: 'center' }}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            flexGrow: 1,
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            sx={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {y[0].players.map((x) => x.name?.split(' ')[0] ?? x.rg_id).join(' + ')}
                          </Typography>
                          <Typography
                            sx={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {y[1].players.map((x) => x.name?.split(' ')[0] ?? x.rg_id).join(' + ')}
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                      <Stack
                        direction="column"
                        sx={{
                          width: '50%',
                          minWidth: 0, // nötig für ellipsis
                          overflow: 'hidden',
                        }}
                      >
                        <Typography
                          sx={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {`${y[0].players[0].name} (${y[0].players[0].rg_id})`}
                        </Typography>
                        <Typography
                          sx={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {`${y[0].players[1].name} (${y[0].players[1].rg_id})`}
                        </Typography>
                        <Typography
                          sx={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {`${y[0].adjustedStrength} (${y[0].strength})`}
                        </Typography>
                      </Stack>
                      <Stack
                        direction="column"
                        sx={{
                          width: '50%',
                          minWidth: 0, // nötig für ellipsis
                          overflow: 'hidden',
                        }}
                      >
                        <Typography
                          sx={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {`${y[1].players[0].name} (${y[1].players[0].rg_id})`}
                        </Typography>
                        <Typography
                          sx={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {`${y[1].players[1].name} (${y[1].players[1].rg_id})`}
                        </Typography>
                        <Typography
                          sx={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {`${y[1].adjustedStrength} (${y[1].strength})`}
                        </Typography>
                      </Stack>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
              {x.game.bench.length > 0 && (
                <Accordion disableGutters>
                  <AccordionSummary expandIcon={<ArrowDropDown />}>
                    <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', alignItems: 'center' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          flexGrow: 1,
                          minWidth: 0,
                        }}
                      >
                        <Typography
                          sx={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          Aussetzer
                        </Typography>
                        <Typography
                          sx={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {x.game.bench.map((x) => x.name).join(', ')}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {x.game.bench.map((x) => (
                      <ListItem key={x.player} dense disableGutters sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                        <ListItemText primary={x.name} secondary={x.rg_id} />
                      </ListItem>
                    ))}
                  </AccordionDetails>
                </Accordion>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
        <ListItem
          sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}
          secondaryAction={
            <Button
              onClick={() => {
                if (players.length !== payload.users.length) {
                  notifications.show('Einige Spieler haben einen ungültigen Index. Bitte passe diese an.', {
                    severity: 'error',
                  });
                  return;
                }
                const options = {
                  mode: 'balanced',
                  matchupMode: 'any',
                  players,
                } as MatchmakingOptions;
                const result = generateBalancedMatchesWithBench(options);
                setRounds([
                  ...rounds,
                  {
                    game: result,
                    options,
                  },
                ]);
              }}
            >
              Neue Runde
            </Button>
          }
        ></ListItem>
      </List>
    </>
  );
};

export const ConstellationCreationDialog = ({
  payload,
  open,
  onClose,
}: DialogProps<ConstellationCreationDialogProps, null>) => {
  return (
    <Dialog fullScreen open={open} onClose={() => onClose(null)}>
      <NotificationsProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={customEnLocale}>
          <Content onClose={onClose} open={open} payload={payload} />
        </LocalizationProvider>
      </NotificationsProvider>
    </Dialog>
  );
};
