import { Has } from '@/hooks/useGrants';
import { useAllItems, useHandoverKeyMutation } from '@/tanstack/items';
import { captureException } from '@sentry/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useGrants } from '../auth/GrantsContext';

import { PullToRefresh } from '@/components/PullToRefresh';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { useDialogs } from '@/contexts/DialogsProvider';
import { AlertCircle, AlertTriangleIcon, Info, Key, Loader2, Pencil, PencilOff, Plus, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { EditOrAddItemDialogShadcn } from './dialogs/EditOrAddItemDialog.shadcn';
import { KeyHandOverDialogShadcn } from './dialogs/KeyHandOverDialog.shadcn';

const EMPTY_KEY: ItemUpdate = { name: '', color: '#000000', created_at: '', current_holder: null };

const ItemHolderScreenShadcn = () => {
  const [toggleEdit, setToggleEdit] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const actionProcessed = useRef(false);

  const dialogs = useDialogs();
  const { user, hasPerm } = useGrants();
  const { t } = useTranslation();

  const handoverKeyMutation = useHandoverKeyMutation();

  const { data: keyHolders = [], isLoading, error, refetch } = useAllItems();

  useEffect(() => {
    if (!hasPerm('items.update.holder')) return;

    if (actionProcessed.current) return;

    const type = searchParams.get('type');
    const key = searchParams.get('key');
    if (!key || !type) {
      return;
    }
    const keyId = +key;
    const keyHolder = keyHolders.find((x) => x.id === keyId);
    if (!keyHolder) return;

    actionProcessed.current = true;

    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      nextParams.delete('type');
      nextParams.delete('key');
      return nextParams;
    }, { replace: true });

    const processAction = async () => {
      let targetUser = null;

      if (type === 'handover') {
        targetUser = await dialogs.selectSingleUser([user.id, keyHolder.current_holder ?? ""]);
        if (!targetUser) return;
      } else if (type === 'take') {
        targetUser = user;
      } else {
        return;
      }

      const result = await dialogs.open(KeyHandOverDialogShadcn, {
        itemHolder: keyHolder,
        selectedUser: targetUser
      });

      if (result) {
        handoverKeyMutation.mutate(
          { keyHolder: keyHolder, user: targetUser },
          {
            onError: (error) => {
              captureException(error);
              toast.error(t('keyHandOverError', { error: error.message }));
            },
          }
        );
      }
    };

    processAction();
  }, [searchParams, keyHolders, user, hasPerm, dialogs, handoverKeyMutation, t, setSearchParams]);

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={t("browse.keys")}
        user={user}
        actions={
          <>
            <Has perm={"drinks.edit"}>
              <Button size={"icon-lg"} variant={"ghost"} onClick={async () => {
                dialogs.open(EditOrAddItemDialogShadcn, {
                  itemToEdit: EMPTY_KEY
                });
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
          <div className='flex flex-col gap-2 p-2'>
            <Alert key={'alert'} className='p-2' variant="info">
              <Info />
              <AlertDescription>
                Bitte euren Schlüssel gut aufbewahren und Übergaben eintragen! Wer unverschuldet den Schlüssel verloren hat
                (z.B. Diebstahl), wird von der Abteilung unterstützt. Wer den Schlüssel selbst verschuldet verliert (z.B.
                verlegt), muss für den neuen Schlüssel selbst aufkommen. Grundsätzlich ist immer die eingetragene Person für
                den Schlüssel verantwortlich!
              </AlertDescription>
            </Alert>

            {/* HIER GEÄNDERT: Lade-, Fehler- und Leerzustände */}
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 mt-12 text-center">
                <Loader2 className="size-10 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 mt-12 text-center">
                <AlertCircle className="size-10 text-destructive mb-4" />
                <h2 className="text-xl font-bold tracking-tight">Fehler beim Laden</h2>
                <p className="text-muted-foreground mt-2 max-w-xs">
                  Die Schlüssel konnten nicht geladen werden. Bitte versuche es später erneut.
                </p>
              </div>
            ) : keyHolders.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 mt-12 text-center">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <SearchX className="size-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Keine Schlüssel gefunden</h2>
                <p className="text-muted-foreground mt-2 max-w-xs">
                  Es sind aktuell keine Schlüssel im System hinterlegt.
                </p>
              </div>
            ) : (
              <div className='flex flex-col gap-2'>
                {keyHolders.map((x: FullItemHolder) => (
                  <Item key={x.id_uuid} className='w-full' variant={"outline"}>
                    <ItemMedia>
                      <Avatar className={`w-10 h-10 rounded-md`}>
                        <AvatarFallback style={{ color: x.color }}>
                          <Key />
                        </AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{x.name}</ItemTitle>
                      <ItemDescription className="flex items-center gap-1.5">
                        {!x.full_current_holder && <AlertTriangleIcon size={14} />}
                        <span>{x.full_current_holder?.name ?? "Nicht vergeben"}</span>
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      {
                        toggleEdit ?
                          (
                            <Has perm={"items.manage"}>
                              <Button variant={"outline"} size={"icon-sm"} onClick={() => {
                                dialogs.open(EditOrAddItemDialogShadcn, {
                                  itemToEdit: x
                                });
                              }}>
                                <Pencil />
                              </Button>
                            </Has>
                          ) : (
                            <Has perm={'items.update.holder'}>
                              {
                                x.full_current_holder?.id === user.id ? (
                                  <Button
                                    onClick={async () => {
                                      const selectedUser = await dialogs.selectSingleUser([user.id, x.full_current_holder?.id ?? ""]);
                                      if (!selectedUser)
                                        return;

                                      const result = await dialogs.open(KeyHandOverDialogShadcn, {
                                        itemHolder: x,
                                        selectedUser: selectedUser
                                      });
                                      if (result) {
                                        handoverKeyMutation.mutate(
                                          { keyHolder: x, user: selectedUser },
                                          {
                                            onError: (error) => {
                                              captureException(error);
                                              toast.error(t('keyHandOverError', { error: error.message }));
                                            },
                                          }
                                        );
                                      }
                                    }}
                                  >
                                    {t('handover_key')}
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={async () => {

                                      const result = await dialogs.open(KeyHandOverDialogShadcn, {
                                        itemHolder: x,
                                        selectedUser: x.full_current_holder
                                      });
                                      if (result) {
                                        handoverKeyMutation.mutate(
                                          { keyHolder: x, user: user },
                                          {
                                            onError: (error) => {
                                              captureException(error);
                                              toast.error(t('keyHandOverError', { error: error.message }));
                                            },
                                          }
                                        );
                                      }
                                    }}
                                  >
                                    {t('take_key')}
                                  </Button>
                                )
                              }
                            </Has>
                          )
                      }
                    </ItemActions>
                  </Item>
                ))}
              </div>
            )}
          </div>

        </PullToRefresh>
      </main>
    </div >
  );
};

export default ItemHolderScreenShadcn;