import { Refresh } from '@mui/icons-material';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  Fab,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import TextField from '@mui/material/TextField';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useClient } from 'react-supabase';
import { History } from 'types/supabase';
import Layout from '../../components/Layout';
import { SwipeableDialog } from '../../components/SwipeableDialog';
import { RootState, useAppDispatch } from '../../redux/store';
import { FullPayment } from '../../types/supabaseTypes';
import { fetchAdminsPaymentsAsync } from './slices/adminPaymentsSlice';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';

const PaymentsPendingAdmin = () => {
  const [open, setOpen] = useState(false);
  const [currentPayment, setPayment] = useState<FullPayment | null>(null);
  const [searchString, setSearchString] = useState('');
  const client = useClient();
  const dispatch = useAppDispatch();

  const { payments, error, loading } = useSelector((state: RootState) => state.adminPayments);

  useEffect(() => {
    dispatch(fetchAdminsPaymentsAsync({ client }));
  }, [client, dispatch]);


  const selectedPayment = (payment: FullPayment) => {
    setPayment(payment);
    setOpen(true);
  };

  const confirmPayment = (payment: FullPayment | null) => {
    if (!payment) return;
    client
      .from('payments')
      .update({ paymentState: 'Fulfilled' as PaymentState })
      .eq('userId', payment?.user?.userId)
      .then((res) => {
        setOpen(false);
      });
  };

  return (
    <Layout>
      <Box sx={{ px: 2, pt: 2 }}>
        <TextField
          fullWidth
          variant={'outlined'}
          placeholder={'Suche'}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
          onChange={(e) => setSearchString(e.target.value)}
          value={searchString}
        />
      </Box>
      {loading && <LinearProgress style={{ position: 'fixed', left: 0, top: 56, right: 0 }} />}
      {payments && payments.length > 0 && (
        <PullToRefresh onRefresh={() => dispatch(fetchAdminsPaymentsAsync({ client }))}>
          <List sx={{ width: '100%', pt: 0 }}>
            {Object.values(payments)
              .filter(
                (x) =>
                  searchString === '' || [(x.user?.displayName ?? '').toLowerCase(), (x.user?.name ?? '').toLowerCase()].includes(searchString.toLowerCase())
              )
              .sort((a, b) => a.user.name > b.user.name ? 1 : -1)
              .map((x, index) => (
                <ListItem
                  key={x.user.userId}
                  divider
                  secondaryAction={
                    <IconButton
                      onClick={(event) => {
                        selectedPayment(x);
                        event.stopPropagation();
                      }}
                    >
                      <CheckIcon />
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Typography fontWeight={'bold'}>
                      {x.history.reduce((prev: number, curr: History) => prev + (curr.amount ?? 0), 0)} €
                    </Typography>
                  </ListItemAvatar>
                  <ListItemText
                    primary={x.user?.name ?? x.user.email}
                    secondary={x.user.name ? 'Name' : 'Email'}
                  />
                </ListItem>
              ))}
            <ListItem key="spacer" sx={{ visibility: 'hidden' }}>
              <ListItemAvatar />
              <ListItemText primary="Shu shu shu, sha sha sha" secondary="EasterEgg" />
            </ListItem>
          </List>
        </PullToRefresh>
      )}
      {payments && payments.length < 1 && (
        <Grid
          container
          spacing={0}
          direction="column"
          alignItems="center"
          justifyContent="center"
          style={{ minHeight: '100vh' }}
        >
          <Typography>Keine aktiven Zahlungen gefunden</Typography>
        </Grid>
      )}
      <SwipeableDialog
        open={open}
        setOpen={setOpen}
        onClose={() => setOpen(false)}
        title="Zahlung bestätigen"
        actions={
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              flexGrow: 1,
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <Button
              variant="outlined"
              fullWidth
              sx={{
                ml: 2,
                mr: 1,
                mb: 2,
                borderRadius: '50px !important',
                fontSize: '16px',
                fontFamily: 'sans-serif',
                lineSpacing: '24px',
              }}
              onClick={() => setOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              variant="contained"
              fullWidth
              sx={{
                ml: 1,
                mr: 2,
                mb: 2,
                borderRadius: '50px !important',
                fontSize: '16px',
                fontFamily: 'sans-serif',
                lineSpacing: '24px',
              }}
              onClick={() => confirmPayment(currentPayment)}
              autoFocus
            >
              Bestätigen
            </Button>
          </Box>
        }
      >
        <Box sx={{ justifyContent: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
          <Typography>Hiermit bestätigst du, dass</Typography>
          <Typography fontWeight={'bold'}>{`${currentPayment?.user?.displayName}`}</Typography>
          <Typography fontWeight={'bold'}>{`${currentPayment?.user?.email}`}</Typography>
          <Typography>eine Zahlung in Höhe von</Typography>
          <Typography fontWeight={'bold'}>
            {`${currentPayment?.history?.reduce((prev: number, curr: History) => prev + (curr.amount ?? 0), 0)} €`}
          </Typography>
          <Typography>getätigt hat.</Typography>
        </Box>
      </SwipeableDialog>
    </Layout>
  );
};

export default PaymentsPendingAdmin;
