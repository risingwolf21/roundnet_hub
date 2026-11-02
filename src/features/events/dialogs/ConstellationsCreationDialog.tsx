import { supabase } from '@/lib/supabase';
import { GamesRepository } from '@/repository/GamesRepository';
import { EventsUserView, GamesTable } from '@/types/supabaseTypes';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { DialogProps, useDialogs } from '@/contexts/DialogsProvider';
import { cn } from '@/lib/utils';
import { captureException } from '@sentry/react';
import { ChevronDownIcon, Plus, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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

// Legacy users have player = user id, newer users are linked via linked_user_id.
export const userIdOfPlayer = (player: GamesTable<'players'>) => player.linked_user_id ?? player.player;
export const playersOfUsersFilter = (userIds: string[]) =>
  `linked_user_id.in.(${userIds.join(',')}),player.in.(${userIds.join(',')})`;

export const ConstellationCreationDialog = ({
  payload,
  open,
  onClose,
}: DialogProps<ConstellationCreationDialogProps, null>) => {

  console.log(payload)

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
        .or(playersOfUsersFilter(payload.users.map((x) => x.id)));

      if (error) {
        toast.error('Fehler beim Laden der Spielerdaten');
        setLoading(false);
        return;
      }

      if (data) {
        const loadedPlayers = data.map((x) => ({
          ...x,
          name: payload.users.find((y) => y.id === userIdOfPlayer(x))?.name,
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
  }, [payload]);

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
        toast.error(`Fehler bei einem Match: ${error.message}`);
      }
    }

    if (!hasError) {
      toast.success('Alle Matches der Runde erfolgreich erstellt!');
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant={"fullscreen"}>
        <DialogHeader variant={"appbar"}>
          <DialogTitle>Konstellationen</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <DialogBody className='p-0'>
          <div className='p-2 flex flex-col gap-2'>
            {loading && <p style={{ padding: '16px' }}>Lade Spielerdaten...</p>}

            {/* FEHLENDE INDEXE */}
            {payload.users.filter((x) => !foundPlayers.map(userIdOfPlayer).includes(x.id)).length > 0 && (
              <Card className="w-full py-1">
                <CardContent className='px-1'>
                  <Collapsible>
                    <CollapsibleTrigger render={<Button variant="ghost" className="w-full">
                      Von {payload.users.filter((x) => !foundPlayers.map(userIdOfPlayer).includes(x.id)).length} Spielern
                      kein Index gefunden
                      <ChevronDownIcon className="ml-auto group-data-panel-open/button:rotate-180" /></Button>} />
                    <CollapsibleContent className={"w-full"}>
                      <div>
                        {payload.users
                          .filter((x) => !foundPlayers.map(userIdOfPlayer).includes(x.id))
                          .map((x) => (
                            <Item key={x.id} variant={"outline"}>
                              <ItemContent className='flex flex-row'>
                                <ItemTitle className='flex-1'>{x.name}</ItemTitle>
                                <ItemDescription>
                                  <Input
                                    className='w-32'
                                    type='number'
                                    value={players.find((y) => userIdOfPlayer(y) === x.id)?.rg_index ?? 0}
                                    onChange={(e) => {
                                      const parsed = Number.parseInt(e.target.value);
                                      if (!Number.isNaN(parsed) && parsed >= 0) {
                                        setPlayers((prev) => [
                                          ...prev.filter((y) => x.id !== userIdOfPlayer(y)),
                                          {
                                            gender: 'm',
                                            player: x.id,
                                            name: x.name,
                                            ka_index: 0,
                                            pro_status: false,
                                            rg_index: parsed,
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
                                    step={10}
                                    placeholder="Initialer Index" />
                                </ItemDescription>
                              </ItemContent>
                            </Item>
                          ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            )
            }

            {/* SPIELER BEARBEITEN */}
            <Card className="w-full py-1">
              <CardContent className='px-1'>
                <Collapsible >
                  <CollapsibleTrigger render={<Button variant="ghost" className="w-full">{`Spieler bearbeiten - ${players.length}`}
                    <ChevronDownIcon className="ml-auto group-data-panel-open/button:rotate-180" /></Button>} />
                  <CollapsibleContent className="flex flex-col w-full gap-2 p-2.5 pt-2">

                    <div>
                      <Button
                        className={"w-full"}
                        variant={"outline"}
                        onClick={() => {
                          dialogs
                            .selectMultipleUser(players.map(userIdOfPlayer))
                            .then((result) => {
                              if (result) {
                                supabase
                                  .schema('games')
                                  .from('players')
                                  .select('*')
                                  .or(playersOfUsersFilter(result.map((x) => x.id)))
                                  .then((res) => {
                                    if (res.data) {
                                      setPlayers((prev) => [
                                        ...prev.filter((x) => !result.map((r) => r.id).includes(userIdOfPlayer(x))),
                                        ...res.data.map((x) => ({
                                          ...x,
                                          name: result.find((y) => y.id === userIdOfPlayer(x))?.name,
                                        })),
                                      ]);
                                    }
                                  });
                              }
                            });
                        }}
                      >
                        <Plus />
                        Spieler hinzufügen
                      </Button>

                      {players.map((x) => (
                        <Item key={x.player}>
                          <ItemContent className='flex w-full flex-row justify-between'>
                            <ItemTitle>{x.name}</ItemTitle>
                            <ItemDescription>{'Index: ' + x.rg_index}</ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <Button variant={"ghost"} size={"icon-lg"}
                              onClick={() => setPlayers(players.filter((y) => y.player !== x.player))}>
                              <Trash2 />
                            </Button>
                          </ItemActions>
                        </Item>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            <Separator />

            {/* RUNDEN MAP */}
            {rounds.map((x, index) => (
              <Card key={index} className="w-full py-1">
                <CardContent className='px-1'>
                  <Collapsible >
                    <CollapsibleTrigger render={<Button variant="ghost" className="w-full">Runde {index + 1}
                      <ChevronDownIcon className="ml-auto group-data-panel-open/button:rotate-180" /></Button>} />
                    <CollapsibleContent className="flex flex-col w-full gap-2 pt-2">

                      <Collapsible >
                        <CollapsibleTrigger render={<Button variant="ghost" className="w-full">Einstellungen
                          <ChevronDownIcon className="ml-auto group-data-panel-open/button:rotate-180" /></Button>} />
                        <CollapsibleContent className="flex flex-col w-full gap-2 p-2.5 pt-2">
                          <Field>
                            <FieldLabel htmlFor='gameMode'>
                              Spielmodus (heterogen/homogen)
                            </FieldLabel>
                            <Select id='gameMode'
                              value={x.options.mode ?? 'balanced'}
                              items={{ random: "Zufällig", balanced: "Ausgeglichen" }}
                              onValueChange={(val) => updateRoundOption(index, { mode: val as 'balanced' | 'random' })}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem key={'balanced'} value={'balanced'}>
                                  Ausgeglichen
                                </SelectItem>
                                <SelectItem key={'random'} value={'random'}>
                                  Zufällig
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>

                          <Field className='w-full'>
                            <FieldLabel htmlFor='gameMode'>
                              Teammodus
                            </FieldLabel>
                            <Select id='gameMode'
                              value={x.options.matchupMode ?? 'any'}
                              items={{ any: "Gemischt", separate: "Herren / Damen", mixed: "Mixed" }}
                              onValueChange={(val) => updateRoundOption(index, { matchupMode: val as 'any' | 'separate' | 'mixed' })}>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem key={'any'} value={'any'}>
                                  Gemischt
                                </SelectItem>
                                <SelectItem key={'separate'} value={'separate'}>
                                  Herren / Damen
                                </SelectItem>
                                <SelectItem key={'mixed'} value={'mixed'}>
                                  Mixed
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>

                          {
                            index > 0 && <Field orientation={"horizontal"}>
                              <FieldLabel>Setze zuvor ausgesetzte Spieler ein.</FieldLabel>
                              <Switch
                                checked={x.options.benchFromLastMatchMustPlay ?? false}
                                onCheckedChange={(val) => updateRoundOption(index, { benchFromLastMatchMustPlay: val })} />
                            </Field>
                          }

                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible >
                        <CollapsibleTrigger render={<Button variant="ghost" className="w-full">Feste Teams ({x.options.lockedTeams?.length ?? 0})
                          <ChevronDownIcon className="ml-auto group-data-panel-open/button:rotate-180" /></Button>} />
                        <CollapsibleContent className="flex flex-col w-full gap-2 p-2.5 pt-2">
                          {x.options.lockedTeams &&
                            x.options.lockedTeams?.map(([player1, player2]) => (
                              <div
                                key={player1.player + player2.player}
                                className='flex flex-row justify-between w-full'>
                                <div className='flex flex-col overflow-hidden w-full'>
                                  <div className='whitespace-nowrap overflow-hidden text-ellipsis'>
                                    {player1.name}
                                  </div>
                                  <div className='whitespace-nowrap overflow-hidden text-ellipsis'>
                                    {player2.name}
                                  </div>
                                </div>
                                <Button
                                  variant={"outline"}
                                  size={"icon-lg"}
                                  onClick={() => {
                                    updateRoundOption(index, {
                                      lockedTeams: (x.options.lockedTeams ?? []).filter(
                                        (y) => y[0].player !== player1.player && y[1].player !== player2.player
                                      ),
                                    });
                                  }}
                                >
                                  <Trash2 />
                                </Button>
                              </div>
                            ))
                          }
                          <div className='flex flex-row w-full gap-2'>
                            <Field className='flex-1'>
                              <FieldLabel>Spieler 1</FieldLabel>
                              <Select
                                value={preSelectedPlayer1?.player ?? 'none'}
                                items={players
                                  .filter((y) => y.player !== preSelectedPlayer2?.player)
                                  .filter((y) => !x.options.lockedTeams?.flatMap((t) => t).includes(y))
                                  .reduce((a, c) => a = ({ ...a, [c.player]: [c.name] }), {})}
                                onValueChange={(val) => setPreSelectedPlayer1(players.find((y) => y.player === val) ?? null)}>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {
                                    players
                                      .filter((y) => y.player !== preSelectedPlayer2?.player)
                                      .filter((y) => !x.options.lockedTeams?.flatMap((t) => t).includes(y))
                                      .map((x) => (
                                        <SelectItem key={x.player} value={x.player}>{x.name}</SelectItem>
                                      ))
                                  }
                                </SelectContent>
                              </Select>

                            </Field>
                            <Field className='flex-1'>
                              <FieldLabel>Spieler 2</FieldLabel>
                              <Select
                                value={preSelectedPlayer2?.player ?? 'none'}
                                items={players
                                  .filter((y) => y.player !== preSelectedPlayer1?.player)
                                  .filter((y) => !x.options.lockedTeams?.flatMap((t) => t).includes(y))
                                  .reduce((a, c) => a = ({ ...a, [c.player]: [c.name] }), {})}
                                onValueChange={(val) => setPreSelectedPlayer2(players.find((y) => y.player === val) ?? null)}>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {
                                    players
                                      .filter((y) => y.player !== preSelectedPlayer1?.player)
                                      .filter((y) => !x.options.lockedTeams?.flatMap((t) => t).includes(y))
                                      .map((x) => (
                                        <SelectItem key={x.player} value={x.player}>{x.name}</SelectItem>
                                      ))
                                  }
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field className='w-12'>
                              <FieldLabel className='invisible'>S</FieldLabel>
                              <Button variant={"outline"} size={"icon-lg"} onClick={() => {
                                if (!preSelectedPlayer1 || !preSelectedPlayer2) return;
                                updateRoundOption(index, {
                                  lockedTeams: [...(x.options.lockedTeams ?? []), [preSelectedPlayer1, preSelectedPlayer2]],
                                });
                                setPreSelectedPlayer1(null);
                                setPreSelectedPlayer2(null);
                              }}>
                                <Save />
                              </Button>
                            </Field>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible >
                        <CollapsibleTrigger render={<Button variant="ghost" className="w-full">Feste Spieler ({x.options.lockedTeams?.length ?? 0})
                          <ChevronDownIcon className="ml-auto group-data-panel-open/button:rotate-180" /></Button>} />
                        <CollapsibleContent className="flex flex-col w-full gap-2 p-2.5 pt-2">

                          {x.options.mustPlay &&
                            x.options.mustPlay?.map((player) => (
                              <div key={player.player}
                                className='flex flex-row justify-between w-full'>
                                <div
                                  className='flex flex-col overflow-hidden flex-grow'>
                                  <div className='truncate'>
                                    {player.name}
                                  </div>
                                </div>
                                <Button
                                  variant={"outline"}
                                  size={"icon-lg"}
                                  onClick={() => {
                                    updateRoundOption(index, {
                                      mustPlay: (x.options.mustPlay ?? []).filter((y) => y.player !== player.player),
                                    });
                                  }}
                                >
                                  <Trash2 />
                                </Button>
                              </div>
                            ))}

                          <div className='flex flex-row w-full gap-2'>
                            <Field className='flex-1'>
                              <FieldLabel>Spieler</FieldLabel>
                              <Select
                                value={preMustPlay?.player ?? 'none'}
                                items={players
                                  .filter((y) => !x.options.mustPlay?.includes(y))
                                  .filter((y) => !x.options.lockedTeams?.flatMap((t) => t).includes(y))
                                  .reduce((a, c) => a = ({ ...a, [c.player]: [c.name] }), {})}
                                onValueChange={(val) => setPreMustPlay(players.find((y) => y.player === val) ?? null)}>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {
                                    players
                                      .filter((y) => !x.options.mustPlay?.includes(y))
                                      .filter((y) => !x.options.lockedTeams?.flatMap((t) => t).includes(y))
                                      .map((x) => (
                                        <SelectItem key={x.player} value={x.player}>{x.name}</SelectItem>
                                      ))
                                  }
                                </SelectContent>
                              </Select>

                            </Field>
                            <Field className='w-12'>
                              <FieldLabel className='invisible'>S</FieldLabel>
                              <Button variant={"outline"} size={"icon-lg"} onClick={() => {
                                if (!preMustPlay) return;
                                updateRoundOption(index, {
                                  mustPlay: [...(x.options.mustPlay ?? []), preMustPlay]
                                });
                                setPreMustPlay(null);
                              }}>
                                <Save />
                              </Button>
                            </Field>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Separator />

                      <div className='flex flex-row w-full gap-2'>
                        <Button
                          className={"flex-1"}
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveMatches(index);
                          }}
                          disabled={x.game.matches.length === 0}
                        >
                          <Save />
                          Matches speichern
                        </Button>

                        <Button
                          className={"flex-1"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerate(index);
                          }}
                        >
                          <RefreshCcw />
                          Generieren
                        </Button>
                      </div>

                      <Separator />

                      <Collapsible >
                        <CollapsibleTrigger render={<Button variant="ghost" className="w-full">Spiele ({x.game.matches.length})
                          <ChevronDownIcon className="ml-auto group-data-panel-open/button:rotate-180" /></Button>} />
                        <CollapsibleContent className="flex flex-col w-full gap-2 p-2.5 pt-2">
                          {
                            x.game.matches.map((matchData, matchIndex) => (
                              <Item key={matchIndex} className="w-full" variant={"outline"}>
                                <ItemContent className=''>
                                  <div className='flex flex-col overflow-hidden w-full'>
                                    <div className='whitespace-nowrap overflow-hidden text-ellipsis'>
                                      {matchData[0].players.map((p) => p.name?.split(' ')[0] ?? p.rg_id).join(' + ')}
                                    </div>
                                    <div className='whitespace-nowrap overflow-hidden text-ellipsis'>
                                      {matchData[1].players.map((p) => p.name?.split(' ')[0] ?? p.rg_id).join(' + ')}
                                    </div>
                                  </div>
                                </ItemContent>
                                <ItemActions>
                                  <Switch
                                    checked={x.options.fixedMatches?.includes(matchData) ?? false}
                                    onCheckedChange={(val) => {
                                      if (val) {
                                        updateRoundOption(index, { fixedMatches: [...(x.options.fixedMatches ?? []), matchData] });
                                      } else {
                                        updateRoundOption(index, { fixedMatches: x.options.fixedMatches?.filter((m) => m !== matchData) });
                                      }
                                    }}
                                  />
                                </ItemActions>
                              </Item>
                            ))
                          }

                        </CollapsibleContent>
                      </Collapsible>

                      <Collapsible className={cn(x.game.bench.length < 1 && "hidden")}>
                        <CollapsibleTrigger render={<Button variant="ghost" className="w-full">
                          Aussetzer ({x.game.bench.length})
                          <ChevronDownIcon className="ml-auto group-data-panel-open/button:rotate-180" /></Button>} />
                        <CollapsibleContent className="flex flex-col w-full gap-2 p-2.5 pt-2">
                          {
                            x.game.bench.map((benchData, benchIndex) => (
                              <Item key={benchIndex} className="w-full" variant={"outline"}>
                                <ItemContent className=''>
                                  <div className='flex flex-col overflow-hidden w-full'>
                                    <div className='whitespace-nowrap overflow-hidden text-ellipsis'>
                                      {benchData.name?.split(' ')[0] ?? benchData.rg_id}
                                    </div>
                                  </div>
                                </ItemContent>
                              </Item>
                            ))
                          }

                        </CollapsibleContent>
                      </Collapsible>

                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            ))
            }

            {/* NEUE RUNDE BUTTON */}
            <Button onClick={() => {
              if (players.length !== payload.users.length) {
                toast.error('Einige Spieler haben einen ungültigen Index. Bitte passe diese an.');
                return;
              }
              const options: MatchmakingOptions = {
                mode: 'balanced',
                matchupMode: 'any',
                players,
              };
              // Optionale Autogenerierung beim Erstellen der Runde:
              const result = generateMatches(options);
              setRounds([...rounds, { game: result, options }]);
            }}>
              Neue Runde hinzufügen
            </Button>
          </div >
        </DialogBody >
      </DialogContent >
    </Dialog >
  );
};