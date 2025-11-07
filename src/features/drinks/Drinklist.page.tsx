import Layout from '@/components/layout/Layout';
import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useDrinks } from '@/tanstack/drinks';
import DrinkListScreen from './DrinkListScreen';


const DrinkListScreenProvider = () => {

  const drinks = useDrinks();

  return (
    <Layout>
      <PullToRefresh onRefresh={drinks.refetch}>
        <DrinkListScreen {...drinks} />
      </PullToRefresh>
    </Layout>
  );
};

export default DrinkListScreenProvider;
