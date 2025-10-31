import Layout from '@/components/layout/Layout';
import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useInfiniteUserHistory } from '@/tanstack/drinks';
import { useGrants } from '../auth/GrantsContext';
import { HistoryScreen } from './HistoryScreen';


const HistoryScreenProvider = () => {
  const { user } = useGrants();
  const history = useInfiniteUserHistory(user.userId);

  return (
    <Layout>
      <PullToRefresh onRefresh={history.refetch}>
        <HistoryScreen user={user} {...history} />
      </PullToRefresh>
    </Layout>
  );
};

export default HistoryScreenProvider;
