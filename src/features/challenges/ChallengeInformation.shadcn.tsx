import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { Has } from '@/hooks/useGrants';
import { queryClient } from '@/lib/queryClient';
import {
  challengeKeys,
  useChallenge,
  useChallengeStatsForUser,
  useIncreasePointForUserMutation,
  useUpdateChallengeMutation
} from '@/tanstack/challenge';
import { captureException, withProfiler } from '@sentry/react';
import { useDialogs } from '@toolpad/core';
import { TFunction } from 'i18next';
import { useCallback } from 'react';
import { useGrants } from '../auth/GrantsContext';
import EnterPointDialog from './dialogs/EnterPointDialog';

import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ChallengeActivityListShadcn } from './ChallengeActivityList.shadcn';

const ChallengeInformationShadcn = ({ t, challengeId }: { t: TFunction; challengeId: string }) => {
  const { user } = useGrants();
  const dialogs = useDialogs();

  const { data: challenge = null, isLoading } = useChallenge(challengeId);
  const { data: user_challenge_stats = [] } = useChallengeStatsForUser(challengeId, user);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: challengeKeys.challengeInformation(challengeId) });
  };

  const increasePointMutation = useIncreasePointForUserMutation(challengeId);
  const updateChallengeMutation = useUpdateChallengeMutation();

  const increaseChallengePoint = useCallback(
    async (
      created_at: Date,
      image: { dataUrl: string; fileName: string } | null,
      count: number,
      comment?: string,
      category?: string
    ) => {
      if (!user || !challenge) {
        toast.error('Something went wrong! Try again later');
        return;
      }

      increasePointMutation.mutate(
        {
          user,
          challenge: challenge.id,
          created_at,
          image,
          count,
          comment,
          category,
        },
        {
          onSuccess: (data) => {
            let message = 'Punkt erfolgreich hinzugefügt';
            if (data.imageFailedToUpload) {
              message += '. Das Bild konnte leider nicht gespeichert werden.';
            }
            toast.success(message);
          },
          onError: (error) => {
            captureException(error);
            toast.error(error.message);
          },
        }
      );
    },
    [challenge, user, increasePointMutation]
  );

  if (isLoading || !challenge) {
    return (
      <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
        <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>⌛</Typography>
        <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Challenge wird geladen...</Typography>
      </Box>
    );
  }

  return <div>
    <AppBar
      className='!border-b !shadow-sm'
      title={challenge.name}
      user={user}
    />
    <main className='flex-1 size-full pb-safe-bottom'>
      <PullToRefresh onRefresh={() => refetch()}>
        <Tabs defaultValue={"activity"} className="w-full mt-6">
          <TabsList className="grid w-full flex grid-cols-3 bg-white border !h-12 shadow-sm">
            <TabsTrigger value="activity" className="h-10 data-[state=active]:bg-primary/5 flex-1">Aktivität</TabsTrigger>
            <TabsTrigger value="leaderboard" className="h-10 data-[state=active]:bg-primary/5 flex-1">Leaderboard</TabsTrigger>
          </TabsList>
          <div className="pt-4">
            <TabsContent value={"activity"} className="space-y-4 m-0">
              <ChallengeActivityListShadcn challenge={challenge} />
            </TabsContent>

            <TabsContent value={"leaderboard"} className="space-y-4 m-0">
              <div></div>
            </TabsContent>
          </div>
        </Tabs>
      </PullToRefresh>
    </main>
    <Has perm={'challenges.stats.write'}>
      <div
        className="fixed right-6 z-50"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-primary text-primary-foreground transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-md"
          onClick={async () => {
            if (challenge) {
              const result = await dialogs.open(EnterPointDialog, {
                dates: user_challenge_stats.map((x) => x.created_at),
                maxEntriesPerWeek: challenge.max_points_per_week,
                maxEntriesPerDay: challenge.max_points_per_day,
                comments_enabled: challenge.comments_enabled,
                category_enabled: challenge.category_enabled,
                category_options: challenge.category_options
              });

              if (result)
                increaseChallengePoint(result.date, result.image, result.count, result.comment, result.category);
            }
          }}
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Neuen Challengepunkt erstellen</span>
        </Button>
      </div>
    </Has>
  </div>
  // return (
  //   <Layout
  //     appBarConfig={{ title: challenge?.name, navigateBackPath: '/challenges/list', showProfile: true }}
  //     appBarActions={
  //       <Has perm={['challenge.manage']} any>
  //         <>
  //           <IconButton sx={{ color: 'primary.contrastText', pr: 0 }} onClick={(e) => setAnchorEl(e.currentTarget)}>
  //             <MoreVert />
  //           </IconButton>
  //           <Menu
  //             id="simple-menu"
  //             anchorEl={anchorEl}
  //             keepMounted
  //             open={Boolean(anchorEl)}
  //             onClose={() => setAnchorEl(null)}
  //           >
  //             <Has perm={'challenge.manage'}>
  //               <MenuItem
  //                 disabled={isLoading}
  //                 onClick={async () => {
  //                   setAnchorEl(null);
  //                   const result = await dialogs.open(CreateOrUpdateChallengeDialog, { user, challenge });
  //                   console.log(result);
  //                   if (result) {
  //                     await updateChallengeMutation.mutateAsync(
  //                       { challenge: result },
  //                       {
  //                         onError: (error) =>
  //                           notifications.show('Challenge konnte nicht aktualisiert werden. ' + error.message, {
  //                             severity: 'error',
  //                           }),
  //                         onSuccess: () =>
  //                           notifications.show('Challenge wurde erfolgreich aktualisiert.', { severity: 'success' }),
  //                       }
  //                     );
  //                   }
  //                 }}
  //               >
  //                 <ListItemIcon>
  //                   <Edit />
  //                 </ListItemIcon>
  //                 <ListItemText primary={t('challenges.edit')} />
  //               </MenuItem>
  //             </Has>
  //           </Menu>
  //         </>
  //       </Has>
  //     }
  //   >
  //     <PullToRefresh onRefresh={() => refetch()}>
  //       <Alert sx={{ m: 2 }} severity={'info'}>
  //         {challenge?.description}
  //       </Alert>
  //       {challenge?.start_date && isBefore(new Date(), new Date(challenge.start_date)) && (
  //         <Alert sx={{ m: 2 }} severity={'info'}>
  //           {t('challenge.startsInFuture', { startDate: new Date(challenge.start_date) })}
  //         </Alert>
  //       )}
  //       {challenge?.automated && (
  //         <Alert sx={{ m: 2 }} severity={'info'}>
  //           {isLoading ? 'Challenge wird geladen...' : t('challenge.automatedChallenge')}
  //         </Alert>
  //       )}
  //       <Tabs
  //         value={value}
  //         onChange={(_e, v) => setValue(v)}
  //         indicatorColor="primary"
  //         textColor="inherit"
  //         variant="fullWidth"
  //       >
  //         <Tab label="Aktivität" />
  //         <Tab label="Leaderboard" />
  //       </Tabs>
  //       <TabPanel value={value} index={0} dir={theme.direction}>
  //         {challenge && <ChallengeActivityList challenge={challenge} />}
  //       </TabPanel>
  //       <TabPanel value={value} index={1} dir={theme.direction}>
  //         <ChallengeLeaderboard isLoading={isLeaderboardLoading} challenge_points={leaderboard} />
  //       </TabPanel>
  //     </PullToRefresh>
  //   </Layout>
  // );
};

export default withProfiler(ChallengeInformationShadcn);
