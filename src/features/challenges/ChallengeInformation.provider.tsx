import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router";
import ChallengeInformation from "./ChallengeInformation";
import ChallengeInformationShadcn from "./ChallengeInformation.shadcn";

const ChallengeInformationProvider = ({ isShadcn }: { isShadcn: boolean }) => {
  const { challengeId } = useParams();
  const { t } = useTranslation();

  if (!challengeId) return <Navigate to="/challenges/list" />;

  if (isShadcn) {
    return <ChallengeInformationShadcn t={t} challengeId={challengeId} />
  }

  return <ChallengeInformation t={t} challengeId={challengeId} />;
};

export default ChallengeInformationProvider;