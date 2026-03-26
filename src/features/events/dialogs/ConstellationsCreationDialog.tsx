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
  users: { id: string; name: string }[];
  event: EventsUserView;
};

export type TeamType = 'men' | 'women' | 'mixed';

export interface Team {
  players: [PlayerWithUser, PlayerWithUser];
  strength: number;
  type: TeamType;
  teamId: string;
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
  maxStrengthDifference?: number;
  fixedMatches?: Match[];
  benchFromLastMatchMustPlay?: boolean;
}

const getTeamId = (p1: PlayerWithUser, p2: PlayerWithUser) => [p1.player, p2.player].sort().join('-');

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function determineTeamType(players: [PlayerWithUser, PlayerWithUser]): TeamType {
  const genders = players.map((p) => p.gender);
  if (genders.every((g) => g === 'w')) return 'women';
  if (genders.every((g) => g === 'm')) return 'men';
  return 'mixed';
}

function createTeam(p1: PlayerWithUser, p2: PlayerWithUser): Team {
  const base = ((p1.rg_index ?? 1000) + (p2.rg_index ?? 1000)) / 2;
  return {
    players: [p1, p2],
    strength: Math.floor(base),
    type: determineTeamType([p1, p2]),
    teamId: getTeamId(p1, p2),
  };
}

// --- ALGORITHMUS ---
export function generateMatches(options: MatchmakingOptions): MatchResult {
  const {
    players,
    lockedTeams = [],
    mustPlay = [],
    mode = 'balanced',
    matchupMode = 'any',
    fixedMatches = [],
  } = options;

  let availablePlayers = [...players];
  const finalMatches: Match[] = [...fixedMatches];

  const playersInFixed = new Set(
    fixedMatches.flatMap((m) => [...m[0].players, ...m[1].players].map((p) => p.player))
  );
  availablePlayers = availablePlayers.filter((p) => !playersInFixed.has(p.player));

  const mustPlayIds = new Set(mustPlay.map((p) => p.player));
  availablePlayers.sort((a, b) => {
    if (mustPlayIds.has(a.player) && !mustPlayIds.has(b.player)) return -1;
    if (!mustPlayIds.has(a.player) && mustPlayIds.has(b.player)) return 1;
    return Math.random() - 0.5;
  });

  const teams: Team[] = [];
  const usedPlayersForTeams = new Set<string>();

  lockedTeams.forEach(([p1, p2]) => {
    if (
      availablePlayers.some((p) => p.player === p1.player) &&
      availablePlayers.some((p) => p.player === p2.player) &&
      !usedPlayersForTeams.has(p1.player) &&
      !usedPlayersForTeams.has(p2.player)
    ) {
      teams.push(createTeam(p1, p2));
      usedPlayersForTeams.add(p1.player);
      usedPlayersForTeams.add(p2.player);
    }
  });

  const freePlayers = availablePlayers.filter((p) => !usedPlayersForTeams.has(p.player));

  if (mode === 'balanced') {
    freePlayers.sort((a, b) => (b.rg_index ?? 1000) - (a.rg_index ?? 1000));
    while (freePlayers.length >= 2) {
      const p1 = freePlayers.shift()!;
      const indexToPick = Math.min(Math.floor(Math.random() * 2), freePlayers.length - 1);
      const p2 = freePlayers.splice(indexToPick, 1)[0];
      teams.push(createTeam(p1, p2));
    }
  } else {
    shuffle(freePlayers);
    while (freePlayers.length >= 2) {
      teams.push(createTeam(freePlayers.shift()!, freePlayers.shift()!));
    }
  }

  const benchedPlayers = freePlayers;

  const scoreMatch = (t1: Team, t2: Team): number => {
    if (mode === 'random') return Math.random();

    let score = 10000;
    const diff = Math.abs(t1.strength - t2.strength);
    score -= diff;

    if (t1.type !== t2.type) {
      if (matchupMode === 'separate') return -99999;
      if (matchupMode === 'mixed') {
        if (t1.type !== 'mixed' || t2.type !== 'mixed') return -99999;
      }
      score -= 500;
    }
    return score;
  };

  const availableTeams = [...teams];

  while (availableTeams.length >= 2) {
    const t1 = availableTeams.shift()!;
    let bestMatchIndex = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < availableTeams.length; i++) {
      const t2 = availableTeams[i];
      const currentScore = scoreMatch(t1, t2);
      const noise = Math.random() * 10;

      if (currentScore + noise > bestScore) {
        bestScore = currentScore;
        bestMatchIndex = i;
      }
    }

    if (bestMatchIndex !== -1 && bestScore > -50000) {
      const t2 = availableTeams.splice(bestMatchIndex, 1)[0];
      finalMatches.push([t1, t2]);
    } else {
      benchedPlayers.push(...t1.players);
    }
  }

  availableTeams.forEach(team => benchedPlayers.push(...team.players));

  return {
    matches: finalMatches,
    bench: benchedPlayers,
  };
}

export type PlayerWithUser = GamesTable<'players'> & {
  name?: string;
};

// --- UI COMPONENT ---
const Content = ({ payload, onClose }: DialogProps<ConstellationCreationDialogProps, null>) => {
  const notifications = useNotifications();
  const dialogs = useDialogs();

  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<PlayerWithUser[]>([]);
  const [foundPlayers, setFoundPlayers] = useState<PlayerWithUser[]>([]);

  const [preSelectedPlayer1, setPreSelectedPlayer1] = useState<PlayerWithUser | null>(null);
  const [preSelectedPlayer2, setPreSelectedPlayer2] = useState<PlayerWithUser | null>(null);
  const [preMustPlay, setPreMustPlay] = useState<PlayerWithUser | null>(null);

  const [rounds, setRounds] = useState<{ game: MatchResult; options: MatchmakingOptions }[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .schema('games')
        .from('players')
        .select('*')
        .in('player', payload.users.map((x) => x.id));

      if (error) {
        notifications.show('Fehler beim Laden der Spielerdaten', { severity: 'error' });
        setLoading(false);
        return;
      }

      if (data) {
        const loadedPlayers = data.map((x) => ({
          ...x,
          name: payload.users.find((y) => y.id === x.player)?.name,
        }));
        setPlayers(loadedPlayers);
        setFoundPlayers(loadedPlayers);

        setRounds([
          {
            game: { matches: [], bench: [] },
            options: {
              players: loadedPlayers,
              mode: 'balanced',
              matchupMode: 'any',
            },
          },
        ]);
      }
      setLoading(false);
    };
    fetchPlayers();
  }, [payload, notifications]);

  // HELPER: Option einer bestimmten Runde sicher updaten
  const updateRoundOption = (roundIndex: number, updates: Partial<MatchmakingOptions>) => {
    setRounds(prevRounds => prevRounds.map((r, i) =>
      i === roundIndex ? { ...r, options: { ...r.options, ...updates } } : r
    ));
  };

  // HELPER: Matches in Supabase speichern
  const handleSaveMatches = async (roundIndex: number) => {
    const currentRound = rounds[roundIndex];
    let hasError = false;

    for (const match of currentRound.game.matches) {
      try {
        const t1Name = `${match[0].players[0].name?.split(' ')[0]}/${match[0].players[1].name?.split(' ')[0]}`;
        const t2Name = `${match[1].players[0].name?.split(' ')[0]}/${match[1].players[1].name?.split(' ')[0]}`;

        const team_a = {
          name: t1Name,
          player_1: match[0].players[0].player,
          player_1_rating: match[0].players[0].ka_index,
          player_2: match[0].players[1].player,
          player_2_rating: match[0].players[1].ka_index,
        };
        const team_b = {
          name: t2Name,
          player_1: match[1].players[0].player,
          player_1_rating: match[1].players[0].ka_index,
          player_2: match[1].players[1].player,
          player_2_rating: match[1].players[1].ka_index,
        };

        await GamesRepository.reportScores({
          sets: [],
          team_a, team_b,
          event: payload.event.id,
          is_public: true,
          player_names: {
            [match[0].players[0].player]: match[0].players[0].name ?? '',
            [match[0].players[1].player]: match[0].players[1].name ?? '',
            [match[1].players[0].player]: match[1].players[0].name ?? '',
            [match[1].players[1].player]: match[1].players[1].name ?? '',
          }
        });
      } catch (error: any) {
        hasError = true;
        captureException(error, { extra: { match, eventId: payload.event.id } });
        notifications.show(`Fehler bei einem Match: ${error.message}`, { severity: 'error' });
      }
    }

    if (!hasError) {
      notifications.show('Alle Matches der Runde erfolgreich erstellt!', { severity: 'success' });
    }
  };

  // HELPER: Matches für eine Runde generieren
  const handleGenerate = (roundIndex: number) => {
    setRounds(prevRounds => {
      const currentRound = prevRounds[roundIndex];
      let currentMustPlay = currentRound.options.mustPlay || [];

      // Bench aus vorheriger Runde übernehmen falls gewünscht
      if (currentRound.options.benchFromLastMatchMustPlay && roundIndex > 0) {
        const merged = [...currentMustPlay];
        prevRounds[roundIndex - 1].game.bench.forEach(p => {
          if (!currentMustPlay.some(existing => existing.player === p.player)) {
            merged.push(p);
          }
        });
        currentMustPlay = merged;
      }

      const optionsToRun: MatchmakingOptions = {
        ...currentRound.options,
        players: players, // Wir nutzen immer die aktuelle, globale Liste
        mustPlay: currentMustPlay
      };

      const newGame = generateMatches(optionsToRun);

      return prevRounds.map((r, i) => i === roundIndex ? { ...r, game: newGame, options: optionsToRun } : r);
    });
  };

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
        {loading && <p style={{ padding: '16px' }}>Lade Spielerdaten...</p>}

        {/* FEHLENDE INDEXE */}
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
                    <ListItem key={x.id} divider sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                      <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <Typography sx={{ textAlign: 'end', fontSize: '1rem', color: `rgba(0,0,0,1)`, fontWeight: '400' }}>
                          {x.name}
                        </Typography>
                        <NumberField
                          value={players.find((y) => y.player === x.id)?.rg_index ?? 0}
                          step={10}
                          label="Initialer Index"
                          onValueChange={(val) => {
                            if (val && val >= 0) {
                              setPlayers((prev) => [
                                ...prev.filter((y) => x.id !== y.player),
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

        {/* SPIELER BEARBEITEN */}
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
                            .in('player', result.map((x) => x.id))
                            .then((res) => {
                              if (res.data) {
                                setPlayers((prev) => [
                                  ...prev.filter((x) => !result.map((r) => r.id).includes(x.player)),
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

        {/* RUNDEN MAP */}
        {rounds.map((x, index) => (
          <Accordion key={index} defaultExpanded={index === 0} disableGutters>
            <AccordionSummary expandIcon={<ArrowDropDown />}>
              <Typography component="span" fontWeight="bold">Runde {index + 1}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: 1 }}>

              {/* EINSTELLUNGEN */}
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
                        onChange={(e) => updateRoundOption(index, { mode: e.target.value as 'balanced' | 'random' })}
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
                        onChange={(e) => updateRoundOption(index, { matchupMode: e.target.value as 'any' | 'separate' | 'mixed' })}
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
                          checked={x.options.benchFromLastMatchMustPlay ?? false}
                          onChange={(e) => updateRoundOption(index, { benchFromLastMatchMustPlay: e.target.checked })}
                        />
                      </ListItemAvatar>
                      <ListItemText primary={'Setze zuvor ausgesetzte Spieler ein.'} />
                    </ListItem>
                  )}
                </AccordionDetails>
              </Accordion>

              {/* FESTE TEAMS */}
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
                          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1, minWidth: 0 }}>
                            <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {player1.name}
                            </Typography>
                            <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {player2.name}
                            </Typography>
                          </Box>
                          <IconButton
                            onClick={() => {
                              updateRoundOption(index, {
                                lockedTeams: (x.options.lockedTeams ?? []).filter(
                                  (y) => y[0].player !== player1.player && y[1].player !== player2.player
                                ),
                              });
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
                        onChange={(e) => setPreSelectedPlayer1(players.find((y) => y.player === e.target.value) ?? null)}
                      >
                        {players
                          .filter((y) => y.player !== preSelectedPlayer2?.player)
                          .filter((y) => !x.options.lockedTeams?.flatMap((t) => t).includes(y))
                          .map((z) => (
                            <MenuItem key={z.player} value={z.player}>{z.name}</MenuItem>
                          ))}
                        <MenuItem value={'none'}>Kein Nutzer</MenuItem>
                      </Select>
                      <Select
                        size="small"
                        value={preSelectedPlayer2?.player ?? 'none'}
                        onChange={(e) => setPreSelectedPlayer2(players.find((y) => y.player === e.target.value) ?? null)}
                      >
                        {players
                          .filter((y) => y.player !== preSelectedPlayer1?.player)
                          .filter((y) => !x.options.lockedTeams?.flatMap((t) => t).includes(y))
                          .map((z) => (
                            <MenuItem key={z.player} value={z.player}>{z.name}</MenuItem>
                          ))}
                        <MenuItem value={'none'}>Kein Nutzer</MenuItem>
                      </Select>
                      <IconButton
                        onClick={() => {
                          if (!preSelectedPlayer1 || !preSelectedPlayer2) return;
                          updateRoundOption(index, {
                            lockedTeams: [...(x.options.lockedTeams ?? []), [preSelectedPlayer1, preSelectedPlayer2]],
                          });
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

              {/* FESTE SPIELER */}
              <Accordion disableGutters>
                <AccordionSummary expandIcon={<ArrowDropDown />}>
                  <Typography component="span">Feste Spieler (Must Play)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {x.options.mustPlay &&
                      x.options.mustPlay?.map((player) => (
                        <Box key={player.player} sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1, minWidth: 0 }}>
                            <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {player.name}
                            </Typography>
                          </Box>
                          <IconButton
                            onClick={() => {
                              updateRoundOption(index, {
                                mustPlay: (x.options.mustPlay ?? []).filter((y) => y.player !== player.player),
                              });
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
                          .filter((y) => !x.options.lockedTeams?.flatMap((t) => t).includes(y))
                          .map((z) => (
                            <MenuItem key={z.player} value={z.player}>{z.name}</MenuItem>
                          ))}
                        <MenuItem value={'none'}>Kein Nutzer</MenuItem>
                      </Select>
                      <IconButton
                        onClick={() => {
                          if (!preMustPlay) return;
                          updateRoundOption(index, {
                            mustPlay: [...(x.options.mustPlay ?? []), preMustPlay]
                          });
                          setPreMustPlay(null);
                        }}
                      >
                        <Save />
                      </IconButton>
                    </Box>
                  </List>
                </AccordionDetails>
              </Accordion>

              {/* ACTION BUTTONS (GENERATE / SAVE) */}
              <Accordion expanded={false} disableGutters>
                <AccordionSummary>
                  <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveMatches(index);
                      }}
                      disabled={x.game.matches.length === 0}
                    >
                      Matches speichern
                    </Button>
                    <Button
                      variant="contained"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerate(index);
                      }}
                    >
                      Generieren
                    </Button>
                  </Box>
                </AccordionSummary>
              </Accordion>

              {/* MATCHES ANZEIGE */}
              {x.game.matches.map((matchData, matchIndex) => (
                <Accordion disableGutters key={matchIndex}>
                  <AccordionSummary expandIcon={<ArrowDropDown />}>
                    <ListItem disableGutters disablePadding sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                      <ListItemAvatar>
                        <Checkbox
                          checked={x.options.fixedMatches?.includes(matchData) ?? false}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              updateRoundOption(index, { fixedMatches: [...(x.options.fixedMatches ?? []), matchData] });
                            } else {
                              updateRoundOption(index, { fixedMatches: x.options.fixedMatches?.filter((m) => m !== matchData) });
                            }
                          }}
                        />
                      </ListItemAvatar>
                      <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1, minWidth: 0 }}>
                          <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {matchData[0].players.map((p) => p.name?.split(' ')[0] ?? p.rg_id).join(' + ')}
                          </Typography>
                          <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {matchData[1].players.map((p) => p.name?.split(' ')[0] ?? p.rg_id).join(' + ')}
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                      <Stack direction="column" sx={{ width: '50%', minWidth: 0, overflow: 'hidden' }}>
                        <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {`${matchData[0].players[0].name} (${matchData[0].players[0].rg_id})`}
                        </Typography>
                        <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {`${matchData[0].players[1].name} (${matchData[0].players[1].rg_id})`}
                        </Typography>
                        <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'bold' }}>
                          Team Index: {matchData[0].strength}
                        </Typography>
                      </Stack>
                      <Stack direction="column" sx={{ width: '50%', minWidth: 0, overflow: 'hidden' }}>
                        <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {`${matchData[1].players[0].name} (${matchData[1].players[0].rg_id})`}
                        </Typography>
                        <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {`${matchData[1].players[1].name} (${matchData[1].players[1].rg_id})`}
                        </Typography>
                        <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'bold' }}>
                          Team Index: {matchData[1].strength}
                        </Typography>
                      </Stack>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}

              {/* BENCH (AUSSETZER) ANZEIGE */}
              {x.game.bench.length > 0 && (
                <Accordion disableGutters>
                  <AccordionSummary expandIcon={<ArrowDropDown />}>
                    <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1, minWidth: 0 }}>
                        <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'bold', color: 'error.main' }}>
                          Aussetzer ({x.game.bench.length})
                        </Typography>
                        <Typography sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'text.secondary' }}>
                          {x.game.bench.map((p) => p.name?.split(' ')[0]).join(', ')}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {x.game.bench.map((p) => (
                      <ListItem key={p.player} dense disableGutters sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}>
                        <ListItemText primary={p.name} secondary={`Index: ${p.rg_index}`} />
                      </ListItem>
                    ))}
                  </AccordionDetails>
                </Accordion>
              )}
            </AccordionDetails>
          </Accordion>
        ))}

        {/* NEUE RUNDE BUTTON */}
        <ListItem
          sx={{ '&.MuiListItem-root': { paddingLeft: 0, marginTop: 2 } }}
          secondaryAction={
            <Button
              variant="outlined"
              onClick={() => {
                if (players.length !== payload.users.length) {
                  notifications.show('Einige Spieler haben einen ungültigen Index. Bitte passe diese an.', { severity: 'error' });
                  return;
                }
                const options: MatchmakingOptions = {
                  mode: 'balanced',
                  matchupMode: 'any',
                  players,
                };
                // Optionale Autogenerierung beim Erstellen der Runde:
                // const result = generateMatches(options); 
                setRounds([...rounds, { game: { matches: [], bench: [] }, options }]);
              }}
            >
              Neue Runde hinzufügen
            </Button>
          }
        />
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