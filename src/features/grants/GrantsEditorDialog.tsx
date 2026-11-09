import { useFeatures, usePermissions } from '@/tanstack/grants';
import { UseQueryResult } from '@tanstack/react-query';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field';
import { Item, ItemContent } from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { DialogProps } from '@/contexts/DialogsProvider';

export type GroupResult = {
  grantPerm: string[];
  revokePerm: string[];
  grantFeat: string[];
  revokeFeat: string[];
};

type GrantsEditorProps = {
  title: string;
  id: string;
  currentPermissions: (id: string) => UseQueryResult<string[], Error>;
  currentFeatures: (id: string) => UseQueryResult<string[], Error>;
};

export const GrantsEditorDialog = ({ payload, open, onClose }: DialogProps<GrantsEditorProps, GroupResult | null>) => {
  const { t } = useTranslation();
  const { data: perms } = usePermissions();
  const { data: feats } = useFeatures();

  const { data: currentPerms = [], isSuccess: isPermsSuccess } = payload.currentPermissions(payload.id);
  const { data: currentFeats = [], isSuccess: isFeatsSuccess } = payload.currentFeatures(payload.id);

  const currentPermsSet = React.useMemo(() => new Set(currentPerms), [currentPerms]);
  const currentFeatSet = React.useMemo(() => new Set(currentFeats), [currentFeats]);

  const [selectedPerms, setSelectedPerms] = React.useState<Set<string>>(new Set());
  const [selectedFeats, setSelectedFeats] = React.useState<Set<string>>(new Set());

  const initializedForId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (isPermsSuccess && isFeatsSuccess && initializedForId.current !== payload.id) {

      // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
      setSelectedPerms(new Set(currentPerms));
      // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
      setSelectedFeats(new Set(currentFeats));

      initializedForId.current = payload.id;
    }
  }, [isPermsSuccess, isFeatsSuccess, currentPerms, currentFeats, payload.id]);

  const onTogglePerm = (key: string, checked: boolean) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const onToggleFeat = (key: string, checked: boolean) => {
    setSelectedFeats((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent variant={"fullscreen"}>
      <DialogHeader variant={"appbar"}>
        <DialogTitle className="flex-1">{payload.title}</DialogTitle>
        <DialogClose />
      </DialogHeader>
      <DialogBody>
        <div className="text-sm font-semibold m-2">{t('browse.permissions')}</div>
        <div>
          {(perms || []).map((p) => (
            <Item key={p} className='odd:bg-muted/50'>
              <ItemContent>
                <Field orientation={"horizontal"}>
                  <FieldContent>
                    <FieldLabel htmlFor={p}>{p}</FieldLabel>
                  </FieldContent>
                  <Switch id={p} checked={selectedPerms.has(p)} onCheckedChange={(checked) => onTogglePerm(p, checked)} />
                </Field>
              </ItemContent>
            </Item>

          ))}
        </div>

        <div className="text-sm font-semibold m-2">{t('grants.features')}</div>
        <div>
          {(feats || []).map((p) => (
            <Item key={p} className='odd:bg-muted/50'>
              <ItemContent>
                <Field orientation={"horizontal"}>
                  <FieldContent>
                    <FieldLabel htmlFor={p}>{p}</FieldLabel>
                  </FieldContent>
                  <Switch id={p} checked={selectedFeats.has(p)} onCheckedChange={(checked) => onToggleFeat(p, checked)} />
                </Field>
              </ItemContent>
            </Item>

          ))}
        </div>
      </DialogBody>
      <DialogFooter variant={"fullscreen"}>
        <div className='flex w-full justify-even gap-4'>
          <DialogClose render={<Button variant="outline">{t('common.cancel')}</Button>} />
          <Button className="flex-1" onClick={() => onClose({
            grantPerm: [...selectedPerms].filter((k) => !currentPermsSet.has(k)),
            revokePerm: [...currentPermsSet].filter((k) => !selectedPerms.has(k)),
            grantFeat: [...selectedFeats].filter((k) => !currentFeatSet.has(k)),
            revokeFeat: [...currentFeatSet].filter((k) => !selectedFeats.has(k)),
          })}>
            {t('common.save')}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
};
