import { Has } from '@/hooks/useGrants';
import { useAllItems, useHandoverKeyMutation } from '@/tanstack/items';
import { captureException } from '@sentry/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useGrants } from '../auth/GrantsContext';

import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { useDialogs } from '@/contexts/DialogsProvider';
import { AlertTriangleIcon, Info, Key, Pencil, PencilOff, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { EditOrAddItemDialogShadcn } from './dialogs/EditOrAddItemDialog.shadcn';
import { KeyHandOverDialogShadcn } from './dialogs/KeyHandOverDialog.shadcn';

const EMPTY_KEY: ItemUpdate = { name: '', color: '#000000', created_at: '', current_holder: null };

const ItemHolderScreenShadcn = () => {
  const [searchUserOpen, setSearchUserOpen] = useState(false);
  const [addOrUpdateKeysOpen, setAddOrUpdateKeysOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedKeyHolder, setSelectedKeyHolder] = useState<FullItemHolder | null>(null);
  const [toggleEdit, setToggleEdit] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ItemUpdate | null>(null);
  const [searchParams] = useSearchParams();

  const dialogs = useDialogs();
  const { user, hasPerm } = useGrants();
  const { t } = useTranslation();

  const handoverKeyMutation = useHandoverKeyMutation();
  const { data: keyHolders = [], isLoading, refetch } = useAllItems();

  // useEffect(() => {
  //   if (!hasPerm('items.update.holder')) return;
  //   const type = searchParams.get('type');
  //   const key = searchParams.get('key');
  //   if (!key || !type) {
  //     return;
  //   }
  //   const keyId = +key;
  //   const keyHolder = keyHolders.find((x) => x.id === keyId);
  //   if (!keyHolder) return;

  //   if (type === 'handover') {
  //     selectKeyToHandOver(keyHolder);
  //   }
  //   if (type === 'take') {
  //     selectKeyToReceive(keyHolder);
  //   }
  // }, [searchParams, keyHolders, user, selectKeyToReceive, selectKeyToHandOver, hasPerm]);

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
          </div>

        </PullToRefresh>
      </main>
    </div >
  );
};

export default ItemHolderScreenShadcn;
