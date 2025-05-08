import EuroIcon from '@mui/icons-material/Euro';
import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Snackbar,
  Typography,
} from '@mui/material';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { PAYPAL_ME_ADDRESS } from '../../constants';
import { fetchDrinksToPayAsync, fetchPaymentAsync } from './slices/drinksSlice';
import { RootState, useAppDispatch } from '../../redux/store';
import { PaymentHistory } from '../../types/supabaseTypes';
import { groupBy } from '../../utils';
import { LoadingScreen } from '../../components/LoadingScreen';
import Layout from '../../components/Layout';
import { useApplication } from '../auth/AuthContext';

const PayDrinksButton = ({ amountToPay }: { amountToPay: number }) => {
  const onPayClick = () => {
    const newWindow = window.open(
      `https://www.paypal.me/${PAYPAL_ME_ADDRESS}/${amountToPay}EUR`,
      '_blank',
      'noopener,noreferrer'
    );
    if (newWindow) newWindow.opener = null;
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 'calc(16px + env(safe-area-inset-bottom))',
        left: 0,
        right: 0,
        flexDirection: 'column',
        justifyContent: 'end',
        display: 'flex',
        textAlign: 'center',
        pl: 2,
        pr: 2,
        pb: 2,
      }}
    >
      <Button
        variant="contained"
        fullWidth
        sx={{
          marginTop: 2,
          borderRadius: '50px !important',
          fontSize: '16px',
          fontFamily: 'sans-serif',
          lineSpacing: '24px',
        }}
        onClick={onPayClick}
        disabled={amountToPay === 0}
        startIcon={<EuroIcon />}
      >
        Mit Paypal bezahlen
      </Button>
    </Box>
  );
};

const PayDrinksScreenProvider = () => {
  const { user } = useApplication();
  const { paymentHistory, paymentError, paymentLoading } = useSelector((state: RootState) => state.drinks);

  return (
    <PayDrinksScreen
      user={user!}
      paymentHistory={paymentHistory ?? []}
      paymentError={paymentError ?? ''}
      paymentLoading={paymentLoading}
    />
  );
};

type PayDrinksScreenProps = {
  user: User;
  paymentHistory: PaymentHistory[];
  paymentError: string;
  paymentLoading: boolean;
};

const PayDrinksScreen = ({ user, paymentHistory, paymentError, paymentLoading }: PayDrinksScreenProps) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchDrinksToPayAsync({ userId: user.userId }));
    dispatch(fetchPaymentAsync({ userId: user.userId }));
  }, [dispatch, user]);

  if (paymentLoading) return <LoadingScreen />;

  return (
    <Layout>
      <Box>
        <List>
          {Array.from(
            groupBy(
              paymentHistory.filter((x) => !x.voucher),
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
          {paymentHistory.filter((x) => x.voucher).length > 0 &&
            [
              paymentHistory
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
          {paymentHistory.length > 0 && (
            <>
              <Divider />
              <ListItem
                key={'totalAmount'}
                secondaryAction={
                  <Typography sx={{ fontWeight: 'bold' }}>
                    {paymentHistory.filter((x) => !x.voucher).reduce((prev, curr) => prev + (curr.amount ?? 0), 0)} €
                  </Typography>
                }
              >
                <ListItemText primaryTypographyProps={{ fontWeight: 'bold' }} primary={'Gesamtkosten'} />
              </ListItem>
            </>
          )}
        </List>

        {paymentHistory.length <= 0 && (
          <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
            <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>📖</Typography>
            <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Einträge gefunden</Typography>
          </Box>
        )}
      </Box>
      {paymentHistory.length > 0 && (
        <PayDrinksButton
          amountToPay={
            paymentHistory.filter((x) => !x.voucher).reduce((prev, curr) => prev + (curr.amount ?? 0), 0) ?? 0
          }
        />
      )}

      <Snackbar
        sx={{ position: 'fixed', right: '16px', bottom: 'calc(16px + env(safe-area-inset-bottom))' }}
        open={paymentError !== ''}
      >
        <Alert severity={'error'} sx={{ width: '100%' }}>
          {paymentError}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default PayDrinksScreenProvider;
