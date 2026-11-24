import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useGrants } from '@/features/auth/GrantsContext';
import { FormSection } from '@/features/events/dialogs/EventFormParts';
import { PUSH_OPTED_OUT_KEY } from '@/features/push/WebPushKeeper';
import { isInstalled, promptInstall, useCanInstall } from '@/features/pwa/installPrompt';
import { Feature, Permission } from '@/generated/supabase-types';
import { Has } from '@/hooks/useGrants';
import { cn } from '@/lib/utils';
import { useGroups } from '@/tanstack/groups';
import { iOS } from '@/utils';
import {
  Ban,
  Bell,
  BellOff,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Download,
  Hourglass,
  Inbox,
  KeyRound,
  Languages,
  LayoutGrid,
  Lightbulb,
  LucideIcon,
  Medal,
  Megaphone,
  MousePointerClick,
  Receipt,
  RefreshCcw,
  Rocket,
  Send,
  Share2,
  Smartphone,
  Swords,
  ThumbsUp,
  Trophy,
  Users,
  Volleyball,
  Wine,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { AppBar } from './ui/appbar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from './ui/item';

type Gate = { feat?: Feature; perm?: Permission };

/** Other areas of the app, gated like their sidebar entries. */
const MORE: (Gate & { key: string; title: string; path: string; icon: LucideIcon })[] = [
  { key: 'matches', title: 'navigation.matches', path: '/matches/list', icon: Trophy, feat: 'games' },
  { key: 'leaderboard', title: 'navigation.leaderboard', path: '/matches/leaderboard', icon: Medal, feat: 'games' },
  { key: 'challenges', title: 'navigation.challenges', path: '/challenges/list', icon: Swords, feat: 'challenges' },
  { key: 'drinks', title: 'navigation.drinks', path: '/drinks/list', icon: Wine, feat: 'drinks', perm: 'drinks.select' },
  { key: 'keys', title: 'browse.keys', path: '/keys', icon: KeyRound, feat: 'items' },
  { key: 'costs', title: 'navigation.costs', path: '/costs', icon: Receipt, feat: 'costs' },
  { key: 'bundesliga', title: 'navigation.bundesliga', path: '/bundesliga', icon: ClipboardList, feat: 'bundesliga' },
];

const FAQ = ['push', 'missingEvent', 'cantAnswer', 'missingFeature', 'staleData', 'password', 'deleteAccount'];

type PushState = 'granted' | 'denied' | 'default' | 'off' | 'unsupported';

const pushState = (): PushState => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  if (localStorage.getItem(PUSH_OPTED_OUT_KEY)) return 'off';
  return Notification.permission;
};

const PUSH_BADGE = { granted: 'success', denied: 'error', default: 'secondary', off: 'secondary', unsupported: 'outline' } as const;

/** A help row: icon chip, short title, explanation. */
const Tip = ({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) => (
  <div className="flex gap-3">
    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
      <Icon className="size-4" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  </div>
);

/** Numbered steps; a done step shows a check instead of its number. */
const Steps = ({ steps, doneLabel }: { steps: { text: string; title?: string; done?: boolean }[]; doneLabel?: string }) => (
  <ol className="flex flex-col gap-3">
    {steps.map((step, index) => (
      <li key={step.text} className="flex gap-3">
        <span
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums',
            step.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          {step.done ? <Check className="size-4" aria-label={doneLabel} /> : index + 1}
        </span>
        <div className="min-w-0 flex-1 pt-1">
          {step.title && <p className={cn('text-sm font-medium', step.done && 'text-muted-foreground line-through')}>{step.title}</p>}
          <p className={cn('leading-relaxed', step.title ? 'text-xs text-muted-foreground' : 'text-sm')}>{step.text}</p>
        </div>
      </li>
    ))}
  </ol>
);

const Topic = ({ id, ...props }: React.ComponentProps<typeof FormSection> & { id: string }) => (
  <div id={id} className="scroll-mt-20">
    <FormSection {...props} />
  </div>
);

const AppInformation = () => {
  const { user, hasFeat, hasPerm } = useGrants();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canInstall = useCanInstall();
  const { data: groups = [] } = useGroups();

  const installed = isInstalled();
  const push = pushState();
  const hasGroup = (user?.groups.length ?? 0) > 0;
  const allowed = (gate: Gate) => (!gate.feat || hasFeat(gate.feat)) && (!gate.perm || hasPerm(gate.perm));
  const more = MORE.filter(allowed);

  const topics: { id: string; icon: LucideIcon; show?: boolean }[] = [
    { id: 'start', icon: Rocket },
    { id: 'install', icon: Download },
    { id: 'push', icon: Bell },
    { id: 'groups', icon: Users },
    { id: 'events', icon: Volleyball, show: hasFeat('events') },
    { id: 'more', icon: LayoutGrid, show: more.length > 0 },
    { id: 'tips', icon: Lightbulb },
    { id: 'faq', icon: CircleHelp },
  ];
  const visibleTopics = topics.filter((topic) => topic.show !== false);
  const title = (id: string) => t(`help.topics.${id}`);
  const icon = (id: string) => topics.find((topic) => topic.id === id)!.icon;
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="flex min-h-screen flex-col">
      <AppBar className="!border-b !shadow-sm" title={t('help.title')} user={user} />
      <main className="size-full flex-1 pb-safe-bottom">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4">
          {!hasGroup && (
            <section className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex gap-3">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Users className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t('help.noGroup.title')}</p>
                  <p className="text-xs text-muted-foreground">{t('help.noGroup.description')}</p>
                </div>
              </div>
              <Button size="lg" className="w-full" onClick={() => navigate('/groups/list')}>
                {t('help.noGroup.action')}
              </Button>
            </section>
          )}

          <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <CircleHelp className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-semibold">{import.meta.env.VITE_WEBSITE_NAME}</h1>
                {import.meta.env.VITE_APP_VERSION && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {t('help.version', { version: import.meta.env.VITE_APP_VERSION })}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{t('help.intro', { app: import.meta.env.VITE_WEBSITE_NAME })}</p>
            <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t('help.title')}>
              {visibleTopics.map(({ id, icon: Icon }) => (
                <Button
                  key={id}
                  variant="outline"
                  className="h-auto min-h-10 justify-start whitespace-normal px-3 py-2 text-left"
                  onClick={() => jump(id)}
                >
                  <Icon className="text-muted-foreground" />
                  <span className="min-w-0 hyphens-auto [overflow-wrap:anywhere]">{title(id)}</span>
                </Button>
              ))}
            </nav>
          </section>


          <Topic id="start" icon={icon('start')} title={title('start')}>
            <Steps
              doneLabel={t('help.start.done')}
              steps={[
                { title: t('help.start.groups.title'), text: t('help.start.groups.description'), done: hasGroup },
                { title: t('help.start.install.title'), text: t('help.start.install.description'), done: installed },
                { title: t('help.start.push.title'), text: t('help.start.push.description'), done: push === 'granted' },
                ...(hasFeat('events') ? [{ title: t('help.start.events.title'), text: t('help.start.events.description') }] : []),
              ]}
            />
          </Topic>

          <Topic id="install" icon={icon('install')} title={title('install')}>
            {installed ? (
              <p className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 shrink-0 text-success" />
                {t('help.install.installed')}
              </p>
            ) : iOS ? (
              <>
                <Steps steps={[1, 2, 3, 4].map((n) => ({ text: t(`help.install.ios.step${n}`) }))} />
                <p className="text-xs text-muted-foreground">{t('help.install.ios.pushNote')}</p>
              </>
            ) : (
              <>
                {canInstall && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">{t('help.install.promptHint')}</p>
                    <Button size="lg" className="w-full" onClick={promptInstall}>
                      <Download />
                      {t('pwa.install.action')}
                    </Button>
                  </div>
                )}
                <Steps steps={[1, 2, 3].map((n) => ({ text: t(`help.install.other.step${n}`) }))} />
              </>
            )}
          </Topic>

          <Topic id="push" icon={icon('push')} title={title('push')}>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{t('help.push.statusLabel')}</p>
                <Badge variant={PUSH_BADGE[push]} className="shrink-0">{t(`help.push.status.${push}`)}</Badge>
              </div>
              {push === 'denied' && <p className="text-xs text-muted-foreground">{t('help.push.deniedHint')}</p>}
              {push === 'unsupported' && <p className="text-xs text-muted-foreground">{t('help.push.unsupportedHint')}</p>}
            </div>
            <Tip icon={Bell} title={t('help.push.enable.title')}>{t('help.push.enable.description')}</Tip>
            {iOS && <Tip icon={Smartphone} title={t('help.push.ios.title')}>{t('help.push.ios.description')}</Tip>}
            <Tip icon={BellOff} title={t('help.push.off.title')}>{t('help.push.off.description')}</Tip>
            <Tip icon={Inbox} title={t('help.push.inbox.title')}>{t('help.push.inbox.description')}</Tip>
            <Button variant="secondary" size="lg" className="w-full" onClick={() => navigate('/user')}>
              {t('help.push.action')}
            </Button>
          </Topic>

          <Topic id="groups" icon={icon('groups')} title={title('groups')}>
            <Tip icon={Send} title={t('help.groups.join.title')}>{t('help.groups.join.description')}</Tip>
            <Tip icon={CalendarCheck} title={t('help.groups.content.title')}>{t('help.groups.content.description')}</Tip>
            <Tip icon={Users} title={t('help.groups.otherGroup.title')}>{t('help.groups.otherGroup.description')}</Tip>
            {groups.some((group) => group.user_group_role === 'admin') && (
              <Tip icon={Inbox} title={t('help.groups.requests.title')}>{t('help.groups.requests.description')}</Tip>
            )}
            <Button variant="secondary" size="lg" className="w-full" onClick={() => navigate('/groups/list')}>
              <Users />
              {t('help.groups.action')}
            </Button>
          </Topic>

          <Has feat="events">
            <Topic id="events" icon={icon('events')} title={title('events')}>
              <Tip icon={ThumbsUp} title={t('help.events.answer.title')}>{t('help.events.answer.description')}</Tip>
              <Has perm="event.signup.trainer">
                <Tip icon={Megaphone} title={t('help.events.trainer.title')}>{t('help.events.trainer.description')}</Tip>
              </Has>
              <Tip icon={CalendarClock} title={t('help.events.window.title')}>{t('help.events.window.description')}</Tip>
              <Tip icon={MousePointerClick} title={t('help.events.request.title')}>{t('help.events.request.description')}</Tip>
              <Tip icon={Hourglass} title={t('help.events.waitingList.title')}>{t('help.events.waitingList.description')}</Tip>
              <Tip icon={Ban} title={t('help.events.cancelled.title')}>{t('help.events.cancelled.description')}</Tip>
              <Tip icon={CalendarCheck} title={t('help.events.calendar.title')}>{t('help.events.calendar.description')}</Tip>

              <div className="flex flex-col gap-2 border-t pt-4">
                <p className="text-sm font-semibold">{t('help.events.pageTitle')}</p>
                <dl className="flex flex-col divide-y rounded-lg border">
                  {[
                    { tab: t('events.information.tabInformation'), text: t('help.events.tabs.details') },
                    { tab: t('events.information.tabAttendance'), text: t('help.events.tabs.people') },
                    { tab: t('events.bringItems.tab'), text: t('help.events.tabs.bring') },
                    { tab: t('events.information.tabComments'), text: t('help.events.tabs.chat') },
                    ...(hasFeat('games') ? [{ tab: t('events.information.tabMatches'), text: t('help.events.tabs.matches') }] : []),
                  ].map(({ tab, text }) => (
                    <div key={tab} className="flex flex-col gap-0.5 px-3 py-2.5">
                      <dt className="text-sm font-medium">{tab}</dt>
                      <dd className="text-xs text-muted-foreground">{text}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <Tip icon={Share2} title={t('help.events.share.title')}>{t('help.events.share.description')}</Tip>
              <Button variant="secondary" size="lg" className="w-full" onClick={() => navigate('/training/list')}>
                <Volleyball />
                {t('help.events.action')}
              </Button>
            </Topic>
          </Has>

          {more.length > 0 && (
            <Topic id="more" icon={icon('more')} title={title('more')}>
              <div className="-mx-2 flex flex-col">
                {more.map(({ key, title: label, path, icon: Icon }) => (
                  <Item
                    key={key}
                    size="sm"
                    className="cursor-pointer text-left hover:bg-muted"
                    render={<button type="button" onClick={() => navigate(path)} />}
                  >
                    <ItemMedia variant="icon">
                      <Icon />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{t(label)}</ItemTitle>
                      <ItemDescription>{t(`help.more.${key}`)}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </ItemActions>
                  </Item>
                ))}
              </div>
            </Topic>
          )}

          <Topic id="tips" icon={icon('tips')} title={title('tips')}>
            <Tip icon={RefreshCcw} title={t('help.tips.pull.title')}>{t('help.tips.pull.description')}</Tip>
            <Tip icon={RefreshCcw} title={t('help.tips.reload.title')}>{t('help.tips.reload.description')}</Tip>
            <Tip icon={Rocket} title={t('help.tips.updates.title')}>{t('help.tips.updates.description')}</Tip>
            {!iOS && <Tip icon={Smartphone} title={t('help.tips.shortcuts.title')}>{t('help.tips.shortcuts.description')}</Tip>}
            <Tip icon={Languages} title={t('help.tips.language.title')}>{t('help.tips.language.description')}</Tip>
          </Topic>

          <Topic id="faq" icon={icon('faq')} title={title('faq')}>
            <Accordion className="-my-2">
              {FAQ.map((key) => (
                <AccordionItem key={key} value={key}>
                  <AccordionTrigger className="text-sm">{t(`help.faq.${key}.title`)}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{t(`help.faq.${key}.answer`)}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Topic>
        </div>
      </main>
    </div>
  );
};

export default AppInformation;
