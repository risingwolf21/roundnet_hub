import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { usePaymentHistory } from '@/tanstack/drinks';
import List from '@mui/material/List';
import Layout from '../../components/layout/Layout';
import { useGrants } from '../auth/GrantsContext';
import { PaymentInfo } from './components/PaymentInfo';
import PayDrinksScreen from './PayDrinksScreen';
import PayDrinksScreenShadcn from './PayDrinksScreen.shadcn';

const PayDrinks = ({ isShadcn }: { isShadcn: boolean }) => {
  const { user } = useGrants();
  const result = usePaymentHistory(user.id);

  if (isShadcn) {
    return <PayDrinksScreenShadcn />
  }

  const amountToPay =
    (result.data ?? []).filter((x) => !x.voucher).reduce((prev, curr) => prev + (curr.amount ?? 0), 0) ?? 0;

  return (
    <Layout>
      <PullToRefresh onRefresh={result.refetch}>
        <List>
          <PaymentInfo amountToPay={amountToPay} />
          <PayDrinksScreen {...result} />
        </List>
      </PullToRefresh>
    </Layout>
  );
};

export default PayDrinks;
