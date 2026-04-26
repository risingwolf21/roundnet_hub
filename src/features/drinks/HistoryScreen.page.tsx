import { useInfiniteUserHistory } from '@/tanstack/drinks';
import { useGrants } from '../auth/GrantsContext';
import { HistoryScreenShadcn } from './HistoryScreen.shadcn';

const HistoryScreenProvider = () => {
  const { user } = useGrants();
  const history = useInfiniteUserHistory(user.id);

  return <HistoryScreenShadcn user={user} {...history} />
};

export default HistoryScreenProvider;
