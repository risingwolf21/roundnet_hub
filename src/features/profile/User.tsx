import { AppBar } from "@/components/ui/appbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AVAILABLE_FEATURES } from "@/contexts/FeatureToggleContext";
import { Feature } from "@/generated/supabase-types";
import { useUserAttendanceInMonth } from "@/tanstack/events";
import { usePlayer } from "@/tanstack/player_data";
import { getInitials } from "@/utils";
import { Bell, CalendarIcon, FlaskConical, RectangleEllipsis, User as UserIcon, Volleyball } from "lucide-react";
import { getMonth } from "date-fns";
import { useTranslation } from "react-i18next";
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
  /** Only shown when the user has this feature. */
  feat?: Feature;
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
    title: "profile.tabs.account",
    icon: <UserIcon />,
    disabled: false,
  },
  changePassword: {
    title: "profile.password.title",
    icon: <RectangleEllipsis />,
    disabled: false,
  },
  playerzone: {
    title: "profile.tabs.playerzone",
    icon: <Volleyball />,
    disabled: false,
  },
  calendar: {
    title: "profile.calendar.title",
    icon: <CalendarIcon />,
    disabled: false,
    feat: "events",
  },
  notifications: {
    title: "navigation.notifications",
    icon: <Bell />,
    disabled: false,
  },
  testlab: {
    title: "profile.tabs.testlab",
    icon: <FlaskConical />,
    disabled: AVAILABLE_FEATURES.length < 1,
  },
};

const MAX_GROUP_CHIPS = 3;

const User = () => {
  const { t } = useTranslation();
  const { user, signOut, hasFeat } = useGrants();
  const { data: player_data = null } = usePlayer(user);

  const now = getMonth(new Date()) + 1;
  const { data: userAttendance = [] } = useUserAttendanceInMonth(user.id, now);

  const groups = user.groups ?? [];
  const visibleTabs = Object.entries(tabs).filter(([, tab]) => !tab.disabled && (!tab.feat || hasFeat(tab.feat)));

  return (
    <div>
      <AppBar title={t('profile.title')} />
      <main className='flex-1 size-full pb-safe-bottom'>
        <div className="flex flex-col gap-4 p-4">
          <section className="flex items-center gap-4 rounded-xl border bg-card p-4">
            <Avatar className="size-16 shrink-0">
              <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
              <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                {getInitials(user.displayName || user.name || 'User')}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold leading-tight">{user.displayName}</h1>
                <p className="truncate text-sm text-muted-foreground">{user.name}</p>
              </div>
              {groups.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {groups.slice(0, MAX_GROUP_CHIPS).map((group) => (
                    <Badge key={group.id} variant="outline" className="max-w-full">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                      <span className="truncate">{group.name}</span>
                    </Badge>
                  ))}
                  {groups.length > MAX_GROUP_CHIPS && (
                    <span className="text-xs text-muted-foreground">+{groups.length - MAX_GROUP_CHIPS}</span>
                  )}
                </div>
              )}
            </div>
          </section>

          <Tabs defaultValue="account" className="gap-4">
            <TabsList variant="line" className="w-full justify-start overflow-x-auto no-scrollbar overscroll-none">
              {visibleTabs.map(([key, { title, icon }]) => (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  {icon}
                  {t(title)}
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
