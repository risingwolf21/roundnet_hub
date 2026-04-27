import { ChallengeStatWithUser } from '@/types/supabaseTypes';
import { formatDateFromDatabase } from '@/utils';
import { useMemo } from 'react';

import { InfiniteScrollList } from '@/components/InfiniteScrollList';
import { Item, ItemContent, ItemDescription, ItemHeader, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { useInfiniteChallengeStats } from '@/tanstack/challenge';
import { format, isSameDay } from 'date-fns';
import groupBy from 'lodash.groupby';
import { BadgeCheck, ChevronDown, ChevronUp } from 'lucide-react';

import { de } from 'date-fns/locale';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Day, MonthCaption, Nav, Week } from 'react-day-picker';

export const ChallengeCalendar = ({ user_challenge_stats }: { user_challenge_stats: ChallengeStats[] }) => {
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
          {isOpen ? "Monatsaktivität" : "Wochenaktivität"}
        </ItemTitle>
        <Button variant={"ghost"} size={"icon-lg"} >
          {isOpen ? <ChevronUp /> : <ChevronDown />}
        </Button>
      </ItemHeader>
      <Separator />
      <ItemContent className="w-full">
        <Calendar
          mode="single"
          locale={de}
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
  const { data: stats, fetchNextPage, isFetchingNextPage, hasNextPage } = useInfiniteChallengeStats(challenge.id);

  const sortedEntries = useMemo(() => {
    const grouped = groupBy(
      stats?.pages.flatMap((x) => x.data) ?? [],
      (a) => formatDateFromDatabase(a.created_at)?.toDateString() ?? ''
    );
    return Object.entries(grouped).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [stats]);

  return (
    <div>
      <ChallengeCalendar user_challenge_stats={user_challenge_stats} />
      <InfiniteScrollList
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      >
        {sortedEntries.map(([date, entries]: [string, ChallengeStatWithUser[]]) => (
          <div key={date}>
            <div className="text-sm font-semibold py-2 pl-1">
              {date}
            </div>
            <div className='flex flex-col gap-2 p-0'>
              {entries.map((x) => (
                <Item key={x.fullUser.id} variant={"outline"} className='p-2'>
                  <ItemContent>
                    <ItemTitle className="line-clamp-1 px-2">
                      {x.fullUser.name}
                    </ItemTitle>
                    <ItemDescription className='px-2'>
                      +{x.count}
                    </ItemDescription>

                    {
                      (x.meta?.category || x.meta?.comment) && <>
                        <Separator />
                        <ItemTitle className="line-clamp-1 font-semibold px-2">
                          {x.meta.category}
                        </ItemTitle>
                        <ItemDescription className='px-2'>
                          {x.meta.comment}
                        </ItemDescription>
                      </>
                    }
                  </ItemContent>
                  {
                    x.image_url && <ItemMedia variant="image" className='h-75 w-full max-w-1/2'>
                      <img
                        src={x.image_url}
                        loading='lazy'
                        className="w-full h-full"
                      />
                    </ItemMedia>
                  }
                </Item>
              ))}
            </div>
          </div>
        ))
        }
      </InfiniteScrollList >
    </div>
  );
};
