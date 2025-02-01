import { Box, LinearProgress, List, ListItem, ListItemText, Typography } from '@mui/material';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useClient } from 'react-supabase';
import Layout from '../../components/Layout';
import { RootState, useAppDispatch } from '../../redux/store';
import {
  challengeSelector,
  fetchChallengesAsync
} from './slices/challengeSlice';

const ChallengeListProvider = () => {
  const dispatch = useAppDispatch();
  const client = useClient();
  const challenges = useSelector((state: RootState) => challengeSelector.selectAll(state));

  useEffect(() => {
    dispatch(fetchChallengesAsync());

  }, [dispatch]);

  return <ChallengeList loading={false} challenges={challenges} />;
};

type ChallengeListProps = {
  loading: boolean;
  challenges: Challenge[];
};

const ChallengeList = ({ loading, challenges }: ChallengeListProps) => {
  const navigate = useNavigate();
  return (
    <Layout>
      {loading && <LinearProgress sx={{ position: 'fixed', top: 56, left: 0, right: 0 }} />}
      {challenges.length > 0 ? (
        <List sx={{ width: '100%' }}>
          {challenges.map((entry) => (
            <ListItem key={entry.id} onClick={() => navigate('/challenges/' + entry.id)}>
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
    </Layout>
  );
};

export default ChallengeListProvider;
