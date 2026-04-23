import { useFeature } from "@/contexts/FeatureToggleContext";
import { useUserAttendanceInMonth } from "@/tanstack/events";
import { getMonth } from "date-fns";
import { useGrants } from "../auth/GrantsContext";
import { UserScreen } from "./User";
import { UserShadcn } from "./User.shadcn";

const UserScreenProvider = () => {
  const { user, signOut } = useGrants();
  const isShadcn = useFeature("enableShadcnUI");

  const now = getMonth(new Date()) + 1; // getMonth() returns 0-11, we need 1-12 for the query

  const { data: userAttendance = [] } = useUserAttendanceInMonth(user.id, now);


  if (isShadcn) {
    return <UserShadcn user={user} handleSignOut={signOut} userAttendance={userAttendance} />
  }

  return <UserScreen user={user} handleSignOut={signOut} />;
};
export default UserScreenProvider;