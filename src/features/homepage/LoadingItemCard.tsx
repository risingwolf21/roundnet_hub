import { Box, Card, CardActions, Skeleton } from '@mui/material';
import React from 'react';

export const LoadingItemCard = ({ index }: { index: number }) => {
  return (
    <Card
      key={index}
      elevation={3}
      sx={{
        width: 200,
        flexShrink: 0,
        p: 0,
      }}
    >
      <Box sx={{ pt: 2, pl: 2, pr: 2 }}>
        <Skeleton width={'100%'} height={'28px'} variant="rectangular" />

        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', mb: 1, mt: 1 }}>
          <Box sx={{ mr: 1 }}>
            <Skeleton width={40} height={40} variant="rectangular" sx={{ borderRadius: 2 }} />
          </Box>
          <Skeleton width={'100%'} height={'24px'} variant="rectangular" />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', mb: 1 }}>
          <Box sx={{ mr: 1 }}>
            <Skeleton width={40} height={40} variant="rectangular" sx={{ borderRadius: 2 }} />
          </Box>
          <Skeleton width={'100%'} height={'24px'} variant="rectangular" />
        </Box>
      </Box>
      <CardActions>
        <Skeleton width={'75px'} height={'25px'} variant="rectangular" sx={{ ml: 1 }} />
      </CardActions>
    </Card>
  );
};
