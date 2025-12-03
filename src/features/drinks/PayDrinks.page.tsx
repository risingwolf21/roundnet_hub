import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { usePaymentHistory } from '@/tanstack/drinks';
import Layout from '../../components/layout/Layout';
import { useGrants } from '../auth/GrantsContext';
import PayDrinksScreen from './PayDrinksScreen';

export type PaymentDTO = {
  type: 'paypal' | 'bank_transfer';
}

export type PayPalPaymentDTO = PaymentDTO & {
  type: 'paypal';
  paypalMeLink: string;
}

export type BankTransferDTo = PaymentDTO & {
  type: 'bank_transfer';
  recipient: string;
  iban: string;
  bic: string;
}

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
