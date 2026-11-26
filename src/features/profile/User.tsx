import { AppBar } from "@/components/ui/appbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AVAILABLE_FEATURES } from "@/contexts/FeatureToggleContext";
import { Feature } from "@/generated/supabase-types";
import { useUserAttendanceInMonth } from "@/tanstack/events";
import { usePlayer } from "@/tanstack/player_data";
import { getInitials } from "@/utils";
import { Bell, CalendarIcon, ChevronRight, FlaskConical, LogOut, RectangleEllipsis, User as UserIcon, Volleyball } from "lucide-react";
import { getMonth } from "date-fns";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useParams } from "react-router";
import { useGrants } from "../auth/GrantsContext";
import { AccountTab } from "./tabs/AccountTab";
import { CalendarTab } from "./tabs/CalendarTab";
import { ChangePasswordTab } from "./tabs/ChangePasswordTab";
import { isPushActiveOnThisDevice, NotificationsTab } from "./tabs/NotificationsTab";
import { PlayerzoneTab } from "./tabs/PlayerzoneTab";
import { TestLabTab } from "./tabs/TestLabTab";

export type SectionItem = {
  title: string;
  /** Second line of the overview row; Playerzone shows the RG ID instead. */
  description?: string;
  icon: React.ReactNode;
  disabled: boolean;
  /** Only shown when the user has this feature. */
  feat?: Feature;
};

// The keys are the URL of each section: /user/<key>.
const sections = {
  notifications: {
    title: "navigation.notifications",
    description: "profile.sections.notifications",
    icon: <Bell />,
    disabled: false,
  },
  calendar: {
    title: "profile.calendar.title",
    description: "profile.sections.calendar",
    icon: <CalendarIcon />,
    disabled: false,
    feat: "events",
  },
  playerzone: {
    title: "profile.tabs.playerzone",
    icon: <Volleyball />,
    disabled: false,
  },
  account: {
    title: "profile.tabs.account",
    description: "profile.sections.account",
    icon: <UserIcon />,
    disabled: false,
  },
  password: {
    title: "profile.password.title",
    icon: <RectangleEllipsis />,
    disabled: false,
  },
  testlab: {
    title: "profile.tabs.testlab",
    description: "profile.sections.testlab",
    icon: <FlaskConical />,
    disabled: AVAILABLE_FEATURES.length < 1,
  },
} satisfies Record<string, SectionItem>;

type SectionKey = keyof typeof sections;

// Settings people come for first, then the account itself.
const SECTION_GROUPS: SectionKey[][] = [
  ['notifications', 'calendar', 'playerzone'],
  ['account', 'password', 'testlab'],
];

const MAX_GROUP_CHIPS = 3;

const SectionRow = ({ to, icon, title, description, badge }: { to: string; icon: React.ReactNode; title: string; description?: string; badge?: React.ReactNode }) => (
  <Link
    to={to}
    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
  >
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">
      {icon}
    </span>
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-sm font-medium">{title}</span>
      {description && <span className="truncate text-xs text-muted-foreground">{description}</span>}
    </span>
    {badge}
    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
  </Link>
);

// Push state of this device; unknown until the service worker answers, then "On" or "Off".
const PushBadge = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState<boolean | null>(null);
  useEffect(() => {
    isPushActiveOnThisDevice().then(setActive);
  }, []);
  if (active === null) return null;
  return (
    <Badge variant={active ? 'success' : 'secondary'} className="shrink-0">
      {t(active ? 'profile.sections.pushOn' : 'profile.sections.pushOff')}
    </Badge>
  );
};

const User = () => {
  const { t } = useTranslation();
  const { section } = useParams();
  const { user, signOut, hasFeat } = useGrants();
  const { data: player_data = null } = usePlayer(user);

  const now = getMonth(new Date()) + 1;
  const { data: userAttendance = [] } = useUserAttendanceInMonth(user.id, now);

  const groups = user.groups ?? [];
  const isVisible = (key: SectionKey) => {
    const item: SectionItem = sections[key];
    return !item.disabled && (!item.feat || hasFeat(item.feat));
  };

  if (section) {
    if (!(section in sections) || !isVisible(section as SectionKey)) return <Navigate to="/user" replace />;
    const key = section as SectionKey;
    return (
      <div>
        <AppBar title={t(sections[key].title)} primaryAction="back" navigateBackPath="/user" />
        <main className='flex-1 size-full pb-safe-bottom'>
          <div className="flex flex-col gap-4 p-4">
            {key === 'account' && <AccountTab user={user} />}
            {key === 'password' && <ChangePasswordTab />}
            {key === 'playerzone' && <PlayerzoneTab user={user} player_data={player_data} />}
            {key === 'calendar' && <CalendarTab user={user} userAttendance={userAttendance} />}
            {key === 'notifications' && <NotificationsTab user={user} />}
            {key === 'testlab' && <TestLabTab />}
          </div>
        </main>
      </div>
    );
  }

  const describe = (key: SectionKey) => {
    if (key === 'playerzone') {
      return player_data?.rg_id ? t('profile.sections.rgId', { rgId: player_data.rg_id }) : t('profile.sections.playerzoneNotLinked');
    }
    const description: string | undefined = (sections[key] as SectionItem).description;
    return description && t(description);
  };

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

          {SECTION_GROUPS.map((keys) => keys.filter(isVisible)).filter((keys) => keys.length > 0).map((keys) => (
            <nav key={keys[0]} className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
              {keys.map((key) => (
                <SectionRow
                  key={key}
                  to={`/user/${key}`}
                  icon={sections[key].icon}
                  title={t(sections[key].title)}
                  description={describe(key)}
                  badge={key === 'notifications' ? <PushBadge /> : undefined}
                />
              ))}
            </nav>
          ))}

          <Button variant="outline" className='max-sm:w-full sm:self-start' onClick={signOut}>
            <LogOut />
            {t('profile.account.logout')}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default User;
