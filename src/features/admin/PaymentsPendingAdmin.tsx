import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography
} from '@mui/material';
import TextField from '@mui/material/TextField';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDialogs } from '@toolpad/core';
import React, { useState } from 'react';
import { queryClient } from 'src/lib/queryClient';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import { supabase } from 'src/lib/supabase';
import { History } from 'types/supabase';
import Layout from '../../components/layout/Layout';
import { FullPayment } from '../../types/supabaseTypes';
import { ConfirmPaymentDialog } from './dialogs/ConfirmPaymentDialog';

export const useAllPayments = () => useQuery<FullPayment[]>({
  queryKey: ["payments", "admin"],
  queryFn: async () => {
    const response = await supabase
      .from('payments')
      .select('id, created_at, paymentState, amountToPay, userId, user (userId, displayName, name, email), history (*)')
      .eq('paymentState', 'Open' as PaymentState)
      .order('displayName', { referencedTable: 'user', ascending: true })
      .returns<FullPayment[]>();
    return response.data ?? [];
  }
});

export const useConfirmPaymentMutation = () => useMutation({
  mutationFn: async ({ payment }: { payment: FullPayment }) => {
    const result = await supabase
      .from('payments')
      .update({ paymentState: 'Fulfilled' as PaymentState })
      .eq('userId', payment?.user?.userId)
      .select("*")
      .single();

    return result.data;
  },
  onMutate: async ({ payment }) => {
    await queryClient.cancelQueries({ queryKey: ["payments", "admin"] });

    const previousPayments = queryClient.getQueryData<FullPayment[]>(["payments", "admin"]);

    if (previousPayments) {
      const newPayments = previousPayments.map(x => {
        if (x.userId === payment.user.userId) {
          return {
            ...x,
            paymentState: "FulFilled" as PaymentState
          }
        }
        return x
      })
      queryClient.setQueryData(["payments", "admin"], newPayments);
    }

    return { previousPayments }
  },
  onError: (err, _vars, context) => {
    if (context?.previousPayments) {
      queryClient.setQueryData(["payments", "admin"], context.previousPayments);
    }
  },
  onSettled: (data, error, variables, context) => {
    queryClient.invalidateQueries({ queryKey: ["payments", "admin"] });
  },
})


const PaymentsPendingAdmin = () => {
  const [searchString, setSearchString] = useState('');
  const dialogs = useDialogs();

  const { data: payments = [], isLoading, refetch } = useAllPayments();
  const confirmPayment = useConfirmPaymentMutation();

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
      {isLoading && <LinearProgress style={{ position: 'fixed', left: 0, top: 56, right: 0 }} />}
      {payments && payments.length > 0 && (
        <PullToRefresh onRefresh={() => refetch()}>
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
                      onClick={async (event) => {
                        event.stopPropagation();
                        const result = await dialogs.open(ConfirmPaymentDialog, x);
                        if (result) {
                          confirmPayment.mutate({ payment: x })
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
    </Layout>
  );
};

export default PaymentsPendingAdmin;
