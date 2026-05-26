import { Navigate, useParams } from "react-router";
import ChallengeInformation from "./ChallengeInformation";

const ChallengeInformationProvider = () => {
  const { challengeId } = useParams();

  if (!challengeId) return <Navigate to="/challenges/list" />;

  return <ChallengeInformation challengeId={challengeId} />
};

export default ChallengeInformationProvider;