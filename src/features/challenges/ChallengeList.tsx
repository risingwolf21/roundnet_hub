import { Add } from '@mui/icons-material';
import { Box, Card, CardActionArea, Fab, LinearProgress, List, ListItem, ListItemText, Typography } from '@mui/material';
import { useDialogs } from '@toolpad/core';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import Layout from '../../components/Layout';
import { RootState, useAppDispatch } from '../../redux/store';
import { CreateChallengeDialog } from './dialogs/CreateChallengeDialog';
import {
  challengeSelector,
  fetchChallengesAsync
} from './slices/challengeSlice';
import { useApplication } from '../auth/AuthContext';

const ChallengeListProvider = () => {
  const dispatch = useAppDispatch();
  const { user } = useApplication();
  const challenges = useSelector((state: RootState) => challengeSelector.selectAll(state));

  useEffect(() => {
    dispatch(fetchChallengesAsync());
  }, [dispatch]);

  if (!user)
    return <></>

  return <ChallengeList loading={false} challenges={challenges} user={user} />;
};

type ChallengeListProps = {
  loading: boolean;
  challenges: Challenge[];
  user: User
};

const ChallengeList = ({ loading, challenges, user }: ChallengeListProps) => {
  const navigate = useNavigate();
  const dialogs = useDialogs();

  return (
    <Layout>
      {loading && <LinearProgress sx={{ position: 'fixed', top: 56, left: 0, right: 0 }} />}
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

export default ChallengeListProvider;
