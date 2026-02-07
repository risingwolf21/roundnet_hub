import { useNotifications } from '@toolpad/core';
import { useEffect } from 'react';
import { LoadingScreen } from '../../components/LoadingScreen';

import { PaymentHistory } from '@/types/supabaseTypes';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { UseQueryResult } from '@tanstack/react-query';
import groupBy from 'lodash.groupby';

const PayDrinksScreen = ({
  data: history = [],
  isLoading,
  error,
  refetch,
}: UseQueryResult<PaymentHistory[], Error>) => {
  const notifications = useNotifications();

  useEffect(() => {
    if (error)
      notifications.show(error.message, { severity: 'error', actionText: 'Neu laden', onAction: () => refetch() });
  }, [error, notifications, refetch]);

  if (isLoading) return <LoadingScreen />;

  if (history.length <= 0) {
    return (
      <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
        <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>📖</Typography>
        <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Einträge gefunden</Typography>
      </Box>
    );
  }

  return (
    <>
      <Typography sx={{ mx: 2, mt: 1 }} fontWeight={'bold'}>
        Verlauf
      </Typography>
      {Object.entries(
        groupBy(
          history.filter((x) => !x.voucher),
          (x) => JSON.stringify(x.drink)
        )
      )
        .map(([key, value]) => {
          const drink = JSON.parse(key) as { id: string; name: string; price: number };
          console.log(drink);
          return {
            drink,
            count: value.reduce((prev, curr) => prev + (curr.count ?? 0), 0),
            priceSingle: drink.price ?? 'NaN',
            priceTotal: value.reduce((prev, curr) => prev + curr.count * drink.price, 0),
          };
        })
        .map((x) => (
          <ListItem key={x.drink.id} secondaryAction={<Typography>{x.priceTotal} €</Typography>}>
            <ListItemAvatar>
              <Typography>{x.count + ' x'}</Typography>
            </ListItemAvatar>
            <ListItemText primary={x.drink.name} secondary={x.priceSingle + ' €'} />
          </ListItem>
        ))}
      {history.filter((x) => x.voucher).length > 0 &&
        [
          history
            .filter((x) => x.voucher)
            .reduce(
              (prev, curr) => ({
                totalAmount: curr.amount + prev.totalAmount,
                count: curr.count + prev.count,
                name: curr.drink?.name ?? '',
              }),
              { totalAmount: 0, count: 0, name: '' } as { totalAmount: number; count: number; name: string }
            ),
        ].map((x) => (
          <ListItem key={'voucher'} secondaryAction={<Typography>{x.totalAmount} €</Typography>}>
            <ListItemAvatar>
              <Typography>{x.count + ' x'}</Typography>
            </ListItemAvatar>
            <ListItemText primary={x.name} secondary={'Gutscheine'} />
          </ListItem>
        ))}
      {history.length > 0 && (
        <>
          <Divider />
          <ListItem
            key={'totalAmount'}
            secondaryAction={
              <Typography sx={{ fontWeight: 'bold' }}>
                {history.filter((x) => !x.voucher).reduce((prev, curr) => prev + (curr.amount ?? 0), 0)} €
              </Typography>
            }
          >
            <ListItemText primaryTypographyProps={{ fontWeight: 'bold' }} primary={'Gesamtkosten'} />
          </ListItem>
        </>
      )}
    </>
  );
};

export default PayDrinksScreen;
