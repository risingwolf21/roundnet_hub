import { ListError, ListSectionHeader, ListSkeleton, sideBar } from '@/components/list/ListParts';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGrants } from '@/features/auth/GrantsContext';
import { cn } from '@/lib/utils';
import { useProfile } from '@/tanstack/user';
import { CalendarDays, ClipboardList, MapPin, Shield, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { BundesligaTeam, LeagueView } from './repository';
import { teamOverview, type TeamEncounter, type TeamMatchday } from './teamView';
import { useBundesligaSeason, useLeagueView, useTeamsOfPlayer } from './useBundesliga';

const CHOICE_KEY = 'bundesliga-team-v1';

type TeamChoice = { leagueId: number; teamId: string };

const readChoice = (): TeamChoice | null => {
  try {
    const raw = localStorage.getItem(CHOICE_KEY);
    return raw ? (JSON.parse(raw) as TeamChoice) : null;
  } catch {
    return null;
  }
};

const writeChoice = (choice: TeamChoice | null) => {
  try {
    if (choice) localStorage.setItem(CHOICE_KEY, JSON.stringify(choice));
    else localStorage.removeItem(CHOICE_KEY);
  } catch {
    // storage blocked: the choice lasts for this visit
  }
};

const TeamLogo = ({ team, className }: { team: BundesligaTeam; className?: string }) => (
  <Avatar className={cn('size-8 shrink-0', className)}>
    {team.logo_url ? <AvatarImage src={team.logo_url} alt="" /> : null}
    <AvatarFallback className="text-xs">{team.name.slice(0, 2)}</AvatarFallback>
  </Avatar>
);

const RESULT_BADGE = {
  win: 'success',
  loss: 'error',
  draw: 'warning',
  open: 'secondary',
} as const;

/** The Bundesliga for a player: their team, its match days with results, and the league table. */
const BundesligaTeamPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useGrants();
  const { data: profile } = useProfile(user.id);
  // The number of the RG ID is the playerzone player id the rosters use (SAR221 → 221).
  const myPlayerId = profile?.player?.rg_id?.match(/\d+/)?.[0] ?? null;

  const season = useBundesligaSeason();
  const leagues = useMemo(() => season.data?.leagues ?? [], [season.data]);
  const myTeams = useTeamsOfPlayer(myPlayerId, leagues);

  const [choice, setChoice] = useState<TeamChoice | null>(readChoice);
  const [picking, setPicking] = useState(false);
  const mine = myTeams.data?.[0] ? { leagueId: myTeams.data[0].league_id, teamId: myTeams.data[0].pz_team_id } : null;
  const shown = choice ?? mine;
  const isMine = !!shown && !!myTeams.data?.some((m) => m.league_id === shown.leagueId && m.pz_team_id === shown.teamId);

  // League shown in the picker: the chosen team's, else the first one.
  const [pickerLeague, setPickerLeague] = useState<number | null>(null);
  const viewLeagueId = shown?.leagueId ?? null;
  const pickLeagueId = pickerLeague ?? viewLeagueId ?? leagues[0]?.id ?? null;
  const view = useLeagueView(viewLeagueId);
  const pickView = useLeagueView(pickLeagueId);
  const overview = useMemo(() => (view.data && shown ? teamOverview(view.data, shown.teamId) : null), [view.data, shown]);
  const league = leagues.find((l) => l.id === viewLeagueId) ?? null;

  const choose = (next: TeamChoice | null) => {
    setChoice(next);
    writeChoice(next);
    setPicking(false);
  };

  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const formatDate = (iso: string | null) => (iso ? dateFormat.format(new Date(`${iso}T12:00:00`)) : null);
  const refreshedAt = league?.refreshed_at
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(league.refreshed_at))
    : null;

  const loading = season.isLoading || myTeams.isLoading || (!!viewLeagueId && view.isLoading);
  const failed = season.isError || myTeams.isError || view.isError;

  const picker = (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="text-sm font-semibold">{t('bundesliga.team.pickTitle')}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground" htmlFor="bl-pick-league">{t('bundesliga.league')}</label>
          <Select
            items={Object.fromEntries(leagues.map((l) => [String(l.id), l.name]))}
            value={pickLeagueId ? String(pickLeagueId) : ''}
            onValueChange={(v) => v && setPickerLeague(Number(v))}
          >
            <SelectTrigger id="bl-pick-league" className="w-full">
              <SelectValue placeholder={t('bundesliga.selectLeague')} />
            </SelectTrigger>
            <SelectContent>
              {leagues.map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground" htmlFor="bl-pick-team">{t('bundesliga.team.team')}</label>
          <Select
            items={Object.fromEntries((pickView.data?.teams ?? []).map((tm) => [tm.pz_team_id, tm.name]))}
            value={shown && shown.leagueId === pickLeagueId ? shown.teamId : ''}
            onValueChange={(v) => v && pickLeagueId && choose({ leagueId: pickLeagueId, teamId: v })}
          >
            <SelectTrigger id="bl-pick-team" className="w-full" disabled={!pickView.data}>
              <SelectValue placeholder={t('bundesliga.selectTeam')} />
            </SelectTrigger>
            <SelectContent>
              {[...(pickView.data?.teams ?? [])]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((tm) => (
                  <SelectItem key={tm.pz_team_id} value={tm.pz_team_id}>{tm.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {choice && mine && (
        <Button variant="ghost" className="self-start" onClick={() => choose(null)}>
          {t('bundesliga.team.backToMine')}
        </Button>
      )}
    </section>
  );

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <AppBar title={t('bundesliga.title')} user={user} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4 pb-safe-bottom">
        {loading ? (
          <>
            <ListSkeleton rows={1} />
            <ListSkeleton rows={4} />
          </>
        ) : failed ? (
          <ListError
            title={t('bundesliga.team.errorTitle')}
            description={t('bundesliga.team.errorDescription')}
            retryLabel={t('common.retry')}
            onRetry={() => {
              season.refetch();
              myTeams.refetch();
              view.refetch();
            }}
          />
        ) : leagues.length === 0 ? (
          <Empty className="mt-8">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Trophy /></EmptyMedia>
              <EmptyTitle>{t('bundesliga.team.noDataTitle')}</EmptyTitle>
              <EmptyDescription>{t('bundesliga.team.noDataDescription')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : !overview ? (
          <>
            <section className="flex flex-col gap-1 rounded-xl border bg-card p-4">
              <div className="text-sm font-semibold">{t('bundesliga.team.notFoundTitle')}</div>
              <p className="text-xs text-muted-foreground">
                {myPlayerId
                  ? t('bundesliga.team.notFoundWithId', { rgId: profile?.player?.rg_id })
                  : t('bundesliga.team.notFoundNoId')}
              </p>
            </section>
            {picker}
          </>
        ) : (
          <>
            {/* Hero: the team, its rank and record */}
            <section className={cn('flex flex-col gap-3 rounded-xl border bg-card p-4', sideBar(isMine ? 'primary' : 'neutral'))}>
              <div className="flex items-center gap-3">
                <TeamLogo team={overview.team} className="size-12" />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-lg font-semibold">{overview.team.name}</h1>
                  <p className="text-sm text-muted-foreground">{league?.name}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {isMine && <Badge variant="info">{t('bundesliga.team.myTeam')}</Badge>}
                {overview.standing && (
                  <Badge variant="secondary">
                    {t('bundesliga.team.rank', { position: overview.standing.position, count: overview.tableSize })}
                  </Badge>
                )}
                {overview.standing && (
                  <Badge variant="outline" className="tabular-nums">
                    {t('bundesliga.team.record', { wins: overview.standing.wins, draws: overview.standing.draws, losses: overview.standing.losses })}
                  </Badge>
                )}
                {overview.team.rgx_total !== null && (
                  <span className="text-xs text-muted-foreground tabular-nums">RGX {overview.team.rgx_total}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="max-sm:flex-1" onClick={() => navigate('/bundesliga/planner')}>
                  <ClipboardList />
                  {t('bundesliga.team.planLineup')}
                </Button>
                <Button variant="outline" className="max-sm:flex-1" onClick={() => setPicking((p) => !p)}>
                  {t('bundesliga.team.otherTeam')}
                </Button>
              </div>
            </section>

            {picking && picker}

            {/* Next match day */}
            {overview.next && <NextMatchday matchday={overview.next} formatDate={formatDate} />}

            {/* All match days */}
            <ListSectionHeader title={t('bundesliga.team.matchdays')} count={overview.matchdays.length} icon={<CalendarDays />} />
            {overview.matchdays.length === 0 ? (
              <p className="px-2 text-sm text-muted-foreground">{t('bundesliga.team.noMatchdays')}</p>
            ) : (
              overview.matchdays.map((md) => <MatchdayCard key={md.group.pz_group_id} matchday={md} formatDate={formatDate} />)
            )}

            {/* League table */}
            {view.data && view.data.standings.length > 0 && (
              <StandingsCard view={view.data} highlight={overview.team.pz_team_id} leagueName={league?.name ?? ''} />
            )}

            {refreshedAt && (
              <p className="px-2 text-center text-xs text-muted-foreground">{t('bundesliga.team.asOf', { date: refreshedAt })}</p>
            )}
          </>
        )}
      </main>
    </div>
  );
};

const EncounterRow = ({ encounter }: { encounter: TeamEncounter }) => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-11 items-center gap-3">
      <TeamLogo team={encounter.opponent} className="size-7" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{encounter.opponent.name}</div>
        {encounter.sets && (
          <div className="text-xs text-muted-foreground tabular-nums">
            {t('bundesliga.team.sets', { ours: encounter.sets[0], theirs: encounter.sets[1] })}
          </div>
        )}
      </div>
      {encounter.boards && <span className="text-sm font-semibold tabular-nums">{encounter.boards[0]}:{encounter.boards[1]}</span>}
      <Badge variant={RESULT_BADGE[encounter.result]} className="shrink-0">{t(`bundesliga.team.result.${encounter.result}`)}</Badge>
    </div>
  );
};

const MatchdayMeta = ({ matchday, formatDate }: { matchday: TeamMatchday; formatDate: (d: string | null) => string | null }) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
    {matchday.group.play_date && (
      <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{formatDate(matchday.group.play_date)}</span>
    )}
    {matchday.group.city && (
      <span className="flex items-center gap-1"><MapPin className="size-3.5" />{matchday.group.city}</span>
    )}
    {matchday.group.name && (
      <span className="flex items-center gap-1"><Shield className="size-3.5" />{matchday.group.name}</span>
    )}
  </div>
);

const NextMatchday = ({ matchday, formatDate }: { matchday: TeamMatchday; formatDate: (d: string | null) => string | null }) => {
  const { t } = useTranslation();
  return (
    <section className={cn('flex flex-col gap-2 rounded-xl border bg-card p-4', sideBar('info'))}>
      <div className="text-sm font-semibold">{t('bundesliga.team.next', { number: matchday.number })}</div>
      <MatchdayMeta matchday={matchday} formatDate={formatDate} />
      <div className="text-xs text-muted-foreground">
        {t('bundesliga.team.opponents', { names: matchday.encounters.map((e) => e.opponent.name).join(', ') })}
      </div>
    </section>
  );
};

const MatchdayCard = ({ matchday, formatDate }: { matchday: TeamMatchday; formatDate: (d: string | null) => string | null }) => {
  const { t } = useTranslation();
  const wins = matchday.encounters.filter((e) => e.result === 'win').length;
  const tone = !matchday.played ? 'neutral' : wins * 2 >= matchday.encounters.length ? 'success' : 'error';
  return (
    <section className={cn('flex flex-col gap-2 rounded-xl border bg-card p-4', sideBar(tone))}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{t('bundesliga.team.matchday', { number: matchday.number })}</span>
        {matchday.played && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {t('bundesliga.team.won', { wins, count: matchday.encounters.length })}
          </span>
        )}
      </div>
      <MatchdayMeta matchday={matchday} formatDate={formatDate} />
      <div className="divide-y">
        {matchday.encounters.map((e) => (
          <EncounterRow key={e.gameId} encounter={e} />
        ))}
      </div>
    </section>
  );
};

const StandingsCard = ({ view, highlight, leagueName }: { view: LeagueView; highlight: string; leagueName: string }) => {
  const { t } = useTranslation();
  const teamById = new Map(view.teams.map((tm) => [tm.pz_team_id, tm]));
  const rows = [...view.standings].sort((a, b) => a.position - b.position);
  return (
    <section className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Trophy className="size-4" />
        {t('bundesliga.team.table', { league: leagueName })}
      </div>
      <div role="table" aria-label={t('bundesliga.team.table', { league: leagueName })} className="flex flex-col text-sm">
        <div role="row" className="grid grid-cols-[2rem_minmax(0,1fr)_4.5rem_3.5rem] gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
          <span role="columnheader">#</span>
          <span role="columnheader">{t('bundesliga.team.team')}</span>
          <span role="columnheader" className="text-right">{t('bundesliga.team.recordHeader')}</span>
          <span role="columnheader" className="text-right">{t('bundesliga.team.setsDiff')}</span>
        </div>
        {rows.map((s) => {
          const diff = s.sets_for - s.sets_against;
          return (
            <div
              role="row"
              key={s.pz_team_id}
              className={cn(
                'grid grid-cols-[2rem_minmax(0,1fr)_4.5rem_3.5rem] items-center gap-2 rounded-md px-2 py-1.5 tabular-nums',
                s.pz_team_id === highlight && 'bg-primary/10 font-semibold'
              )}
            >
              <span role="cell">{s.position}</span>
              <span role="cell" className="truncate">{teamById.get(s.pz_team_id)?.name ?? s.pz_team_id}</span>
              <span role="cell" className="text-right">{s.wins}-{s.draws}-{s.losses}</span>
              <span role="cell" className={cn('text-right', diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : '')}>
                {diff > 0 ? `+${diff}` : diff}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default BundesligaTeamPage;
