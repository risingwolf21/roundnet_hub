import { useInfiniteUserHistory } from '@/tanstack/drinks';
import { useGrants } from '../auth/GrantsContext';
import { HistoryScreen } from './HistoryScreen';

const HistoryScreenProvider = () => {
  const { user } = useGrants();
  const history = useInfiniteUserHistory(user.id);

  return <HistoryScreen user={user} {...history} />
};

export default HistoryScreenProvider;
