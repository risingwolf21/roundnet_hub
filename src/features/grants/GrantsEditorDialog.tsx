import { useFeatures, useGrantCatalog, usePermissions, useUserEffectiveGrants } from '@/tanstack/grants';
import { UseQueryResult } from '@tanstack/react-query';
import { ChevronDown, Search, Users } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DialogProps } from '@/contexts/DialogsProvider';
import { cn } from '@/lib/utils';
import { GRANT_CATEGORY_ORDER, GrantCategory, grantCategory } from './grantCategories';

export type GroupResult = {
  grantPerm: string[];
  revokePerm: string[];
  grantFeat: string[];
  revokeFeat: string[];
};

type GrantsEditorProps = {
  title: string;
  id: string;
  /** Users additionally inherit grants from their groups; those are shown read-only. */
  kind: 'group' | 'user';
  currentPermissions: (id: string) => UseQueryResult<string[], Error>;
  currentFeatures: (id: string) => UseQueryResult<string[], Error>;
};

type Entry = { key: string; description: string };
type Via = Map<string, string[]>;

const toggled = (set: Set<string>, keys: string[], on: boolean) => {
  const next = new Set(set);
  keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
  return next;
};

const GrantRow = ({
  entry,
  checked,
  changed,
  via,
  onChange,
}: {
  entry: Entry;
  checked: boolean;
  changed: boolean;
  via?: string[];
  onChange: (checked: boolean) => void;
}) => {
  const { t } = useTranslation();
  const id = `grant-${entry.key}`;
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-center gap-3 px-3 py-2.5', changed && 'bg-primary/5')}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium leading-tight">{entry.description || entry.key}</span>
          {via?.length ? (
            <Badge variant="info" className="gap-1">
              <Users className="size-3" />
              {t('grants.viaGroup', { groups: via.join(', ') })}
            </Badge>
          ) : null}
        </div>
        <code className="text-xs text-muted-foreground">{entry.key}</code>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </label>
  );
};

const Section = ({
  title,
  entries,
  selected,
  original,
  via,
  forceOpen,
  onSet,
  onToggle,
}: {
  title: string;
  entries: Entry[];
  selected: Set<string>;
  original: Set<string>;
  via: Via;
  forceOpen: boolean;
  onSet: (keys: string[], on: boolean) => void;
  onToggle: (key: string, on: boolean) => void;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(true);
  const active = entries.filter((e) => selected.has(e.key) || via.has(e.key)).length;
  const keys = entries.map((e) => e.key);

  return (
    <Collapsible open={open || forceOpen} onOpenChange={setOpen} className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 bg-muted/40 pr-2">
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 px-3 py-2.5 text-left">
          <ChevronDown className={cn('size-4 shrink-0 transition-transform', !(open || forceOpen) && '-rotate-90')} />
          <span className="text-sm font-semibold">{title}</span>
          <Badge variant={active ? 'default' : 'secondary'}>
            {active}/{entries.length}
          </Badge>
        </CollapsibleTrigger>
        <Button variant="ghost" size="sm" onClick={() => onSet(keys, true)}>
          {t('grants.all')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onSet(keys, false)}>
          {t('grants.none')}
        </Button>
      </div>
      <CollapsibleContent>
        <div className="divide-y">
          {entries.map((e) => (
            <GrantRow
              key={e.key}
              entry={e}
              checked={selected.has(e.key)}
              changed={selected.has(e.key) !== original.has(e.key)}
              via={via.get(e.key)}
              onChange={(on) => onToggle(e.key, on)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const GrantsEditorDialog = ({ payload, open, onClose }: DialogProps<GrantsEditorProps, GroupResult | null>) => {
  const { t } = useTranslation();
  const { data: catalog } = useGrantCatalog();
  // Warm the plain name lists that the mutations' optimistic updates rely on.
  usePermissions();
  useFeatures();

  const { data: currentPerms = [], isSuccess: isPermsSuccess } = payload.currentPermissions(payload.id);
  const { data: currentFeats = [], isSuccess: isFeatsSuccess } = payload.currentFeatures(payload.id);
  const { data: effective = [] } = useUserEffectiveGrants(payload.kind === 'user' ? payload.id : undefined);

  const originalPerms = React.useMemo(() => new Set(currentPerms), [currentPerms]);
  const originalFeats = React.useMemo(() => new Set(currentFeats), [currentFeats]);

  const [selectedPerms, setSelectedPerms] = React.useState<Set<string>>(new Set());
  const [selectedFeats, setSelectedFeats] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState('');
  const [onlyActive, setOnlyActive] = React.useState(false);

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

  const { permVia, featVia, groups } = React.useMemo(() => {
    const permVia: Via = new Map();
    const featVia: Via = new Map();
    const groups = new Set<string>();
    effective
      .filter((e) => e.source === 'group')
      .forEach((e) => {
        const target = e.kind === 'perm' ? permVia : featVia;
        target.set(e.key, [...(target.get(e.key) ?? []), e.group_name ?? '']);
        if (e.group_name) groups.add(e.group_name);
      });
    return { permVia, featVia, groups: [...groups] };
  }, [effective]);

  const needle = search.trim().toLowerCase();
  const matches = (e: Entry, selected: Set<string>, via: Via) =>
    (!needle || e.key.toLowerCase().includes(needle) || e.description.toLowerCase().includes(needle)) &&
    (!onlyActive || selected.has(e.key) || via.has(e.key));

  const permissionEntries = (catalog?.permissions ?? []).map((p) => ({ key: p.name, description: p.description ?? '' }));
  const featureEntries = (catalog?.features ?? []).map((f) => ({ key: f.name, description: f.description ?? '' }));

  const sections = GRANT_CATEGORY_ORDER.map((category: GrantCategory) => ({
    category,
    entries: permissionEntries.filter((p) => grantCategory(p.key) === category && matches(p, selectedPerms, permVia)),
  })).filter((s) => s.entries.length > 0);
  const visibleFeatures = featureEntries.filter((f) => matches(f, selectedFeats, featVia));

  const result: GroupResult = {
    grantPerm: [...selectedPerms].filter((k) => !originalPerms.has(k)),
    revokePerm: [...originalPerms].filter((k) => !selectedPerms.has(k)),
    grantFeat: [...selectedFeats].filter((k) => !originalFeats.has(k)),
    revokeFeat: [...originalFeats].filter((k) => !selectedFeats.has(k)),
  };
  const added = result.grantPerm.length + result.grantFeat.length;
  const removed = result.revokePerm.length + result.revokeFeat.length;
  const dirty = added + removed > 0;

  const totalPerms = new Set([...selectedPerms, ...permVia.keys()]).size;
  const totalFeats = new Set([...selectedFeats, ...featVia.keys()]).size;
  const loading = !isPermsSuccess || !isFeatsSuccess || !catalog;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant={'fullscreen'}>
        <DialogHeader variant={'appbar'}>
          <DialogTitle className="flex-1 truncate">{payload.title}</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-4 p-2 pb-4">
            <div className="rounded-xl border bg-card p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t(payload.kind === 'user' ? 'grants.totalUser' : 'grants.totalGroup')}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="default">{t('grants.permissionCount', { count: totalPerms })}</Badge>
                <Badge variant="default">{t('grants.featureCount', { count: totalFeats })}</Badge>
              </div>
              {payload.kind === 'user' && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" />
                  {groups.length ? (
                    <>
                      <span>{t('grants.inheritsFrom')}</span>
                      {groups.map((g) => (
                        <Badge key={g} variant="info">
                          {g}
                        </Badge>
                      ))}
                    </>
                  ) : (
                    <span>{t('grants.noGroupGrants')}</span>
                  )}
                </div>
              )}
              {payload.kind === 'user' && <p className="mt-2 text-xs text-muted-foreground">{t('grants.directHint')}</p>}
            </div>

            <div className="sticky top-0 z-10 -mx-2 flex items-center gap-2 bg-background/95 px-2 py-2 backdrop-blur">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('grants.search')} />
              </div>
              <Button variant={onlyActive ? 'default' : 'outline'} onClick={() => setOnlyActive((v) => !v)}>
                {t('grants.onlyActive')}
              </Button>
            </div>

            {!loading && visibleFeatures.length > 0 && (
              <Section
                title={t('grants.features')}
                entries={visibleFeatures}
                selected={selectedFeats}
                original={originalFeats}
                via={featVia}
                forceOpen={!!needle}
                onSet={(keys, on) => setSelectedFeats((prev) => toggled(prev, keys, on))}
                onToggle={(key, on) => setSelectedFeats((prev) => toggled(prev, [key], on))}
              />
            )}
            {!loading &&
              sections.map(({ category, entries }) => (
                <Section
                  key={category}
                  title={t(`grants.categories.${category}`)}
                  entries={entries}
                  selected={selectedPerms}
                  original={originalPerms}
                  via={permVia}
                  forceOpen={!!needle}
                  onSet={(keys, on) => setSelectedPerms((prev) => toggled(prev, keys, on))}
                  onToggle={(key, on) => setSelectedPerms((prev) => toggled(prev, [key], on))}
                />
              ))}
            {!loading && !visibleFeatures.length && !sections.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('grants.noResults')}</p>
            )}
          </div>
        </DialogBody>
        <DialogFooter variant={'fullscreen'}>
          <div className="flex w-full items-center gap-3">
            <DialogClose render={<Button variant="outline">{t('common.cancel')}</Button>} />
            <Button className="flex-1" disabled={!dirty} onClick={() => onClose(result)}>
              {dirty ? t('grants.saveChanges', { added, removed }) : t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
