import { Has } from '@/hooks/useGrants';
import { useDrinks, useInsertHistoryEntryMutation } from '@/tanstack/drinks';
import { DrinkCounter } from '@/types/supabaseTypes';
import { groupBy, nameOfProductType } from '@/utils';
import { captureException } from '@sentry/react';
import { useEffect, useState } from 'react';
import { useGrants } from '../auth/GrantsContext';
import VoucherCard from './components/Voucher';

import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Field, FieldContent, FieldLabel, FieldTitle } from '@/components/ui/field';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { useDialogs } from '@toolpad/core';
import { Check, Funnel, Image, Minus, Pencil, PencilOff, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import EditDrinkDialogShadcn from './dialog/EditDrinkDialog.shadcn';

const DrinkListScreenShadcn = () => {
  const { user } = useGrants();
  const dialogs = useDialogs();
  const { data: drinks = [], error, refetch, isLoading } = useDrinks();

  const [toggleEdit, setToggleEdit] = useState(false);
  const [addedDrinks, setAddedDrinks] = useState<DrinkCounter[]>([]);
  const [visibleTypes, setVisibleTypes] = useState<ProductType[]>(
    (localStorage.getItem('visibleTypes')?.split(';') as ProductType[]) ?? ['Drink']
  );

  const updateHistory = useInsertHistoryEntryMutation(user);

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
          setAddedDrinks([]);
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title="Getränke"
        user={user}
        actions={
          <>
            <Has perm={"drinks.edit"}>
              <Button size={"icon-lg"} variant={"ghost"}>
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
          <VoucherCard />
          <div className='p-2'>
            {
              Array.from(
                groupBy(
                  drinks.filter((x: Drink) => !x.deleted && x.active && visibleTypes.some((y) => y === x.type)),
                  (x) => x.type
                )
              )
                .sort()
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
                              <AvatarFallback>
                                <Image />
                              </AvatarFallback>
                            </Avatar>
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{drink.name}</ItemTitle>
                            <ItemDescription>{drink.price} €</ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            {
                              !toggleEdit && <div className='flex flex-row items-center gap-2'>
                                {
                                  (addedDrinks[drink.id]?.count ?? 0) > 0 &&
                                  <>
                                    <Button variant={"outline"} size="icon"
                                      onClick={() => onRemoveDrinkClick(drink)}>
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="text-xl font-semibold w-8 text-center">{addedDrinks[drink.id].count}</span>
                                  </>
                                }
                                <Button
                                  variant={"outline"} size="icon"
                                  onClick={() => onAddDrinkClick(drink)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            }
                            {
                              toggleEdit && <div className='flex flex-row items-center gap-2'>
                                <Button variant={"outline"} size="icon"
                                  onClick={async () => {
                                    const result = await dialogs.open(EditDrinkDialogShadcn, {
                                      drink: drink,
                                      drinkHistory: []
                                    });
                                  }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant={"outline"} size="icon"
                                  onClick={() => onAddDrinkClick(drink)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
            addedDrinks.length > 0 && <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-primary text-primary-foreground transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-md"
              onClick={confirmDrinks}
            >
              {isLoading ? <Spinner className='size-6' /> : <Check className="size-6" />}
            </Button>
          }
          {
            addedDrinks.length < 1 && new Set(drinks.map(x => x.type)).size > 1 && <Drawer direction="bottom">
              <DrawerTrigger asChild>
                <Button
                  size="icon"
                  className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-primary text-primary-foreground transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-md">
                  <Funnel className="size-6" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Filter</DrawerTitle>
                </DrawerHeader>
                <div className="no-scrollbar overflow-y-auto px-4">
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
              </DrawerContent>
            </Drawer>
          }
        </div>
      </Has>
    </div>

  );
};

export default DrinkListScreenShadcn;
