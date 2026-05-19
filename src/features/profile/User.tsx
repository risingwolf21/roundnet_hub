import { AppBar } from "@/components/ui/appbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AVAILABLE_FEATURES } from "@/contexts/FeatureToggleContext";
import { useUserAttendanceInMonth } from "@/tanstack/events";
import { usePlayer } from "@/tanstack/player_data";
import { Bell, CalendarIcon, FlaskConical, RectangleEllipsis, User as UserIcon, Volleyball } from "lucide-react";
import { getMonth } from "date-fns";
import { useGrants } from "../auth/GrantsContext";
import { AccountTab } from "./tabs/AccountTab";
import { CalendarTab } from "./tabs/CalendarTab";
import { ChangePasswordTab } from "./tabs/ChangePasswordTab";
import { NotificationsTab } from "./tabs/NotificationsTab";
import { PlayerzoneTab } from "./tabs/PlayerzoneTab";
import { TestLabTab } from "./tabs/TestLabTab";

export type TabItem = {
  title: string;
  icon: React.ReactNode;
  disabled: boolean;
};

export type SettingsTabs = {
  account: TabItem;
  changePassword: TabItem;
  playerzone: TabItem;
  calendar: TabItem;
  notifications: TabItem;
  testlab: TabItem;
};

const tabs: SettingsTabs = {
  account: {
    title: "Account",
    icon: <UserIcon />,
    disabled: false,
  },
  changePassword: {
    title: "Passwort ändern",
    icon: <RectangleEllipsis />,
    disabled: false,
  },
  playerzone: {
    title: "Playerzone Profil",
    icon: <Volleyball />,
    disabled: false,
  },
  calendar: {
    title: "Kalender",
    icon: <CalendarIcon />,
    disabled: false,
  },
  notifications: {
    title: "Benachrichtigungen",
    icon: <Bell />,
    disabled: false,
  },
  testlab: {
    title: "Test-Labor",
    icon: <FlaskConical />,
    disabled: AVAILABLE_FEATURES.length < 1,
  },
};

type Tab = keyof typeof tabs;

const User = () => {
  const { user, signOut } = useGrants();
  const { data: player_data = null } = usePlayer(user);

  const now = getMonth(new Date()) + 1;
  const { data: userAttendance = [] } = useUserAttendanceInMonth(user.id, now);

  return (
    <div>
      <AppBar title="Profil" />
      <main className='flex-1 size-full pb-safe-bottom'>
        <div className="flex flex-col px-4">
          <Tabs defaultValue="overview" className="gap-4">
            <TabsList variant="line" className="w-full justify-start overflow-x-auto no-scrollbar overscroll-none">
              {Object.entries(tabs).filter(([, tab]) => !tab.disabled).map(([key, { title, icon }]) => (
                <TabsTrigger key={key} value={key as Tab} className="flex items-center gap-2">
                  {icon}
                  {title}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="account">
              <AccountTab user={user} handleSignOut={signOut} />
            </TabsContent>
            <TabsContent value="changePassword">
              <ChangePasswordTab />
            </TabsContent>
            <TabsContent value="playerzone">
              <PlayerzoneTab user={user} player_data={player_data} />
            </TabsContent>
            <TabsContent value="calendar">
              <CalendarTab user={user} userAttendance={userAttendance} />
            </TabsContent>
            <TabsContent value="notifications">
              <NotificationsTab user={user} />
            </TabsContent>
            <TabsContent value="testlab">
              <TestLabTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default User;
