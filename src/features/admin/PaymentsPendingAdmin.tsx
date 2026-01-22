import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import { useDialogs } from '@toolpad/core';
import { useState } from 'react';
import { History } from 'types/supabase';
import Layout from '../../components/layout/Layout';
import { ConfirmPaymentDialog } from './dialogs/ConfirmPaymentDialog';

import { Search, SearchIconWrapper, StyledInputBase } from '@/components/SearchBar';
import { useAllPayments, useConfirmPaymentMutation } from '@/tanstack/admin';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

const PaymentsPendingAdmin = () => {
  const [searchString, setSearchString] = useState('');
  const dialogs = useDialogs();

  const { data: payments = [], isLoading, refetch } = useAllPayments();
  const confirmPayment = useConfirmPaymentMutation();

  return (
    <Layout
      appBarContent={
        <Search sx={{ flexGrow: 1 }}>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <div>
            <StyledInputBase
              sx={{ width: '100% !important' }}
              placeholder="Suche nach einem Nutzer"
              inputProps={{ 'aria-label': 'search' }}
              value={searchString}
              onChange={(e: { target: { value: React.SetStateAction<string> } }) => setSearchString(e.target.value)}
            />
          </div>
        </Search>
      }
    >
      {isLoading && <LinearProgress style={{ position: 'fixed', left: 0, top: 56, right: 0 }} />}
      {payments && payments.length > 0 && (
        <PullToRefresh onRefresh={() => refetch()}>
          <List sx={{ width: '100%', pt: 0 }}>
            {Object.values(payments)
              .filter(
                (x) =>
                  searchString === '' ||
                  ((x.user?.displayName ?? '').toLowerCase() + (x.user?.name ?? '').toLowerCase()).includes(
                    searchString.toLowerCase()
                  )
              )
              .sort((a, b) => (a.user.name > b.user.name ? 1 : -1))
              .map((x) => (
                <ListItem
                  key={x.user.id}
                  divider
                  secondaryAction={
                    <IconButton
                      onClick={async (event) => {
                        event.stopPropagation();
                        const result = await dialogs.open(ConfirmPaymentDialog, x);
                        if (result) {
                          confirmPayment.mutate({ payment: x });
                        }
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
                  <ListItemText primary={x.user?.name ?? x.user.email} secondary={x.user.name ? 'Name' : 'Email'} />
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
    </Layout>
  );
};

export default PaymentsPendingAdmin;
