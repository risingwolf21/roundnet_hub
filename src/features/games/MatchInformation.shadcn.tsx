import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemHeader, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { useDialogs } from '@/contexts/DialogsProvider';
import { Has } from '@/hooks/useGrants';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useDeleteMatch, useMatch } from '@/tanstack/games';
import { Loader2, Pencil, SearchX, Trash2 } from 'lucide-react';
import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';
import { ReportSetsDialogShadcn } from './dialogs/ReportSetsDialog.shadcn';

// --- HILFSKOMPONENTEN (Machen den Hauptcode schön schlank) ---

const TeamBlock = ({ p1, p2, fallback1, fallback2 }: { p1: any, p2: any, fallback1: any, fallback2: any }) => (
  <div className="flex flex-1 flex-col gap-4 min-w-0">
    <div className='flex flex-1 flex-row gap-4 min-w-0'>
      {[p1, p2].map((player, idx) => (
        <div key={idx} className='flex flex-1 flex-col items-center gap-2 min-w-0'>
          <Avatar className="w-full max-w-32 h-auto aspect-square shadow-sm">
            <AvatarImage src={player?.avatarUrl || undefined} alt={player?.name || undefined} />
            <AvatarFallback>{player?.name ? player.name[0] : 'U'}</AvatarFallback>
          </Avatar>
        </div>
      ))}
    </div>
    <div>
      <div className='text-center font-semibold text-sm w-full truncate'>
        {p1?.name ?? fallback1?.display_name}
      </div>
      <div className='text-center font-semibold text-sm w-full truncate'>
        {p2?.name ?? fallback2?.display_name}
      </div>
    </div>
  </div>
);

const IndexRow = ({ player, fallback, history }: { player: any, fallback: any, history: any }) => (
  <Item className='p-0'>
    <ItemMedia>
      <Avatar className={"mr-2"}>
        <AvatarImage src={player?.avatarUrl || undefined} alt={player?.name || undefined} />
        <AvatarFallback>{player?.name ? player.name[0] : 'U'}</AvatarFallback>
      </Avatar>
    </ItemMedia>
    <ItemContent>
      <div className="truncate">{player?.name ?? fallback?.display_name}</div>
    </ItemContent>
    <ItemActions>
      <span className="text-sm text-muted-foreground">{history?.old_rating?.toFixed() ?? '-'}</span>
      <Badge variant={!history ? 'warning' : history.delta > 0 ? "success" : "error"}>
        {history?.delta?.toFixed() ?? '-'}
      </Badge>
    </ItemActions>
  </Item>
);

// --- HAUPTKOMPONENTE ---

const MatchInformationShadcn = () => {
  const { matchId } = useParams();
  const { user, hasPerm } = useGrants();
  const dialogs = useDialogs();
  const navigate = useNavigate();

  const { data: match, isLoading, refetch } = useMatch(matchId);
  const useDeleteMatchMutation = useDeleteMatch(matchId);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <AppBar className='!border-b !shadow-sm' title="Match Information" user={user} primaryAction="back" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-10 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col h-screen">
        <AppBar className='!border-b !shadow-sm' title="Match Information" user={user} primaryAction="back" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <SearchX className="size-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Spiel nicht gefunden</h2>
          <p className="text-muted-foreground mt-2 max-w-xs">
            Das gesuchte Spiel existiert nicht, wurde gelöscht oder du hast keine Berechtigung es zu sehen.
          </p>
        </div>
      </div>
    );
  }

  // 3. DATEN AUFBEREITEN
  const setsAWon = match.sets.filter((x: any) => x.team_a_score > x.team_b_score).length ?? 0;
  const setsBWon = match.sets.filter((x: any) => x.team_a_score < x.team_b_score).length ?? 0;

  const matchMember = [
    match.team_a.player_1.linked_user_id,
    match.team_b.player_1.linked_user_id,
    match.team_a.player_2.linked_user_id,
    match.team_b.player_2.linked_user_id
  ].includes(user.id);


  const getHistory = (playerId: string) => match.elo_history.find((x: any) => x.user === playerId);

  const playersData = [
    { p: match.player_1a, f: match.team_a.player_1, h: getHistory(match.team_a.player_1.player) },
    { p: match.player_2a, f: match.team_a.player_2, h: getHistory(match.team_a.player_2.player) },
    { p: match.player_1b, f: match.team_b.player_1, h: getHistory(match.team_b.player_1.player) },
    { p: match.player_2b, f: match.team_b.player_2, h: getHistory(match.team_b.player_2.player) },
  ];

  // 4. HAUPT RENDER
  return (
    <div className="flex flex-col min-h-screen">
      <AppBar
        className='!border-b !shadow-sm'
        title="Match Information"
        user={user}
        primaryAction="back"
        actions={
          <Button variant={"ghost"} size={"icon-lg"} onClick={async () => {
            const result = await dialogs.confirm("Möchtest du dieses Spiel wirklich löschen?");

            if (result) {
              useDeleteMatchMutation.mutate(undefined, {
                onSuccess: () => navigate('/matches'),
                onError: (error) =>
                  toast.error('Spiel konnte nicht gelöscht werden. ' + error.message),
              });
            }
          }}>
            <Trash2 />
          </Button>
        }
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh onRefresh={() => refetch()}>
          <div className='flex flex-col gap-4 p-4'>

            {/* MATCH HEADER (Teams & Score) */}
            <div>
              <div className='flex flex-row justify-between items-center gap-4'>
                <TeamBlock p1={match.player_1a} p2={match.player_2a} fallback1={match.team_a.player_1} fallback2={match.team_a.player_2} />

                <div className='flex flex-col shrink-0 items-center justify-center px-2 sm:px-4'>
                  <div className='flex flex-row gap-2'>
                    <div className={cn("text-2xl sm:text-3xl whitespace-nowrap", { "font-bold": setsAWon > setsBWon })}>
                      {setsAWon}
                    </div>
                    <div className="text-2xl sm:text-3xl font-black whitespace-nowrap"> : </div>
                    <div className={cn("text-2xl sm:text-3xl whitespace-nowrap", { "font-bold": setsAWon < setsBWon })}>
                      {setsBWon}
                    </div>
                  </div>
                </div>

                <TeamBlock p1={match.player_1b} p2={match.player_2b} fallback1={match.team_b.player_1} fallback2={match.team_b.player_2} />
              </div>
            </div>

            {/* SÄTZE */}
            <Item variant={"outline"}>
              <ItemContent className='p-0'>
                <ItemHeader>
                  <ItemTitle className='font-semibold'>Sätze</ItemTitle>
                  {
                    matchMember && hasPerm("games.update.score") &&
                    <Button variant={"ghost"} size={"icon"} onClick={() => {
                      dialogs.open(ReportSetsDialogShadcn, {
                        matchId: match.id,
                        team_a_name: match.team_a.name,
                        team_b_name: match.team_b.name,
                        sets: match.sets
                      })
                    }}>
                      <Pencil />
                    </Button>
                  }
                </ItemHeader>
                <div className='flex flex-col gap-2'>
                  <div className='flex flex-row justify-between items-center'>
                    <div className='flex flex-col gap-1'>
                      <div className={cn('text-md', { "font-bold": setsAWon > setsBWon })}>{match.team_a.name}</div>
                      <div className={cn('text-md', { "font-bold": setsAWon < setsBWon })}>{match.team_b.name}</div>
                    </div>

                    <div className='flex flex-row gap-4'>
                      {match.sets.map((x: any, i: number) => (
                        <div key={i} className="flex flex-col gap-1 text-center">
                          <div className={cn('text-md', { "font-bold": x.team_a_score > x.team_b_score })}>{x.team_a_score}</div>
                          <div className={cn('text-md', { "font-bold": x.team_a_score < x.team_b_score })}>{x.team_b_score}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ItemContent>
            </Item>

            {/* INDEX HISTORY */}
            <Item variant={"outline"}>
              <ItemContent className='p-0'>
                <ItemHeader>
                  <ItemTitle className='font-semibold'>Index</ItemTitle>
                </ItemHeader>
                <div className='flex flex-col gap-2'>
                  {playersData.map((data, index) => (
                    <React.Fragment key={index}>
                      <IndexRow player={data.p} fallback={data.f} history={data.h} />
                      {index < playersData.length - 1 && <Separator />}
                    </React.Fragment>
                  ))}
                </div>
              </ItemContent>
            </Item>

            <Has perm={["games.admin.view", "supabase.admin"]}>
              <Separator />
              <div className="text-sm font-semibold ml-2">
                Admin - Aktionen
              </div>
              <Item variant="outline">
                <ItemContent>
                  <ItemTitle>Elo anwenden</ItemTitle>
                  <ItemDescription>
                    Startet die ELO Berechnung für dieses Spiel neu
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant="outline" size="sm" onClick={() => {
                    supabase.schema("games").rpc("apply_elo_for_match", { p_match: match.id });
                  }}>
                    Start
                  </Button>
                </ItemActions>
              </Item>
            </Has>

            <Has perm={"games.admin.view"}>
              <Item variant={"outline"}>
                <ItemContent className='p-0'>
                  <ItemHeader>
                    <ItemTitle className='font-semibold'>Admin - Informationen</ItemTitle>
                  </ItemHeader>
                  <div>

                    {match.elo_history.map((elo) => {
                      const player = [match.player_1a, match.player_2a, match.player_1b, match.player_2b].find(
                        (x) => x?.id === elo.user
                      );
                      return (
                        <div key={elo.id}>
                          <div className='flex flex-row gap-2 w-full'>
                            <div className='flex-1'>
                              <div className='font-semibold'>{player?.name ?? player?.displayName}</div>
                              <div>Spieler</div>
                            </div>
                            <div className='flex-1'>
                              <div className='font-semibold'>{elo.delta.toFixed()}</div>
                              <div>Delta</div>
                            </div>
                          </div>
                          <div className='flex flex-row gap-2 w-full'>
                            <div className='flex-1'>
                              <div className='font-semibold'>{elo.eff_old_rating?.toFixed(2)}</div>
                              <div>Altes Rating</div>
                            </div>
                            <div className='flex-1'>
                              <div className='font-semibold'>{elo.eff_new_rating?.toFixed(2)}</div>
                              <div>Neues Rating</div>
                            </div>
                          </div>
                          <Separator />
                        </div>
                      );
                    })}

                  </div>
                </ItemContent>
              </Item>
            </Has>

          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default MatchInformationShadcn;