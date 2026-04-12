import Layout from '@/components/layout/Layout';
import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useInfiniteUserHistory } from '@/tanstack/drinks';
import { useGrants } from '../auth/GrantsContext';
import { HistoryScreen } from './HistoryScreen';
import { HistoryScreenShadcn } from './HistoryScreen.shadcn';

const HistoryScreenProvider = ({ isShadcn }: { isShadcn: boolean }) => {
  const { user } = useGrants();
  const history = useInfiniteUserHistory(user.id);

  if (isShadcn) {
    return <HistoryScreenShadcn user={user} {...history} />
  }

  return (
    <Layout>
      <PullToRefresh onRefresh={history.refetch}>
        <HistoryScreen user={user} {...history} />
      </PullToRefresh>
    </Layout>
  );
};

export default HistoryScreenProvider;
