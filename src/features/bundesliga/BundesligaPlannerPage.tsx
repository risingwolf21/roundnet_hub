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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGrants } from '@/features/auth/GrantsContext';
import { Has } from '@/hooks/useGrants';
import { useProfile } from '@/tanstack/user';
import { AlertTriangle, ChevronDown, RefreshCw, RotateCcw, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useLeagueData, useRefreshBundesliga, useRosters } from './useBundesliga';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'bundesliga.gender.male' },
  { value: 'female', label: 'bundesliga.gender.female' },
  { value: 'unknown', label: 'bundesliga.gender.unknown' },
];

const mdLabel = (name: string, date: string | null, city: string | null) =>
  [name, city, date].filter(Boolean).join(' · ');

const BundesligaPlannerPage = () => {
  const { t } = useTranslation();
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

  const refresh = useRefreshBundesliga();

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
  // Full squad (for the attendance/gender editor)…
  const myRoster: Player[] = useMemo(
    () =>
      state.ownTeamId && rosters[state.ownTeamId]
        ? [...rosters[state.ownTeamId]]
            .map((sp) => toDomain(sp, state.ownTeamId!))
            .sort((a, b) => (b.rgIndex ?? 0) - (a.rgIndex ?? 0))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rosters, state.ownTeamId, state.genderOverrides]
  );
  // …and only the players marked present (the ones the seat selects offer).
  const absentIds = state.ownTeamId ? state.absentByTeam[state.ownTeamId] ?? [] : [];
  const isPresent = (id: string) => !absentIds.includes(id);
  const myPlayers = useMemo(
    () => myRoster.filter((p) => isPresent(p.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myRoster, absentIds.join(',')]
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

  const getOpponentLineup = (oppId: string): Lineup =>
    (state.ownTeamId && state.opponentLineups[lineupKey(state.leagueId, state.ownTeamId, oppId)]) ||
    emptyLineup();

  const setOpponentLineup = (oppId: string, lineup: Lineup) =>
    patch((prev) => ({
      opponentLineups: {
        ...prev.opponentLineups,
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
  const oppIssuesByOpp = Object.fromEntries(
    opponents.map((o) => [o.id, validateEncounter(getOpponentLineup(o.id), toPlayerMap(o.players))])
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

  const togglePresent = (playerId: string) =>
    patch((prev) => {
      if (!prev.ownTeamId) return {};
      const current = prev.absentByTeam[prev.ownTeamId] ?? [];
      const nextAbsent = current.includes(playerId)
        ? current.filter((x) => x !== playerId)
        : [...current, playerId];
      return { absentByTeam: { ...prev.absentByTeam, [prev.ownTeamId]: nextAbsent } };
    });

  const totalErrors = Object.values(issuesByOpp).filter((is) => hasErrors(is)).length;

  return (
    <div className="flex flex-col min-h-screen">
      <AppBar
        title={t('bundesliga.title')}
        user={user}
        primaryAction="back"
        actions={
          <Has perm={'bundesliga.admin'} fallback={<></>}>
            <Button
              variant="ghost"
              size="icon-lg"
              title={t('bundesliga.reloadData')}
              disabled={refresh.isPending}
              onClick={() =>
                refresh.mutate({ leagueId: state.leagueId, teams: teamsNeedingRosters })
              }
            >
              {refresh.isPending ? <Spinner /> : <RefreshCw />}
            </Button>
          </Has>
        }
      />

      <main className="flex-1 pb-safe-bottom px-4 pt-3 flex flex-col gap-4 max-w-2xl w-full mx-auto">
        {/* Setup */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('bundesliga.setup')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">{t('bundesliga.league')}</label>
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
                  <SelectValue placeholder={t('bundesliga.selectLeague')} />
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
                <Spinner /> {t('bundesliga.loadingTeams')}
              </div>
            )}
            {isError && (
              <p className="text-sm text-destructive">
                {t('bundesliga.leagueLoadError', { error: String((error as Error)?.message ?? error) })}
              </p>
            )}

            {!isLoading && !isError && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{t('bundesliga.myTeam')}</label>
                <Select
                  items={Object.fromEntries(teams.map((t) => [t.teamId, t.name]))}
                  value={state.ownTeamId ?? ''}
                  onValueChange={(v) => v && selectOwnTeam(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('bundesliga.selectTeam')} />
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
                  {t('bundesliga.opponents')} {state.matchDayName ? `· ${state.matchDayId === 'manual' ? t('bundesliga.manual') : state.matchDayName}` : ''}
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
            <Spinner /> {t('bundesliga.loadingSquads')}
          </div>
        )}

        {/* My squad: who is present + gender correction */}
        {myRoster.length > 0 && (
          <Collapsible defaultOpen>
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
                    {t('bundesliga.mySquad', { present: myPlayers.length, total: myRoster.length })}
                  </CardTitle>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    {t('bundesliga.squadHint')}
                  </p>
                  {myRoster.map((p) => {
                    const present = isPresent(p.id);
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between gap-2 ${present ? '' : 'opacity-40'}`}
                      >
                        <label className="flex items-center gap-2 min-w-0 cursor-pointer">
                          <Switch checked={present} onCheckedChange={() => togglePresent(p.id)} />
                          <Avatar className="size-7">
                            {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt={p.name} /> : null}
                            <AvatarFallback>{p.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{p.name}</span>
                          <span className="text-muted-foreground text-sm shrink-0">
                            {p.rgIndex ?? '—'}
                          </span>
                        </label>
                        <div className="flex gap-1 shrink-0">
                          {GENDERS.map((g) => (
                            <Button
                              key={g.value}
                              size="icon-sm"
                              variant={p.gender === g.value ? 'default' : 'outline'}
                              onClick={() => setGender(p.id, g.value)}
                            >
                              {t(g.label)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
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
                  <Trophy className="size-4" /> {t('bundesliga.gamesPerPlayer')}
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
                  {(hasErrors(issuesByOpp[o.id] ?? []) || hasErrors(oppIssuesByOpp[o.id] ?? [])) && (
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
                    onClick={() => {
                      setLineup(o.id, emptyLineup());
                      setOpponentLineup(o.id, emptyLineup());
                    }}
                  >
                    <RotateCcw className="size-4 mr-1" /> {t('bundesliga.reset')}
                  </Button>
                </div>
                <EncounterEditor
                  opponent={o}
                  myPlayers={myPlayers}
                  opponentPlayers={o.players}
                  lineup={getLineup(o.id)}
                  opponentLineup={getOpponentLineup(o.id)}
                  issues={issuesByOpp[o.id] ?? []}
                  opponentIssues={oppIssuesByOpp[o.id] ?? []}
                  onChange={(l) => setLineup(o.id, l)}
                  onOpponentChange={(l) => setOpponentLineup(o.id, l)}
                />
              </TabsContent>
            ))}
          </Tabs>
        )}

        {!isLoading && !isError && myPlayers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('bundesliga.chooseLeagueAndTeam')}
          </p>
        )}
      </main>
    </div>
  );
};

export default BundesligaPlannerPage;
