import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { usePaymentHistory } from '@/tanstack/drinks';
import Layout from '../../components/layout/Layout';
import { useGrants } from '../auth/GrantsContext';
import PayDrinksScreen from './PayDrinksScreen';


const PayDrinks = () => {
  const { user } = useGrants();
  const result = usePaymentHistory(user.id);

  return (
    <Layout>
      <PullToRefresh onRefresh={result.refetch}>
        <PayDrinksScreen {...result} />
      </PullToRefresh>
    </Layout>
  );
};

export default PayDrinks;
