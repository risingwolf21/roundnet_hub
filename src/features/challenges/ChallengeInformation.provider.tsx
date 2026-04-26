import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router";
import ChallengeInformationShadcn from "./ChallengeInformation.shadcn";

const ChallengeInformationProvider = () => {
  const { challengeId } = useParams();
  const { t } = useTranslation();

  if (!challengeId) return <Navigate to="/challenges/list" />;

  return <ChallengeInformationShadcn t={t} challengeId={challengeId} />
};

export default ChallengeInformationProvider;