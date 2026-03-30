import { useFeature } from "@/contexts/FeatureToggleContext";
import { useGrants } from "../auth/GrantsContext";
import { UserScreen } from "./User";
import { UserShadcn } from "./User.shadcn";

const UserScreenProvider = () => {
  const { user, signOut } = useGrants();
  const isShadcn = useFeature("enableShadcnUI");

  if (isShadcn) {
    return <UserShadcn user={user} handleSignOut={signOut} />
  }

  return <UserScreen user={user} handleSignOut={signOut} />;
};
export default UserScreenProvider;