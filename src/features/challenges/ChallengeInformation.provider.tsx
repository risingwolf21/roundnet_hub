import { Navigate, useParams } from "react-router";
import ChallengeInformationShadcn from "./ChallengeInformation.shadcn";

const ChallengeInformationProvider = () => {
  const { challengeId } = useParams();

  if (!challengeId) return <Navigate to="/challenges/list" />;

  return <ChallengeInformationShadcn challengeId={challengeId} />
};

export default ChallengeInformationProvider;