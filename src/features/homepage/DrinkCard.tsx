import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';

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
