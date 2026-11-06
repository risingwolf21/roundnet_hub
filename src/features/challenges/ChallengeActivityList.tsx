import { ChallengeStatWithUser } from '@/types/supabaseTypes';
import { formatDateFromDatabase } from '@/utils';
import { useMemo } from 'react';

import { InfiniteScrollList } from '@/components/InfiniteScrollList';
import { ListSkeleton } from '@/components/list/ListParts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemContent, ItemDescription, ItemHeader, ItemTitle } from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { useInfiniteChallengeStats } from '@/tanstack/challenge';
import { format, isSameDay } from 'date-fns';
import groupBy from 'lodash.groupby';
import { Activity, BadgeCheck, ChevronDown, ChevronUp } from 'lucide-react';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Day, MonthCaption, Nav, Week } from 'react-day-picker';

export const ChallengeCalendar = ({ user_challenge_stats }: { user_challenge_stats: ChallengeStats[] }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date());

  const activeDates = user_challenge_stats.map((stat) => new Date(stat.created_at));

  const hasEntry = (date: Date) => activeDates.some((activeDate) => isSameDay(activeDate, date));

  return (
    <Item variant={"outline"} className="flex flex-col gap-0" >
      <ItemHeader className='flex justify-between w-full pb-2' onClick={() => {
        setIsOpen(!isOpen);
        setMonth(new Date());
      }}>
        <ItemTitle className='font-semibold'>
          {isOpen ? t('challenge.activity.month') : t('challenge.activity.week')}
        </ItemTitle>
        <Button variant={"ghost"} size={"icon-lg"} aria-label={isOpen ? t('challenge.activity.week') : t('challenge.activity.month')}>
          {isOpen ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </ItemHeader>
      <Separator />
      <ItemContent className="w-full">
        <Calendar
          mode="single"
          className="p-0 pt-2 w-full"
          month={month}
          onMonthChange={(m) => setMonth(m)}
          components={{
            // eslint-disable-next-line @eslint-react/no-nested-component-definitions
            Nav: ({ ...props }) => {
              if (!isOpen) return <></>
              return <Nav {...props} />
            },

            // eslint-disable-next-line @eslint-react/no-nested-component-definitions
            MonthCaption: ({ ...props }) => {
              if (!isOpen) return <></>
              return <MonthCaption {...props} />
            },

            // eslint-disable-next-line @eslint-react/no-nested-component-definitions
            Week: ({ children, week, ...props }) => {
              if (!isOpen && week.weekNumber.toString() !== format(new Date(), "I"))
                return <></>

              return <Week week={week} {...props}>
                {children}
              </Week>
            },

            // eslint-disable-next-line @eslint-react/no-nested-component-definitions
            Day: ({ ...props }) => {
              return <Day {...props} className='h-10 w-full' />
            },

            // eslint-disable-next-line @eslint-react/no-nested-component-definitions
            DayButton: ({ children, modifiers, day, ...props }) => {
              const isActive = hasEntry(day.date);
              return <CalendarDayButton day={day} modifiers={modifiers} {...props} disabled
                className='!opacity-100 h-10'>
                {
                  isActive ? <BadgeCheck className="size-8 text-success" /> : children
                }
              </CalendarDayButton>
            }

          }}
        />
      </ItemContent>
    </Item>
  );
};

type ChallengeActivityListProps = {
  challenge: Challenge;
  user_challenge_stats: ChallengeStats[];
};

export const ChallengeActivityList = ({ challenge, user_challenge_stats }: ChallengeActivityListProps) => {
  const { t, i18n } = useTranslation();
  const { data: stats, fetchNextPage, isFetchingNextPage, hasNextPage, isLoading } = useInfiniteChallengeStats(challenge.id);

  const days = useMemo(() => {
    const entries = (stats?.pages.flatMap((x) => x.data) ?? []) as ChallengeStatWithUser[];
    const grouped = groupBy(entries, (a) => {
      const date = formatDateFromDatabase(a.created_at);
      return date ? format(date, 'yyyy-MM-dd') : '';
    });
    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
  }, [stats]);

  const dayFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex flex-col gap-3">
      <ChallengeCalendar user_challenge_stats={user_challenge_stats} />
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : days.length === 0 ? (
        <Empty className="mt-4">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Activity />
            </EmptyMedia>
            <EmptyTitle>{t('challenge.info.activityEmpty')}</EmptyTitle>
            <EmptyDescription>{t('challenge.info.activityEmptyDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <InfiniteScrollList
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        >
          {days.map(([day, entries]) => (
            <section key={day} className="flex flex-col gap-2">
              <h3 className="px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {day ? dayFormat.format(new Date(`${day}T12:00:00`)) : ''}
              </h3>
              {entries.map((x) => (
                <Item key={x.id} variant="outline" className="flex-col items-stretch gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={x.fullUser.avatarUrl || undefined} alt={x.fullUser.displayName || undefined} />
                      <AvatarFallback>{x.fullUser.displayName?.[0] ?? 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate font-semibold">{x.fullUser.displayName || x.fullUser.name}</span>
                    <Badge variant="success">+{x.count}</Badge>
                  </div>
                  {(x.meta?.category || x.meta?.comment) && (
                    <div className="flex flex-col gap-1">
                      {x.meta.category && (
                        <div>
                          <Badge variant="secondary">{x.meta.category}</Badge>
                        </div>
                      )}
                      {x.meta.comment && <ItemDescription className="line-clamp-none">{x.meta.comment}</ItemDescription>}
                    </div>
                  )}
                  {x.image_url && (
                    <img
                      src={x.image_url}
                      alt=""
                      loading="lazy"
                      className="max-h-72 w-full rounded-lg object-cover"
                    />
                  )}
                </Item>
              ))}
            </section>
          ))}
        </InfiniteScrollList>
      )}
    </div>
  );
};
