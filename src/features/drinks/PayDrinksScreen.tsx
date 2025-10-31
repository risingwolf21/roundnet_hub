import EuroIcon from '@mui/icons-material/Euro';
import { useNotifications } from '@toolpad/core';
import { useEffect } from 'react';
import { LoadingScreen } from '../../components/LoadingScreen';
import { groupBy } from '../../utils';


import { PaymentHistory } from '@/types/supabaseTypes';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Fab from '@mui/material/Fab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { UseQueryResult } from '@tanstack/react-query';

const PayDrinksButton = ({ amountToPay }: { amountToPay: number }) => {
  const onPayClick = () => {
    const newWindow = window.open(
      `https://www.paypal.me/${import.meta.env.VITE_PAYPAL_ME_LINK}/${amountToPay}EUR`,
      '_blank',
      'noopener,noreferrer'
    );
    if (newWindow) newWindow.opener = null;
  };

  return (
    <Fab
      onClick={onPayClick}
      variant="extended"
      disabled={amountToPay === 0}
      sx={{
        color: '#fff',
        backgroundColor: (theme) => theme.palette.primary.main,
        position: 'fixed',
        right: '16px',
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
      }}
    >
      <EuroIcon sx={{ mr: 1 }} />
      Mit Paypal bezahlen
    </Fab>
  );
};


const PayDrinksScreen = ({ data: history = [], isLoading, error, refetch }: UseQueryResult<PaymentHistory[], Error>) => {
  const notifications = useNotifications();

  useEffect(() => {
    if (error)
      notifications.show(error.message, { severity: 'error', actionText: 'Neu laden', onAction: () => refetch() });
  }, [error, notifications, refetch]);

  if (isLoading) return <LoadingScreen />;

  if (history.length <= 0) {
    return <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
      <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>📖</Typography>
      <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Einträge gefunden</Typography>
    </Box>
  }

  return (
    <Box>
      <List>
        {Array.from(
          groupBy(
            history.filter((x) => !x.voucher),
            (x) => x.drink?.name ?? ''
          )
        )
          .map(([key, value]) => {
            return {
              name: key,
              count: value.reduce((prev, curr) => prev + (curr.count ?? 0), 0),
              priceSingle: value[0]?.drink?.price ?? 'NaN',
              priceTotal: value.reduce((prev, curr) => prev + (curr.count ?? 0), 0),
            };
          })
          .map((x, index) => (
            <ListItem key={'drinks' + index} secondaryAction={<Typography>{x.priceTotal} €</Typography>}>
              <ListItemAvatar>
                <Typography>{x.count + ' x'}</Typography>
              </ListItemAvatar>
              <ListItemText primary={x.name} secondary={x.priceSingle + ' €'} />
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
      </List>
      {history.length > 0 && (
        <PayDrinksButton
          amountToPay={history.filter((x) => !x.voucher).reduce((prev, curr) => prev + (curr.amount ?? 0), 0) ?? 0}
        />
      )}
    </Box>
  );
};

export default PayDrinksScreen;
