import Layout from '@/components/layout/Layout';
import { useGrants } from '../auth/GrantsContext';
import { HistoryScreen } from './HistoryScreen';


const HistoryScreenProvider = () => {
  const { user } = useGrants();

  return (
    <Layout>
      <HistoryScreen user={user} />
    </Layout>
  );
};

export default HistoryScreenProvider;
