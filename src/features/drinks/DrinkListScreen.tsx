import { Has } from '@/hooks/useGrants';
import { useDeleteDrinkMutation, useDrinks, useInsertDrinkMutation, useInsertHistoryEntryMutation, useUpdateDrinkMutation } from '@/tanstack/drinks';
import { DrinkCounter } from '@/types/supabaseTypes';
import { groupBy, nameOfProductType } from '@/utils';
import { captureException } from '@sentry/react';
import { useMemo, useState } from 'react';
import { useGrants } from '../auth/GrantsContext';

import { ListError, ListSectionHeader, ListSkeleton } from '@/components/list/ListParts';
import { PullToRefresh } from '@/components/PullToRefresh';
import { Alert } from '@/components/ui/alert';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { useDialogs } from '@/contexts/DialogsProvider';
import { cn } from '@/lib/utils';
import { Check, CupSoda, Image, Minus, Pencil, PencilOff, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import EditDrinkDialog from './dialog/EditDrinkDialog';

export const EMPTY_DRINK: Drink = {
  imageUrl: '',
  name: '',
  price: 0,
  active: false,
  deleted: false,
  id: '',
  stock: 0,
  type: 'Drink',
};

const DrinkListScreen = () => {
  const { t, i18n } = useTranslation();
  const { user, hasPerm } = useGrants();
  const dialogs = useDialogs();
  const { data: drinks = [], error, refetch, isLoading } = useDrinks();

  const [toggleEdit, setToggleEdit] = useState(false);
  const [addedDrinks, setAddedDrinks] = useState<Record<string, DrinkCounter>>({});
  const [visibleTypes, setVisibleTypes] = useState<ProductType[]>(
    (localStorage.getItem('visibleTypes')?.split(';') as ProductType[]) ?? ['Drink']
  );

  const updateHistory = useInsertHistoryEntryMutation(user);
  const updateDrink = useUpdateDrinkMutation();
  const insertDrink = useInsertDrinkMutation();
  const deleteDrink = useDeleteDrinkMutation();

  const canPurchase = hasPerm('drinks.purchase');
  const money = useMemo(
    () => new Intl.NumberFormat(i18n.resolvedLanguage, { style: 'currency', currency: 'EUR' }),
    [i18n.resolvedLanguage]
  );

  const resetDrinks = (message: string) => {
    toast.error(message);
    captureException(Error(message), (scope) => {
      scope.clear();
      scope.setExtra('drinks', JSON.stringify(addedDrinks));
      return scope;
    });
  };

  const confirmDrinks = async () => {
    updateHistory.mutate(
      { drinks: Object.values(addedDrinks) },
      {
        onSuccess: () => {
          setAddedDrinks({});
          toast.success(t('drinks.bookSuccess'));
        },
        onError: (error) => {
          captureException(error);
          const message = error?.message ?? t('drinks.bookError');
          resetDrinks(message);
        },
      }
    );
  };

  const onAddDrinkClick = (drink: Drink) => {
    setAddedDrinks((prev) => {
      const existingDrink = prev[drink.id];
      return {
        ...prev,
        [drink.id]: existingDrink
          ? { ...existingDrink, count: existingDrink.count + 1 }
          : { ...drink, count: 1 },
      };
    });
  };

  const onRemoveDrinkClick = (drink: Drink) => {
    setAddedDrinks((prev) => {
      const existingDrink = prev[drink.id];
      if (!existingDrink) return prev;

      if (existingDrink.count <= 1) {
        const rest = { ...prev };
        delete rest[drink.id];
        return rest;
      }

      return {
        ...prev,
        [drink.id]: { ...existingDrink, count: existingDrink.count - 1 },
      };
    });
  };

  const toggleType = (type: ProductType) => {
    const newValue = visibleTypes.includes(type) ? visibleTypes.filter((y) => y !== type) : [...visibleTypes, type];
    setVisibleTypes(newValue);
    localStorage.setItem('visibleTypes', newValue.join(';'));
  };

  const sortedDrinks = [...drinks].sort((a, b) =>
    Number(b.active) - Number(a.active) ||
    (a.name ?? "").localeCompare(b.name ?? "", "de")
  );
  const filteredDrinks = sortedDrinks.filter((x: Drink) => visibleTypes.includes(x.type));
  // A real array: `.map` on a Map iterator needs iterator helpers (missing before Safari 18.4).
  const groupedDrinks = Array.from(groupBy(filteredDrinks, (x) => x.type).entries());
  const allTypes = [...new Set(drinks.map((x) => x.type))].sort();

  const addedItems = Object.values(addedDrinks);
  const totalCount = addedItems.reduce((sum, x) => sum + x.count, 0);
  const totalPrice = addedItems.reduce((sum, x) => sum + x.count * (x.price ?? 0), 0);

  const openEditDialog = async (drink: Drink) => {
    const result = await dialogs.open(EditDrinkDialog, { drink });
    if (!result) return;
    if (!drink.id) {
      insertDrink.mutate(result, {
        onSuccess: () => toast.success(t("drinks.addSuccess")),
        onError: (error) => toast.error(t("drinks.addError", { error: error.message })),
      });
    } else {
      updateDrink.mutate(result, {
        onSuccess: () => toast.success(t("drinks.updateSuccess")),
        onError: (error) => toast.error(t("drinks.updateError", { error: error.message })),
      });
    }
  };

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={t("drinks.drinks")}
        user={user}
        actions={
          <Has perm={"drinks.edit"}>
            <Button size={"icon-lg"} variant={"ghost"} aria-label={t('drinks.createDrink')} onClick={() => openEditDialog(EMPTY_DRINK)}>
              <Plus />
            </Button>
            <Button
              size={"icon-lg"}
              variant={toggleEdit ? "secondary" : "ghost"}
              aria-label={t('drinks.editMode')}
              aria-pressed={toggleEdit}
              onClick={() => setToggleEdit(!toggleEdit)}
            >
              {toggleEdit ? <PencilOff /> : <Pencil />}
            </Button>
          </Has>
        }
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh onRefresh={() => refetch()}>
          <div className='flex flex-col gap-2 p-2' style={{ paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}>

            {toggleEdit && (
              <Alert variant="info" className="mx-0">
                <Pencil />
                <div className="flex items-center justify-between gap-2">
                  <span>{t('drinks.editModeHint')}</span>
                  <Button size="sm" variant="outline" onClick={() => setToggleEdit(false)}>{t('drinks.editDone')}</Button>
                </div>
              </Alert>
            )}

            {!canPurchase && !isLoading && (
              <Alert variant="info">
                <CupSoda />
                <span>{t('drinks.noPurchasePermission')}</span>
              </Alert>
            )}

            {allTypes.length > 1 && (
              <div className="flex flex-wrap gap-2 px-1" role="group" aria-label={t('common.filter')}>
                {allTypes.map((type) => {
                  const active = visibleTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleType(type)}
                      className={cn(
                        'h-9 rounded-full border px-4 text-sm font-medium transition-colors',
                        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
                      )}
                    >
                      {nameOfProductType(type)}
                    </button>
                  );
                })}
              </div>
            )}

            {isLoading && <ListSkeleton rows={6} />}

            {!isLoading && error && (
              <ListError
                title={t('drinks.loadError')}
                description={error.message}
                retryLabel={t('challenge.list.retry')}
                onRetry={() => refetch()}
              />
            )}

            {!isLoading && !error && filteredDrinks.length === 0 && (
              <Empty className="mt-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><CupSoda /></EmptyMedia>
                  <EmptyTitle>{t("drinks.noDrinks")}</EmptyTitle>
                  <EmptyDescription>{t("drinks.noDrinksDescription")}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {!isLoading && !error && groupedDrinks.map(([key, mappedDrinks]) => (
              <section key={key} className="flex flex-col gap-2">
                {(groupedDrinks.length > 1 || allTypes.length > 1) && (
                  <ListSectionHeader title={nameOfProductType(key as ProductType)} count={mappedDrinks.length} />
                )}
                {mappedDrinks.map((drink: Drink) => {
                  const count = addedDrinks[drink.id]?.count ?? 0;
                  return (
                    <Item key={drink.id} variant="outline" className={cn(count > 0 && 'border-primary/40 bg-primary/5', !drink.active && 'opacity-70')}>
                      <ItemMedia>
                        <Avatar className="size-12">
                          <AvatarImage src={drink.imageUrl ?? undefined} />
                          <AvatarFallback>
                            <Image className="text-muted-foreground/50" />
                          </AvatarFallback>
                        </Avatar>
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{drink.name}</ItemTitle>
                        <ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium text-foreground">{money.format(drink.price ?? 0)}</span>
                          <Has perm="drinks.edit">
                            {!drink.active && <Badge variant="warning">{t('drinks.inactive')}</Badge>}
                            {drink.stock !== null && <Badge variant="outline">{t('drinks.stock', { count: drink.stock })}</Badge>}
                          </Has>
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        {toggleEdit ? (
                          <div className='flex flex-row items-center gap-2'>
                            <Button variant="outline" size="icon-lg" className="size-10" aria-label={t('drinks.editDrink')}
                              onClick={(e) => {
                                e.currentTarget.blur();
                                openEditDialog(drink);
                              }}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="destructive" size="icon-lg" className="size-10" aria-label={t('common.delete')}
                              onClick={() => {
                                dialogs.confirm(t("drinks.confirmDrinkDeletion")).then(result => {
                                  if (result) {
                                    deleteDrink.mutate(drink, {
                                      onSuccess: () => toast.success(t("drinks.deletionSuccess")),
                                      onError: (error) => toast.error(t("drinks.deletionError", { error: error.message }))
                                    })
                                  }
                                })
                              }}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          canPurchase && drink.active && (
                            <div className='flex flex-row items-center gap-2'>
                              {count > 0 && (
                                <>
                                  <Button variant="outline" size="icon-lg" className="size-10" aria-label={t('drinks.remove')}
                                    onClick={() => onRemoveDrinkClick(drink)}>
                                    <Minus className="size-4" />
                                  </Button>
                                  <span className="w-6 text-center text-xl font-semibold tabular-nums">{count}</span>
                                </>
                              )}
                              <Button variant={count > 0 ? 'default' : 'outline'} size="icon-lg" className="size-10" aria-label={t('drinks.add')}
                                onClick={() => onAddDrinkClick(drink)}>
                                <Plus className="size-4" />
                              </Button>
                            </div>
                          )
                        )}
                      </ItemActions>
                    </Item>
                  );
                })}
              </section>
            ))}
          </div>
        </PullToRefresh>
      </main>

      <Has perm={'drinks.purchase'}>
        {totalCount > 0 && (
          <div
            className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-4 pt-3 shadow-lg backdrop-blur"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto flex max-w-2xl items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-muted-foreground">{t('drinks.cartCount', { count: totalCount })}</div>
                <div className="text-lg font-semibold leading-tight">{money.format(totalPrice)}</div>
              </div>
              <Button variant="ghost" disabled={updateHistory.isPending} onClick={() => setAddedDrinks({})}>
                {t('drinks.clearCart')}
              </Button>
              <Button size="lg" disabled={updateHistory.isPending} onClick={confirmDrinks}>
                {updateHistory.isPending ? <Spinner /> : <Check />}
                {t('drinks.book')}
              </Button>
            </div>
          </div>
        )}
      </Has>
    </div>
  );
};

export default DrinkListScreen;
