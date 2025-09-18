import { Box, Button, Card, CardActions, CardContent, CardMedia, Typography } from '@mui/material';
import React from 'react';

export const DrinkCard = ({
  drink,
  index,
  insertHistory,
}: {
  drink: Drink;
  index: number;
  insertHistory: (drink: Drink) => void;
}) => {
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', flexDirection: 'row' }}>
          <CardContent sx={{ flex: '1 0 auto' }}>
            <Typography
              component="div"
              variant="h5"
              sx={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {drink.name}
            </Typography>
          </CardContent>
        </Box>
        <CardMedia component="img" sx={{ width: 100, height: '100%' }} image={drink.imageUrl || ''} alt="Drink image" />
      </Box>
      <CardActions>
        <Button
          color="primary"
          onClick={(event) => {
            event.stopPropagation();
            insertHistory(drink);
          }}
        >
          Kaufen
        </Button>
      </CardActions>
    </Card>
  );
};
