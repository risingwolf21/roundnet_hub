import { TFunction } from 'i18next';
import React, { useEffect } from 'react';
import { withTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Navigate, useParams } from 'react-router-dom';
import { RootState, useAppDispatch } from '../../redux/store';
import { useAuth } from '../auth/AuthContext';
import { ChallengeInformation } from './ChallengeInformation';
import {
  challengeSelector,
  fetchChallengeStatsSingleAsync
} from './slices/challengeSlice';

const ChallengeInformationProvider = ({ t }: { t: TFunction }) => {
  const { challengeId } = useParams();
  const challenge = useSelector((root: RootState) => challengeSelector.selectById(root, challengeId ?? 0));
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!challengeId) return;
    dispatch(fetchChallengeStatsSingleAsync({ challengeId }));

  }, [dispatch, challengeId]);

  if (!challenge) return <Navigate to={'/challenges'} replace={true} />;

  return <ChallengeInformation t={t} challenge={challenge} user={user} />;
};

export default withTranslation()(ChallengeInformationProvider);
