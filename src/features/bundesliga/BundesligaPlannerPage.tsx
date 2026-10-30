import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGrants } from '@/features/auth/GrantsContext';
import { useProfile } from '@/tanstack/user';
import { AlertTriangle, ChevronDown, RotateCcw, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EncounterEditor } from './components/EncounterEditor';
import {
  emptyLineup,
  type Encounter,
  type Gender,
  type Lineup,
  type Player,
  type Team,
} from './types';
import { gameCountsForDay, hasErrors, toPlayerMap, validateEncounter } from './lineup';
import { lineupKey, usePlannerState } from './store';
import type { ScrapedPlayer, ScrapedTeam } from './repository';
import { useLeagueData, useRosters } from './useBundesliga';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'M' },
  { value: 'female', label: 'W' },
  { value: 'unknown', label: '?' },
];

const mdLabel = (name: string, date: string | null, city: string | null) =>
  [name, city, date].filter(Boolean).join(' · ');

const BundesligaPlannerPage = () => {
  const { user } = useGrants();
  const { data: profile } = useProfile(user.id);
  const [state, patch] = usePlannerState();

  // My playerzone id is the numeric part of the account's RG-iD (e.g. "HEL6386" -> "6386").
  const myPlayerId = useMemo(() => profile?.player?.rg_id?.match(/\d+/)?.[0] ?? null, [profile]);

  const { data: leagueData, isLoading, isError, error } = useLeagueData(state.leagueId);
  const teams = useMemo<ScrapedTeam[]>(() => leagueData?.teams ?? [], [leagueData]);
  const leagues = leagueData?.leagues ?? [];
  const matchDays = useMemo(() => leagueData?.matchDays ?? [], [leagueData]);

  // Fetch rosters for the selected teams plus any rendered match-day teams (for auto-detect).
  const teamsNeedingRosters = useMemo(() => {
    const map = new Map<string, { teamId: string; teamVersionId: string }>();
    const add = (t: { teamId: string; teamVersionId: string }) =>
      map.set(t.teamId, { teamId: t.teamId, teamVersionId: t.teamVersionId });
    teams
      .filter((t) => t.teamId === state.ownTeamId || state.opponentIds.includes(t.teamId))
      .forEach(add);
    matchDays.forEach((md) => md.teams.forEach(add));
    return [...map.values()];
  }, [teams, matchDays, state.ownTeamId, state.opponentIds]);

  const { data: rostersData, isLoading: rostersLoading } = useRosters(teamsNeedingRosters);
  const rosters = useMemo(() => rostersData?.rosters ?? {}, [rostersData]);

  // Best-effort: if my RG-iD turns up in a rendered match day, pick my team + opponents for me.
  useEffect(() => {
    if (!myPlayerId || state.ownTeamId) return;
    for (const [teamId, players] of Object.entries(rosters)) {
      if (players.some((p) => p.id === myPlayerId)) {
        const md = matchDays.find((m) => m.teams.some((t) => t.teamId === teamId));
        patch({
          ownTeamId: teamId,
          ...(md
            ? {
                matchDayId: md.id,
                matchDayName: mdLabel(md.name, md.date, md.city),
                opponentIds: md.teams.filter((t) => t.teamId !== teamId).map((t) => t.teamId),
              }
            : {}),
        });
        break;
      }
    }
  }, [rosters, myPlayerId, state.ownTeamId, matchDays, patch]);

  const toDomain = (sp: ScrapedPlayer, teamId: string): Player => ({
    id: sp.id,
    name: sp.name,
    gender: state.genderOverrides[sp.id] ?? sp.gender,
    rgIndex: sp.rgIndex,
    avatarUrl: sp.avatarUrl,
    teamId,
  });

  const ownTeamCard = teams.find((t) => t.teamId === state.ownTeamId) ?? null;
  const myPlayers: Player[] = useMemo(
    () =>
      state.ownTeamId && rosters[state.ownTeamId]
        ? [...rosters[state.ownTeamId]]
            .map((sp) => toDomain(sp, state.ownTeamId!))
            .sort((a, b) => (b.rgIndex ?? 0) - (a.rgIndex ?? 0))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rosters, state.ownTeamId, state.genderOverrides]
  );
  const myPlayerMap = useMemo(() => toPlayerMap(myPlayers), [myPlayers]);

  const opponents: Team[] = useMemo(
    () =>
      state.opponentIds.map((id) => {
        const t = teams.find((tt) => tt.teamId === id);
        return {
          id,
          name: t?.name ?? id,
          logoUrl: t?.logoUrl ?? null,
          versionId: t?.teamVersionId,
          players: (rosters[id] ?? []).map((sp) => toDomain(sp, id)),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.opponentIds, teams, rosters]
  );

  const getLineup = (oppId: string): Lineup =>
    (state.ownTeamId && state.lineups[lineupKey(state.leagueId, state.ownTeamId, oppId)]) ||
    emptyLineup();

  const setLineup = (oppId: string, lineup: Lineup) =>
    patch((prev) => ({
      lineups: {
        ...prev.lineups,
        [lineupKey(prev.leagueId, prev.ownTeamId!, oppId)]: lineup,
      },
    }));

  const encounters: Encounter[] = opponents.map((o) => ({
    opponentTeamId: o.id,
    lineup: getLineup(o.id),
  }));
  const counts = gameCountsForDay(encounters);
  const issuesByOpp = Object.fromEntries(
    opponents.map((o) => [o.id, validateEncounter(getLineup(o.id), myPlayerMap)])
  );

  const [activeOpp, setActiveOpp] = useState<string | null>(null);
  useEffect(() => {
    if (opponents.length && !opponents.some((o) => o.id === activeOpp)) {
      setActiveOpp(opponents[0].id);
    }
  }, [opponents, activeOpp]);

  const selectLeague = (leagueId: string) =>
    patch({ leagueId, ownTeamId: null, matchDayId: null, matchDayName: null, opponentIds: [] });

  const selectOwnTeam = (teamId: string) => {
    const md = matchDays.find((m) => m.teams.some((t) => t.teamId === teamId));
    if (md) {
      patch({
        ownTeamId: teamId,
        matchDayId: md.id,
        matchDayName: mdLabel(md.name, md.date, md.city),
        opponentIds: md.teams.filter((t) => t.teamId !== teamId).map((t) => t.teamId),
      });
    } else {
      patch({ ownTeamId: teamId, matchDayId: 'manual', matchDayName: 'Manuell', opponentIds: [] });
    }
  };

  const toggleOpponent = (teamId: string) =>
    patch((prev) => ({
      matchDayId: 'manual',
      matchDayName: 'Manuell',
      opponentIds: prev.opponentIds.includes(teamId)
        ? prev.opponentIds.filter((x) => x !== teamId)
        : [...prev.opponentIds, teamId],
    }));

  const setGender = (playerId: string, gender: Gender) =>
    patch((prev) => ({ genderOverrides: { ...prev.genderOverrides, [playerId]: gender } }));

  const totalErrors = Object.values(issuesByOpp).filter((is) => hasErrors(is)).length;

  return (
    <div className="flex flex-col min-h-screen">
      <AppBar title="Bundesliga-Aufstellung" user={user} primaryAction="back" />

      <main className="flex-1 pb-safe-bottom px-4 pt-3 flex flex-col gap-4 max-w-2xl w-full mx-auto">
        {/* Setup */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spieltag einrichten</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Liga</label>
              <Select
                items={Object.fromEntries(
                  (leagues.length ? leagues : [{ id: state.leagueId, name: state.leagueId }]).map(
                    (l) => [l.id, l.name]
                  )
                )}
                value={state.leagueId}
                onValueChange={(v) => v && selectLeague(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Liga wählen" />
                </SelectTrigger>
                <SelectContent>
                  {(leagues.length ? leagues : [{ id: state.leagueId, name: state.leagueId }]).map(
                    (l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner /> Teams werden geladen…
              </div>
            )}
            {isError && (
              <p className="text-sm text-destructive">
                Konnte Ligadaten nicht laden: {String((error as Error)?.message ?? error)}
              </p>
            )}

            {!isLoading && !isError && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Mein Team</label>
                <Select
                  items={Object.fromEntries(teams.map((t) => [t.teamId, t.name]))}
                  value={state.ownTeamId ?? ''}
                  onValueChange={(v) => v && selectOwnTeam(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Team wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.teamId} value={t.teamId}>
                        {t.name}
                        {t.rgxTotal ? <span className="text-muted-foreground"> · {t.rgxTotal}</span> : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {state.ownTeamId && (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-muted-foreground">
                  Gegner {state.matchDayName ? `· ${state.matchDayName}` : ''}
                </label>
                <div className="flex flex-wrap gap-2">
                  {teams
                    .filter((t) => t.teamId !== state.ownTeamId)
                    .map((t) => {
                      const on = state.opponentIds.includes(t.teamId);
                      return (
                        <Button
                          key={t.teamId}
                          size="sm"
                          variant={on ? 'default' : 'outline'}
                          onClick={() => toggleOpponent(t.teamId)}
                        >
                          {t.name}
                        </Button>
                      );
                    })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {rostersLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Kader werden geladen…
          </div>
        )}

        {/* My squad + gender correction */}
        {myPlayers.length > 0 && (
          <Collapsible>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {ownTeamCard?.logoUrl && (
                      <Avatar className="size-6">
                        <AvatarImage src={ownTeamCard.logoUrl} alt={ownTeamCard.name} />
                        <AvatarFallback>{ownTeamCard.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                    )}
                    Mein Kader ({myPlayers.length})
                  </CardTitle>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    Geschlecht wird automatisch erkannt – hier bei Bedarf korrigieren (zählt für
                    Women &amp; Mixed).
                  </p>
                  {myPlayers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="size-7">
                          {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt={p.name} /> : null}
                          <AvatarFallback>{p.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{p.name}</span>
                        <span className="text-muted-foreground text-sm shrink-0">
                          {p.rgIndex ?? '—'}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {GENDERS.map((g) => (
                          <Button
                            key={g.value}
                            size="icon-sm"
                            variant={p.gender === g.value ? 'default' : 'outline'}
                            onClick={() => setGender(p.id, g.value)}
                          >
                            {g.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Game-count summary across the whole match day */}
        {myPlayers.length > 0 && opponents.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Trophy className="size-4" /> Spiele pro Spieler
                </span>
                {totalErrors > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="size-3" /> {totalErrors}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {myPlayers.map((p) => (
                <Badge key={p.id} variant={counts[p.id] ? 'secondary' : 'outline'}>
                  {p.name}: {counts[p.id] ?? 0}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Per-opponent lineup editors */}
        {myPlayers.length > 0 && opponents.length > 0 && activeOpp && (
          <Tabs value={activeOpp} onValueChange={setActiveOpp} className="w-full">
            <TabsList className="w-full">
              {opponents.map((o) => (
                <TabsTrigger key={o.id} value={o.id} className="flex-1">
                  {o.name}
                  {hasErrors(issuesByOpp[o.id] ?? []) && (
                    <AlertTriangle className="size-3 ml-1 text-destructive" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            {opponents.map((o) => (
              <TabsContent key={o.id} value={o.id} className="mt-3">
                <div className="flex justify-end mb-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setLineup(o.id, emptyLineup())}
                  >
                    <RotateCcw className="size-4 mr-1" /> Zurücksetzen
                  </Button>
                </div>
                <EncounterEditor
                  opponent={o}
                  myPlayers={myPlayers}
                  lineup={getLineup(o.id)}
                  issues={issuesByOpp[o.id] ?? []}
                  onChange={(l) => setLineup(o.id, l)}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}

        {!isLoading && !isError && myPlayers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Wähle deine Liga und dein Team, um die Aufstellung zu planen.
          </p>
        )}
      </main>
    </div>
  );
};

export default BundesligaPlannerPage;
