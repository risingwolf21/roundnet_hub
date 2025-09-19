import { Box, Button, Card, CardActions, Skeleton } from '@mui/material';

export const LoadingDrinkCard = ({ index }: { index: number }) => {
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
      <Box sx={{ display: 'flex' }}>
        <Box sx={{ flex: 1, m: 2 }}>
          <Skeleton variant="rectangular" width="100%" height={'32px'} />
        </Box>
        <Skeleton variant="rectangular" width={100} height={100} />
      </Box>
      <CardActions>
        <Button color="primary" disabled>
          Kaufen
        </Button>
      </CardActions>
    </Card>
  );
};
