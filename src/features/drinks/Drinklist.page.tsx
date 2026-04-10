import Layout from '@/components/layout/Layout';
import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useDrinks } from '@/tanstack/drinks';
import DrinkListScreen from './DrinkListScreen';
import DrinkListScreenShadcn from './DrinkListScreen.shadcn';

const DrinkListScreenProvider = ({ isShadcn }: { isShadcn: boolean }) => {
  const drinks = useDrinks();

  if (isShadcn) {
    return <DrinkListScreenShadcn />
  }

  return (
    <Layout>
      <PullToRefresh onRefresh={drinks.refetch}>
        <DrinkListScreen {...drinks} />
      </PullToRefresh>
    </Layout>
  );
};

export default DrinkListScreenProvider;
