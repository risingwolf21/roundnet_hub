import { Add } from '@mui/icons-material';
import { Box, Fab, LinearProgress, List, ListItem, ListItemText, Typography } from '@mui/material';
import { useDialogs } from '@toolpad/core';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import Layout from '../../components/Layout';
import { AppDispatch, RootState, useAppDispatch } from '../../redux/store';
import { useAuthentication } from '../auth/AuthContext';
import { CreateChallengeDialog } from './dialogs/CreateChallengeDialog';
import {
  challengeSelector,
  fetchChallengesAsync
} from './slices/challengeSlice';
import { withProfiler } from '@sentry/react';

const ChallengeListProvider = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuthentication();
  const challenges = useSelector((state: RootState) => challengeSelector.selectAll(state));
  const { loading } = useSelector((state: RootState) => state.challenges);

  useEffect(() => {
    dispatch(fetchChallengesAsync());
  }, [dispatch]);

  return <ChallengeList loading={loading} challenges={challenges} user={user} dispatch={dispatch} />;
};

type ChallengeListProps = {
  loading: boolean;
  challenges: Challenge[];
  user: User
  dispatch: AppDispatch
};

const ChallengeList = ({ loading, challenges, user, dispatch }: ChallengeListProps) => {
  const navigate = useNavigate();
  const dialogs = useDialogs();

  return (
    <Layout>
      {loading && <LinearProgress sx={{ position: 'fixed', top: 56, left: 0, right: 0 }} />}
      <PullToRefresh onRefresh={() => dispatch(fetchChallengesAsync())}>
        {challenges.length > 0 ? (
          <List sx={{ width: '100%' }}>
            {challenges.map((entry) => (
              <ListItem divider onClick={() => navigate('/challenges/' + entry.id)}>
                <ListItemText primary={entry.name} secondary={entry.description} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
            <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>🏅</Typography>
            <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Challenges gefunden</Typography>
          </Box>
        )}
      </PullToRefresh>
      <Fab
        sx={{
          background: '#66bb6a',
          position: 'fixed',
          right: '16px',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
        onClick={async () => {
          await dialogs.open(CreateChallengeDialog, { user });
        }}
      >
        <Add sx={{ color: 'white' }} />
      </Fab>
    </Layout>
  );
};

export default withProfiler(ChallengeListProvider);
