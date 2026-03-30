import PublicGroupInformation from './PublicGroupInformation';
import { PublicGroupInformationShadcn } from './PublicGroupInformation.shadcn';

const PublicGroupInformationPage = ({ isShadcn }: { isShadcn: boolean }) => {
  if (isShadcn) {
    return <PublicGroupInformationShadcn />
  }
  return (
    <PublicGroupInformation />
  );
};

export default PublicGroupInformationPage;
