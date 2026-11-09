import { PullToRefresh } from '@/components/PullToRefresh';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History } from 'types/supabase';

import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemMedia } from '@/components/ui/item';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useAllPayments, useConfirmPaymentMutation } from '@/tanstack/admin';
import { useGrants } from '../auth/GrantsContext';
import { ConfirmPaymentDialog } from './dialogs/ConfirmPaymentDialog';

const PaymentsPendingAdmin = () => {
  const { t } = useTranslation();
  const { user } = useGrants();
  const [searchString, setSearchString] = useState('');
  const dialogs = useDialogs();

  const { data: payments = [], isLoading, refetch } = useAllPayments();
  const confirmPayment = useConfirmPaymentMutation();


  return <div>
    <AppBar
      className='!border-b !shadow-sm'
      user={user}
      showSearch
      searchPlaceholder={t('admin.payments.searchPlaceholder')}
      searchValue={searchString}
      onSearchChange={setSearchString}
    />
    <main className='flex-1 size-full pb-safe-bottom'>
      <PullToRefresh onRefresh={() => refetch()}>
        <div>
          {
            Object.values(payments)
              .filter(
                (x) =>
                  searchString === '' ||
                  ((x.user?.displayName ?? '').toLowerCase() + (x.user?.name ?? '').toLowerCase()).includes(
                    searchString.toLowerCase()
                  )
              )
              .sort((a, b) => (a.user.name > b.user.name ? 1 : -1))
              .map(x => (
                <Item key={x.id} className='rounded-none border-b-border'>
                  <ItemMedia>
                    <div>
                      {x.history.reduce((prev: number, curr: History) => prev + (curr.amount ?? 0), 0)} €
                    </div>
                  </ItemMedia>
                  <ItemContent className='ml-2'>
                    <div>
                      <div>{x.user?.name ?? x.user.email}</div>
                      <div className="text-xs text-muted-foreground">{x.user.name ? t('admin.payments.name') : t('admin.payments.email')}</div>
                    </div>
                  </ItemContent>
                  <ItemActions>
                    <Button variant={"outline"} onClick={async (event) => {
                      event.stopPropagation();
                      const result = await dialogs.open(ConfirmPaymentDialog, x);
                      if (result) {
                        confirmPayment.mutate({ payment: x });
                      }
                    }}>
                      {t('common.confirm')}
                    </Button>
                  </ItemActions>
                </Item>
              ))
          }
        </div>
      </PullToRefresh>
    </main>
  </div>
};

export default PaymentsPendingAdmin;
