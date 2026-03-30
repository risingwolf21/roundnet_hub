import Layout from '@/components/layout/Layout';
import PublicGroupList from './PublicGroupList';
import { PublicGroupListShadcn } from './PublicGroupList.shadcn';

const PublicGroupListPage = ({ isShadcn }: { isShadcn: boolean }) => {
  if (isShadcn) {
    return <PublicGroupListShadcn />
  }
  return (
    <Layout>
      <PublicGroupList />
    </Layout>
  );
};
export default PublicGroupListPage;
