import { ListError, ListSectionHeader, ListSkeleton, sideBar } from '@/components/list/ListParts';
import { PullToRefresh } from '@/components/PullToRefresh';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppBar } from '@/components/ui/appbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useCurrency } from '@/hooks/useCurrency';
import { Has } from '@/hooks/useGrants';
import { cn } from '@/lib/utils';
import { HistoryWithPayment } from '@/repository/DrinkRepository';
import { useUpdateHistoryEntryMutation } from '@/tanstack/drinks';
import { captureException } from '@sentry/react';
import { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { differenceInCalendarDays, format } from 'date-fns';
import { Pencil, ReceiptText, Ticket, Wallet } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { groupBy } from '../../utils';
import EditHistoryEntryDialog from './dialog/EditHistoryEntryDialog';

export const HistoryScreen = ({
  user,
  data: history,
  isLoading,
  isError,
  refetch,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
}: UseInfiniteQueryResult<InfiniteData<{ data: HistoryWithPayment[]; nextPage?: number }>> & { user: User }) => {
  const { t, i18n } = useTranslation();
  const formatCurrency = useCurrency();
  const updateEntry = useUpdateHistoryEntryMutation(user);
  const dialogs = useDialogs();
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [today] = useState(() => new Date());

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    });

    const node = loadMoreRef.current;
    if (node) observer.observe(node);

    return () => {
      if (node) observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const entries = useMemo(
    () => (history?.pages.flatMap((x) => x.data) ?? []).filter((x) => x.drink),
    [history]
  );
  const days = useMemo(
    () => Array.from(groupBy(entries, (x: HistoryWithPayment) => format(new Date(x.created_at ?? ''), 'yyyy-MM-dd'))),
    [entries]
  );
  const hasOpen = entries.some((x) => x.payments?.paymentState === 'Open' && !x.voucher);

  const dayLabel = (key: string) => {
    const date = new Date(`${key}T12:00:00`);
    const diff = differenceInCalendarDays(date, today);
    if (diff === 0 || diff === -1) {
      return new Intl.RelativeTimeFormat(i18n.resolvedLanguage, { numeric: 'auto' }).format(diff, 'day');
    }
    return new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  };

  const editEntry = async (entry: HistoryWithPayment) => {
    const result = await dialogs.open(EditHistoryEntryDialog, entry);
    if (!result) return;
    updateEntry.mutate(result, {
      onError: (error) => {
        captureException(error);
        toast.error(error.message);
      },
      onSuccess: () => {
        toast.success(t('drinks.entryUpdated'));
      },
    });
  };

  return (
    <div>
      <AppBar className="!border-b !shadow-sm" title={t('drinks.history.title')} user={user} />
      <main className="flex-1 size-full pb-safe-bottom">
        <PullToRefresh onRefresh={() => refetch()}>
          <div className="flex flex-col gap-3 p-4">
            {isLoading && <ListSkeleton rows={6} />}

            {!isLoading && isError && (
              <ListError
                title={t('drinks.history.loadError')}
                description={t('drinks.history.loadErrorDescription')}
                retryLabel={t('challenge.list.retry')}
                onRetry={() => refetch()}
              />
            )}

            {!isLoading && !isError && entries.length === 0 && (
              <Empty className="mt-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ReceiptText />
                  </EmptyMedia>
                  <EmptyTitle>{t('drinks.history.empty')}</EmptyTitle>
                  <EmptyDescription>{t('drinks.history.emptyDescription')}</EmptyDescription>
                </EmptyHeader>
                <Button variant="outline" onClick={() => navigate("/drinks/list")}>
                  {t('drinks.history.goToDrinks')}
                </Button>
              </Empty>
            )}

            {hasOpen && (
              <Has perm="drinks.view.own-payments">
                <Alert variant="warning">
                  <Wallet />
                  <AlertTitle>{t('drinks.history.openTitle')}</AlertTitle>
                  <AlertDescription>
                    <div className="flex flex-col items-start gap-2">
                      <span>{t('drinks.history.openDescription')}</span>
                      <Button size="sm" onClick={() => navigate("/drinks/payments")}>
                        {t('drinks.history.payNow')}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </Has>
            )}

            {days.map(([key, rows]) => {
              const total = rows.reduce((sum, x) => sum + (x.voucher ? 0 : (x.amount ?? 0)), 0);
              return (
                <section key={key} className="flex flex-col gap-2">
                  <ListSectionHeader
                    title={dayLabel(key)}
                    className="px-0 pt-1 first-letter:uppercase"
                  />
                  {rows.map((x) => {
                    const open = x.payments?.paymentState === 'Open';
                    const paid = x.payments?.paymentState === 'Fulfilled';
                    const editable = open && !x.voucher;
                    return (
                      <Item
                        key={x.id}
                        variant="outline"
                        className={cn(
                          'py-2',
                          sideBar(x.voucher ? 'info' : open ? 'warning' : paid ? 'success' : 'neutral')
                        )}
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold tabular-nums">
                          {x.count}×
                        </div>
                        <ItemContent>
                          <ItemTitle className="truncate">{x.drink.name}</ItemTitle>
                          <ItemDescription className="flex flex-wrap items-center gap-1.5">
                            <span>{format(new Date(x.created_at ?? ''), 'HH:mm')}</span>
                            {x.voucher ? (
                              <Badge variant="info">
                                <Ticket />
                                {t('drinks.history.voucher')}
                              </Badge>
                            ) : open ? (
                              <Badge variant="warning">{t('drinks.history.open')}</Badge>
                            ) : paid ? (
                              <Badge variant="success">{t('drinks.history.paid')}</Badge>
                            ) : null}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <span className="text-sm font-semibold tabular-nums">
                            {x.voucher ? t('drinks.history.free') : formatCurrency(x.amount)}
                          </span>
                          {editable && (
                            <Button
                              variant="outline"
                              size="icon-lg"
                              aria-label={t('drinks.editDrink')}
                              onClick={() => editEntry(x)}
                            >
                              <Pencil />
                            </Button>
                          )}
                        </ItemActions>
                      </Item>
                    );
                  })}
                  {rows.length > 1 && total > 0 && (
                    <div className="px-2 text-right text-xs text-muted-foreground">
                      {t('drinks.history.dayTotal', { total: formatCurrency(total) })}
                    </div>
                  )}
                </section>
              );
            })}

            {isFetchingNextPage && (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Spinner /> {t('drinks.loadMore')}
              </div>
            )}
            <div ref={loadMoreRef} className="h-10" />
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};
