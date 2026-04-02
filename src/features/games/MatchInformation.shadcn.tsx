import Layout from '@/components/layout/Layout';
import { useDeleteMatch, useMatch } from '@/tanstack/games';
import { useDialogs } from '@toolpad/core';
import { useNavigate, useParams } from 'react-router';

import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Alert from '@mui/material/Alert';
import { useGrants } from '../auth/GrantsContext';

type Props = {
  title: string;
  expected?: number;
  eff_team?: number;
  cat_team?: string;
  p1_eff?: number | null;
  p2_eff?: number | null;
  p1: { displayName: string | null, avatarUrl: string | null, isGuest: boolean, playerId: string | null, userId: string | null, delta?: number, effectiveChange: number } | null;
  p2: { displayName: string | null, avatarUrl: string | null, isGuest: boolean, playerId: string | null, userId: string | null, delta?: number, effectiveChange: number } | null;
  rated: boolean;
};

const MatchInformationShadcn = () => {
  const { matchId } = useParams();
  const dialogs = useDialogs();
  const navigate = useNavigate();
  const { user } = useGrants();

  const { data: match = null, error, isLoading, refetch } = useMatch(matchId);
  const useDeleteMatchMutation = useDeleteMatch(matchId);

  const player1a_history = match?.elo_history.find((x) => x.user === match.team_a.player_1.player);
  const player2a_history = match?.elo_history.find((x) => x.user === match.team_a.player_2.player);
  const player1b_history = match?.elo_history.find((x) => x.user === match.team_b.player_1.player);
  const player2b_history = match?.elo_history.find((x) => x.user === match.team_b.player_2.player);

  const setsAWon = match?.sets.filter(x => x.team_a_score > x.team_b_score).length;
  const setsBWon = match?.sets.filter(x => x.team_a_score < x.team_b_score).length;

  if (!match)
    return (
      <Layout appBarConfig={{ navigateBackPath: -1 }}>
        <Alert severity="error">Das Spiel konnte nicht gefunden werden oder wird gerade geladen.</Alert>
      </Layout>
    );

  return <div>
    <AppBar
      className='!border-b !shadow-sm'
      title="Match Information"
      user={user}
      primaryAction="back"
    />
    <main className='flex-1 size-full pb-safe-bottom'>
      <PullToRefresh onRefresh={() => refetch()}>
        <div className='flex flex-col gap-4 p-4'>
          <div>
            <div className='flex flex-row justify-between items-center gap-4'>

              <div className='flex flex-1 flex-row gap-4 min-w-0'>

                <div className='flex flex-1 flex-col items-center gap-2 min-w-0'>
                  <Avatar className="w-full max-w-32 h-auto aspect-square shadow-sm">
                    <AvatarImage src={match.player_1a?.avatarUrl || undefined} alt={match.player_1a?.name || undefined} />
                    <AvatarFallback>{match.player_1a?.name ? match.player_1a?.name[0] : 'U'}</AvatarFallback>
                  </Avatar>
                  <div className='text-center text-sm w-full truncate' title={match.player_1a?.name}>
                    {match.player_1a?.name}
                  </div>
                </div>

                <div className='flex flex-1 flex-col items-center gap-2 min-w-0'>
                  <Avatar className="w-full max-w-32 h-auto aspect-square shadow-sm">
                    <AvatarImage src={match.player_2a?.avatarUrl || undefined} alt={match.player_2a?.name || undefined} />
                    <AvatarFallback>{match.player_2a?.name ? match.player_2a?.name[0] : 'U'}</AvatarFallback>
                  </Avatar>
                  <div className='text-center text-sm w-full truncate' title={match.player_2a?.name}>
                    {match.player_2a?.name}
                  </div>
                </div>

              </div>

              <div className='flex flex-col shrink-0 items-center justify-center px-2 sm:px-4'>
                {match.sets.map(x => (
                  <div key={x.id} className='flex flex-row gap-2'>
                    <div className={cn("text-2xl sm:text-3xl whitespace-nowrap", {
                      "font-bold": x.team_a_score > x.team_b_score,
                    })}>
                      {x.team_a_score}
                    </div>
                    <div className="text-2xl sm:text-3xl font-black whitespace-nowrap">
                      {' : '}
                    </div>
                    <div className={cn("text-2xl sm:text-3xl whitespace-nowrap", {
                      "font-bold": x.team_a_score < x.team_b_score
                    })}>
                      {x.team_b_score}
                    </div>
                  </div>
                ))}
              </div>

              <div className='flex flex-1 flex-row gap-4 min-w-0'>

                <div className='flex flex-1 flex-col items-center gap-2 min-w-0'>
                  <Avatar className="w-full max-w-32 h-auto aspect-square shadow-sm">
                    <AvatarImage src={match.player_1b?.avatarUrl || undefined} alt={match.player_1b?.name || undefined} />
                    <AvatarFallback>{match.player_1b?.name ? match.player_1b?.name[0] : 'U'}</AvatarFallback>
                  </Avatar>
                  <div className='text-center text-sm w-full truncate' title={match.player_1b?.name}>
                    {match.player_1b?.name}
                  </div>
                </div>

                <div className='flex flex-1 flex-col items-center gap-2 min-w-0'>
                  <Avatar className="w-full max-w-32 h-auto aspect-square shadow-sm">
                    <AvatarImage src={match.player_2b?.avatarUrl || undefined} alt={match.player_2b?.name || undefined} />
                    <AvatarFallback>{match.player_2b?.name ? match.player_2b?.name[0] : 'U'}</AvatarFallback>
                  </Avatar>
                  <div className='text-center text-sm w-full truncate' title={match.player_2b?.name}>
                    {match.player_2b?.name}
                  </div>
                </div>

              </div>

            </div>
          </div>
          <div className='flex flex-col'>
            <div className="text-sm font-semibold">
              Index
            </div>
            <div key={user.id} className=" flex flex-row w-full justify-between py-2 border-b">
              <div className="flex flex-row items-center gap-2">
                <Avatar className={"mr-2"}>
                  <AvatarImage src={match.player_1a?.avatarUrl || undefined} alt={match.player_1a?.name || undefined} />
                  <AvatarFallback>{match.player_1a?.name ? match.player_1a?.name[0] : 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <div>{match.player_1a?.name}</div>
                </div>
              </div>
            </div>

            <div key={user.id} className=" flex flex-row w-full justify-between py-2 border-b">
              <div className="flex flex-row items-center gap-2">
                <Avatar className={"mr-2"}>
                  <AvatarImage src={match.player_2a?.avatarUrl || undefined} alt={match.player_2a?.name || undefined} />
                  <AvatarFallback>{match.player_2a?.name ? match.player_2a?.name[0] : 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <div>{match.player_2a?.name}</div>
                </div>
              </div>
            </div>
            <div key={user.id} className=" flex flex-row w-full justify-between py-2 border-b">
              <div className="flex flex-row items-center gap-2">
                <Avatar className={"mr-2"}>
                  <AvatarImage src={match.player_1b?.avatarUrl || undefined} alt={match.player_1b?.name || undefined} />
                  <AvatarFallback>{match.player_1b?.name ? match.player_1b?.name[0] : 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <div>{match.player_1b?.name}</div>
                </div>
              </div>
            </div>
            <div key={user.id} className=" flex flex-row w-full justify-between py-2 border-b">
              <div className="flex flex-row items-center gap-2">
                <Avatar className={"mr-2"}>
                  <AvatarImage src={match.player_2b?.avatarUrl || undefined} alt={match.player_2b?.name || undefined} />
                  <AvatarFallback>{match.player_2b?.name ? match.player_2b?.name[0] : 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <div>{match.player_2b?.name}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PullToRefresh>
    </main>
  </div>

  // return (
  //   <Layout appBarConfig={{ navigateBackPath: -1 }}>
  //     <Stack direction={'column'} spacing={2} sx={{ m: 1, justifyContent: 'center' }}>
  //       <TeamCard
  //         title="Team A"
  //         expected={match.elo_calc_log?.expected_a}
  //         eff_team={match.elo_calc_log?.eff_team_a}
  //         cat_team={match.elo_calc_log?.category_a}
  //         p1_eff={player1a_history?.eff_old_rating}
  //         p2_eff={player2a_history?.eff_old_rating}
  //         p1={({
  //           displayName: match.team_a.player_1.display_name ?? match.player_1a?.name ?? '',
  //           avatarUrl: match.player_1a?.avatarUrl ?? null,
  //           isGuest: match.team_a.player_1.linked_user_id === null,
  //           userId: match.team_a.player_1.linked_user_id,
  //           playerId: match.team_a.player_1.player,
  //           delta: player1a_history?.delta,
  //           effectiveChange: (player1a_history?.eff_new_rating ?? 0) - (player1a_history?.eff_old_rating ?? 0),
  //         })}
  //         p2={({
  //           displayName: match.team_a.player_2.display_name ?? match.player_2a?.name ?? '',
  //           avatarUrl: match.player_2a?.avatarUrl ?? null,
  //           isGuest: match.team_a.player_2.linked_user_id === null,
  //           userId: match.team_a.player_2.linked_user_id,
  //           playerId: match.team_a.player_2.player,
  //           delta: player2a_history?.delta,
  //           effectiveChange: (player2a_history?.eff_new_rating ?? 0) - (player2a_history?.eff_old_rating ?? 0),
  //         })}
  //         rated={match.rated}
  //       />

  //       <Card elevation={3} sx={{ borderRadius: 2, py: 0, px: 0, mt: 1, pb: 0 }}>
  //         <CardContent sx={{ p: 0 }}>
  //           <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, pt: 2 }}>
  //             <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
  //               <Typography fontWeight={'bold'}>Sätze</Typography>
  //             </Box>
  //             <Stack direction={'row'} spacing={1} sx={{ px: 0, py: 1, pb: 0 }}>
  //               {match.sets.map((x) => (
  //                 <Stack spacing={2} key={x.id}>
  //                   <Chip
  //                     color={x.team_b_score < x.team_a_score ? 'success' : 'default'}
  //                     variant={'filled'}
  //                     label={x.team_a_score}
  //                   />
  //                   <Chip
  //                     color={x.team_b_score > x.team_a_score ? 'success' : 'default'}
  //                     variant={'filled'}
  //                     label={x.team_b_score}
  //                   />
  //                 </Stack>
  //               ))}
  //             </Stack>
  //           </Box>
  //         </CardContent>
  //       </Card>

  //       <TeamCard
  //         title="Team B"
  //         expected={match.elo_calc_log?.expected_b}
  //         eff_team={match.elo_calc_log?.eff_team_b}
  //         cat_team={match.elo_calc_log?.category_b}
  //         p1_eff={player1b_history?.eff_old_rating}
  //         p2_eff={player2b_history?.eff_old_rating}
  //         p1={({
  //           displayName: match.team_b.player_1.display_name ?? match.player_1b?.name ?? '',
  //           avatarUrl: match.player_1b?.avatarUrl ?? null,
  //           isGuest: match.team_b.player_1.linked_user_id === null,
  //           playerId: match.team_b.player_1.player,
  //           userId: match.team_b.player_1.linked_user_id,
  //           delta: player1b_history?.delta,
  //           effectiveChange: (player1b_history?.eff_new_rating ?? 0) - (player1b_history?.eff_old_rating ?? 0),
  //         })}
  //         p2={({
  //           displayName: match.team_b.player_2.display_name ?? match.player_2b?.name ?? '',
  //           avatarUrl: match.player_2b?.avatarUrl ?? null,
  //           isGuest: match.team_b.player_2.linked_user_id === null,
  //           playerId: match.team_b.player_2.player,
  //           userId: match.team_b.player_2.linked_user_id,
  //           delta: player2b_history?.delta,
  //           effectiveChange: (player2b_history?.eff_new_rating ?? 0) - (player2b_history?.eff_old_rating ?? 0),
  //         })}
  //         rated={match.rated}
  //       />

  //       <Has perm={'games.update.score'}>
  //         <Fab sx={{
  //           background: 'primary.light',
  //           position: 'fixed',
  //           right: '16px',
  //           bottom: 'calc(16px + env(safe-area-inset-bottom))',
  //           mb: '16px',
  //         }}
  //           onClick={() => {
  //             dialogs.open(ReportSetsDialog, { matchId: match.id, team_a_name: match.team_a.name, team_b_name: match.team_b.name, sets: match.sets });
  //           }}>
  //           <Edit />
  //         </Fab>
  //       </Has>

  //       <Has perm={'games.delete.own'}>
  //         <Card sx={{ color: 'red', borderRadius: 2, py: 0, px: 0, m: 1 }}>
  //           <CardActionArea sx={{ px: 1 }}>
  //             <ListItem
  //               onClick={() =>
  //                 dialogs
  //                   .confirm(
  //                     `Möchtest du das Spiel wirklich löschen? ${match.rated ? 'Der Indexeintrag von diesem Spiel wird mit gelöscht.' : ''}`,
  //                     { title: 'Spiel löschen' }
  //                   )
  //                   .then((result) => {
  //                     if (result) {
  //                       useDeleteMatchMutation.mutate(undefined, {
  //                         onSuccess: () => navigate('/matches'),
  //                         onError: (error) =>
  //                           notifications.show('Spiel konnte nicht gelöscht werden. ' + error.message, {
  //                             severity: 'error',
  //                           }),
  //                       });
  //                     }
  //                   })
  //               }
  //             >
  //               <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
  //                 <Delete />
  //               </ListItemAvatar>
  //               <ListItemText primary="Löschen" />
  //             </ListItem>
  //           </CardActionArea>
  //         </Card>
  //       </Has>

  //       <Has perm={'games.admin.view'}>
  //         <Card elevation={3} sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
  //           <CardContent sx={{ p: 0 }}>
  //             <Box sx={{ flexDirection: 'row', display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}>
  //               <Typography sx={{ fontWeight: 'bold' }}>Admin - Informationen</Typography>
  //             </Box>
  //             <Divider />
  //             <ListItemButton
  //               dense
  //               onClick={() =>
  //                 navigator.clipboard.writeText(match.id).then(() => notifications.show('Erfolgreich kopiert'))
  //               }
  //             >
  //               <ListItemText
  //                 primary={
  //                   <Typography variant="body2" style={{ userSelect: 'text' }}>
  //                     {match.id}
  //                   </Typography>
  //                 }
  //                 secondary={'Match Id'}
  //               />
  //             </ListItemButton>
  //             <Divider />
  //             <ListItem dense>
  //               <Stack direction={'row'} spacing={2} width={'100%'}>
  //                 <ListItemText
  //                   sx={{ width: '50%' }}
  //                   primary={match.elo_calc_log?.rg_a1_used ?? 'not found'}
  //                   secondary={'RG Team A - Player 1'}
  //                 />
  //                 <ListItemText
  //                   sx={{ width: '50%' }}
  //                   primary={match.elo_calc_log?.rg_b1_used ?? 'not found'}
  //                   secondary={'RG Team B - Player 1'}
  //                 />
  //               </Stack>
  //             </ListItem>
  //             <ListItem dense>
  //               <Stack direction={'row'} spacing={2} width={'100%'}>
  //                 <ListItemText
  //                   sx={{ width: '50%' }}
  //                   primary={match.elo_calc_log?.rg_a2_used ?? 'not found'}
  //                   secondary={'RG Team A - Player 2'}
  //                 />
  //                 <ListItemText
  //                   sx={{ width: '50%' }}
  //                   primary={match.elo_calc_log?.rg_b2_used ?? 'not found'}
  //                   secondary={'RG Team B - Player 2'}
  //                 />
  //               </Stack>
  //             </ListItem>
  //             <Divider />
  //             <ListItem dense>
  //               <Stack direction={'row'} spacing={2} width={'100%'}>
  //                 <ListItemText
  //                   sx={{ width: '50%' }}
  //                   primary={match.elo_calc_log?.eff_team_a.toFixed(2) ?? 'not found'}
  //                   secondary={'Effective Rating Team A'}
  //                 />
  //                 <ListItemText
  //                   sx={{ width: '50%' }}
  //                   primary={match.elo_calc_log?.eff_team_b.toFixed(2) ?? 'not found'}
  //                   secondary={'Effective Rating Team B'}
  //                 />
  //               </Stack>
  //             </ListItem>
  //             <Divider />
  //             {match.elo_history.map((elo) => {
  //               const player = [match.player_1a, match.player_2a, match.player_1b, match.player_2b].find(
  //                 (x) => x?.id === elo.user
  //               );
  //               return (
  //                 <Stack key={elo.id}>
  //                   <ListItem dense>
  //                     <Stack direction={'row'} spacing={2} width={'100%'}>
  //                       <ListItemText
  //                         sx={{ width: '50%' }}
  //                         primary={player?.name ?? 'not found'}
  //                         secondary={'Spieler'}
  //                         primaryTypographyProps={{ fontWeight: 'bold' }}
  //                       />
  //                       <ListItemText sx={{ width: '50%' }} primary={elo.delta.toFixed(2)} secondary={'Delta'} />
  //                     </Stack>
  //                   </ListItem>
  //                   <ListItem dense>
  //                     <Stack direction={'row'} spacing={2} width={'100%'}>
  //                       <ListItemText
  //                         sx={{ width: '50%' }}
  //                         primary={elo.eff_old_rating?.toFixed(2)}
  //                         secondary={'Altes Rating'}
  //                       />
  //                       <ListItemText
  //                         sx={{ width: '50%' }}
  //                         primary={elo.eff_new_rating?.toFixed(2)}
  //                         secondary={'Neues Rating'}
  //                       />
  //                     </Stack>
  //                   </ListItem>
  //                   <Divider />
  //                 </Stack>
  //               );
  //             })}
  //           </CardContent>
  //         </Card>
  //       </Has>
  //     </Stack>
  //   </Layout>
  // );
};
export default MatchInformationShadcn;
