import { LinearProgress } from '@mui/material';
import React from 'react';

export const LoadingIndicator = ({ loading }: { loading: Boolean }) => {
  if (loading) {
    return <LinearProgress style={{ position: 'fixed', left: 0, right: 0, top: 56 }} />;
  }
  return null;
};
