import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useGrants } from '@/features/auth/GrantsContext';
import {
  useAddCostMutation,
  useDeleteCostMutation,
  useTournamentCosts,
  useUpdateCostMutation,
} from '@/tanstack/tournamentCosts';
import groupBy from 'lodash.groupby';
import {
  BedDouble,
  Bus,
  HelpCircle,
  Plus,
  Receipt,
  Ticket,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import { lazy, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FIXED_CATEGORIES } from './dialogs/AddEditCostDialog';

const AddEditCostDialog = lazy(() => import('./dialogs/AddEditCostDialog'));

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  transportation: <Bus className="size-4" />,
  fee: <Ticket className="size-4" />,
  food: <UtensilsCrossed className="size-4" />,
  accommodation: <BedDouble className="size-4" />,
  equipment: <Wrench className="size-4" />,
  other: <HelpCircle className="size-4" />,
};

const getCategoryIcon = (category: string) =>
  CATEGORY_ICONS[category] ?? <HelpCircle className="size-4" />;

const formatAmount = (amount: number) =>
  amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

const TournamentCostsPage = () => {
  const { t } = useTranslation();
  const { user } = useGrants();
  const dialogs = useDialogs();

  const { data: costs = [], isLoading } = useTournamentCosts(user?.id);
  const addCost = useAddCostMutation(user!.id);
  const updateCost = useUpdateCostMutation(user!.id);
  const deleteCost = useDeleteCostMutation(user!.id);

  const grouped = useMemo(
    () =>
      Object.entries(groupBy(costs, (c) => c.tournament)).sort(([a], [b]) =>
        a.localeCompare(b)
      ),
    [costs]
  );

  const grandTotal = useMemo(
    () => costs.reduce((sum, c) => sum + c.amount, 0),
    [costs]
  );

  const existingTournaments = useMemo(
    () => [...new Set(costs.map((c) => c.tournament))].sort(),
    [costs]
  );

  const openAdd = () => {
    dialogs.open(AddEditCostDialog, {
      existingTournaments,
      onSave: (data) => addCost.mutate(data),
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppBar
        title={t('costs.title')}
        user={user}
        primaryAction="back"
        actions={
          <Button variant="ghost" size="icon-lg" onClick={openAdd}>
            <Plus />
          </Button>
        }
      />

      <main className="flex-1 pb-safe-bottom">
        {isLoading ? (
          <div className="p-4 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-col gap-1 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : costs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 mt-16 text-center text-muted-foreground gap-3">
            <Receipt className="size-16 opacity-20" />
            <p className="font-semibold text-foreground/70">{t('costs.empty')}</p>
            <p className="text-sm">{t('costs.emptyDescription')}</p>
          </div>
        ) : (
          <div className="flex flex-col p-4 gap-6">
            {grouped.map(([tournament, entries]) => {
              const subtotal = entries.reduce((sum, e) => sum + e.amount, 0);
              return (
                <div key={tournament} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between px-2 mb-1">
                    <span className="text-sm font-semibold">{tournament}</span>
                    <span className="text-sm font-semibold">{formatAmount(subtotal)}</span>
                  </div>
                  {entries.map((entry) => {
                    const catKey = FIXED_CATEGORIES.includes(entry.category as never)
                      ? entry.category
                      : 'other';
                    const catLabel = FIXED_CATEGORIES.includes(entry.category as never)
                      ? t(`costs.categories.${entry.category}`)
                      : entry.category;

                    return (
                      <Item
                        key={entry.id}
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() =>
                          dialogs.open(AddEditCostDialog, {
                            entry,
                            existingTournaments,
                            onSave: (data) =>
                              updateCost.mutate({ id: entry.id, patch: data }),
                            onDelete: () => deleteCost.mutate(entry.id),
                          })
                        }
                      >
                        <ItemMedia>
                          <div className="flex items-center justify-center size-8 rounded-full bg-muted text-muted-foreground">
                            {getCategoryIcon(catKey)}
                          </div>
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>{catLabel}</ItemTitle>
                          {entry.description && (
                            <ItemDescription>{entry.description}</ItemDescription>
                          )}
                        </ItemContent>
                        <span className="text-sm font-medium ml-auto pr-1 shrink-0">
                          {formatAmount(entry.amount)}
                        </span>
                      </Item>
                    );
                  })}
                </div>
              );
            })}

            <div className="flex items-center justify-between px-2 pt-2 border-t mt-2">
              <span className="text-sm font-bold">{t('costs.total')}</span>
              <span className="text-sm font-bold">{formatAmount(grandTotal)}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TournamentCostsPage;
