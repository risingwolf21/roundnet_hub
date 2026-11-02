import { Has } from '@/hooks/useGrants';
import { useDeleteDrinkMutation, useDrinks, useInsertDrinkMutation, useInsertHistoryEntryMutation, useUpdateDrinkMutation } from '@/tanstack/drinks';
import { DrinkCounter } from '@/types/supabaseTypes';
import { groupBy, nameOfProductType } from '@/utils';
import { captureException } from '@sentry/react';
import { useEffect, useState } from 'react';
import { useGrants } from '../auth/GrantsContext';

import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldContent, FieldLabel, FieldTitle } from '@/components/ui/field';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { useDialogs } from '@/contexts/DialogsProvider';
import { cn } from '@/lib/utils';
import { t } from 'i18next';
import { Check, CupSoda, Funnel, Image, Minus, Pencil, PencilOff, Plus, Trash2 } from 'lucide-react';
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
  const { user } = useGrants();
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

  useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
  }, [error]);

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
          toast.success('Getränke erfolgreich gebucht!');
        },
        onError: (error) => {
          captureException(error);
          const message = error?.message ?? 'Drink could not be added';
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
        const { [drink.id]: _removedItem, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [drink.id]: { ...existingDrink, count: existingDrink.count - 1 },
      };
    });
  };

  const changeVisibleTypes = (checked: boolean, x: 'Drink' | 'Special' | 'None') => {
    const newValue = checked ? [...visibleTypes, x] : visibleTypes.filter((y) => y !== x);
    setVisibleTypes(newValue);
    localStorage.setItem('visibleTypes', newValue.join(';'));
  };

  const activeDrinks = [...drinks].sort((a, b) =>
    Number(b.active) - Number(a.active) ||
    (a.name ?? "").localeCompare(b.name ?? "", "de")
  );
  const filteredDrinks = activeDrinks.filter((x: Drink) => visibleTypes.includes(x.type));
  // A real array: `.map` on a Map iterator needs iterator helpers (missing before Safari 18.4).
  const groupedDrinks = Array.from(groupBy(filteredDrinks, (x) => x.type).entries());

  const addedDrinksCount = Object.keys(addedDrinks).length;
  const hasMultipleTypes = new Set(activeDrinks.map((x) => x.type)).size > 1;

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={t("drinks.drinks")}
        user={user}
        actions={
          <>
            <Has perm={"drinks.edit"}>
              <Button size={"icon-lg"} variant={"ghost"} onClick={async () => {
                const result = await dialogs.open(EditDrinkDialog, {
                  drink: EMPTY_DRINK
                });
                if (result) {
                  insertDrink.mutate(result, {
                    onSuccess: () => toast.success(t("drinks.addSuccess")),
                    onError: (error) => toast.error(t("drinks.addError", { error: error.message }))
                  })
                }
              }}>
                <Plus />
              </Button>
            </Has>
            <Has perm={"drinks.edit"}>
              <Button size={"icon-lg"} variant={"ghost"} onClick={() => setToggleEdit(!toggleEdit)}>
                {
                  toggleEdit ? <PencilOff /> : <Pencil />
                }
              </Button>
            </Has>
          </>
        }
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh
          onRefresh={() => {
            refetch();
          }}>

          <div className='p-2'>

            {isLoading && (
              Array.from({ length: 2 }).map((_, groupIndex) => (
                <div key={`skeleton-group-${groupIndex}`}>
                  <Skeleton className="h-5 w-32 ml-2 mb-2" />
                  {Array.from({ length: 3 }).map((_, itemIndex) => (
                    <div key={`skeleton-item-${itemIndex}`}>
                      <Item>
                        <ItemMedia>
                          <Skeleton className="size-10 rounded-full" />
                        </ItemMedia>
                        <ItemContent className="flex flex-col gap-2 w-full">
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-3 w-1/4" />
                        </ItemContent>
                        <ItemActions>
                          <div className="flex gap-2">
                            {toggleEdit ? (
                              <>
                                <Skeleton className="size-9 rounded-md" />
                                <Skeleton className="size-9 rounded-md" />
                              </>
                            ) : (
                              <Skeleton className="size-9 rounded-md" />
                            )}
                          </div>
                        </ItemActions>
                      </Item>
                      <Separator />
                    </div>
                  ))}
                </div>
              ))
            )}

            {!isLoading && filteredDrinks.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 mt-8 text-center text-muted-foreground">
                <CupSoda className="size-16 mb-4 opacity-20" />
                <h3 className="font-semibold text-lg mb-1 text-foreground/70">{t("drinks.noDrinks")}</h3>
                <p className="text-sm">{t("drinks.noDrinksDescription")}</p>
              </div>
            )}

            {
              !isLoading && groupedDrinks
                .map(([key, mappedDrinks]) => (
                  <div key={key}>
                    <div className="text-sm font-semibold ml-2">
                      {nameOfProductType(key as ProductType)}
                    </div>
                    {mappedDrinks.map((drink: Drink) => (
                      <div key={drink.id}>
                        <Item>
                          <ItemMedia>
                            <Avatar className="size-10">
                              <AvatarImage src={drink.imageUrl ?? undefined} />
                              <Has perm={"drinks.edit"}>
                                <AvatarBadge className={cn("text-primary-foreground text-xs top-0 right-0", {
                                  'bg-red-500': !drink.active,
                                  'bg-green-500': drink.active,
                                })} />
                              </Has>
                              <AvatarFallback>
                                <Image className="text-muted-foreground/50" />
                              </AvatarFallback>
                            </Avatar>
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{drink.name}</ItemTitle>
                            <ItemDescription>{(drink.price ?? 0).toFixed()} €</ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            {
                              !toggleEdit ? (
                                drink.active && <div className='flex flex-row items-center gap-2'>
                                  {
                                    (addedDrinks[drink.id]?.count ?? 0) > 0 &&
                                    <>
                                      <Button variant={"outline"} size="icon"
                                        onClick={() => onRemoveDrinkClick(drink)}>
                                        <Minus className="size-4" />
                                      </Button>
                                      <span className="text-xl font-semibold w-8 text-center">{addedDrinks[drink.id].count}</span>
                                    </>
                                  }
                                  <Button
                                    variant={"outline"} size="icon"
                                    onClick={() => onAddDrinkClick(drink)}>
                                    <Plus className="size-4" />
                                  </Button>
                                </div>
                              )
                                : (
                                  <div className='flex flex-row items-center gap-2'>
                                    <Button variant={"outline"} size="icon"
                                      onClick={async (e) => {
                                        e.currentTarget.blur();
                                        const result = await dialogs.open(EditDrinkDialog, {
                                          drink: drink
                                        });
                                        if (result) {
                                          updateDrink.mutate(result, {
                                            onSuccess: () => toast.success(t("drinks.updateSuccess")),
                                            onError: (error) => toast.error(t("drinks.updateError", { error: error.message }))
                                          })
                                        }
                                      }}>
                                      <Pencil className="size-4" />
                                    </Button>
                                    <Button
                                      variant={"destructive"} size="icon"
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
                                )
                            }
                          </ItemActions>
                        </Item>
                        <Separator />
                      </div>
                    ))}
                  </div>
                ))
            }
          </div>
        </PullToRefresh>
      </main>
      <Has perm={'drinks.purchase'}>
        <div
          className="fixed right-6 z-50"
          style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          {
            addedDrinksCount > 0 && <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-primary text-primary-foreground transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-md"
              onClick={confirmDrinks}
            >
              {updateHistory.isPending ? <Spinner className='size-6' /> : <Check className="size-6" />}
            </Button>
          }
          {
            addedDrinksCount === 0 && hasMultipleTypes && <Dialog>
              <DialogTrigger render={<Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-primary text-primary-foreground transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-md">
                <Funnel className="size-6" />
              </Button>} />
              <DialogContent variant={"drawer"}>
                <DialogHeader className='px-4'>
                  <DialogTitle>{t("common.filter")}</DialogTitle>
                </DialogHeader>
                <div className="no-scrollbar overflow-y-auto flex flex-col p-4 gap-4">
                  {[...new Set(drinks.map((x) => x.type))].sort().map((x) => (
                    <FieldLabel key={x} htmlFor={`switch-${x}`}>
                      <Field orientation="horizontal">
                        <FieldContent>
                          <FieldTitle>{nameOfProductType(x)}</FieldTitle>
                        </FieldContent>
                        <Switch id={`switch-${x}`} checked={visibleTypes.some((y) => y === x)}
                          onCheckedChange={(val) => changeVisibleTypes(val, x)} />
                      </Field>
                    </FieldLabel>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          }
        </div>
      </Has>
    </div>

  );
};

export default DrinkListScreen;
