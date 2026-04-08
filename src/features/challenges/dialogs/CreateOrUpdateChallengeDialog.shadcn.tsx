import { CreateOrUpdateGroupDialog } from '@/features/groups/dialogs/CreateOrUpdateGroupDialog';
import { useGroups } from '@/tanstack/groups';
import { UserWithGroups } from '@/types/supabaseTypes';
import { formatDateFromDatabase, formatDateToDatabase } from '@/utils';
import { DialogProps, useDialogs } from '@toolpad/core';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { format, isBefore } from 'date-fns';
import { Minus, Plus, Trash } from 'lucide-react';
import { toast } from 'sonner';

type CreateChallengePayload = {
  user: UserWithGroups;
  challenge?: Challenge | null;
};

const EMPTY_CHALLENGE: Challenge = {
  name: '',
  automated: false,
  description: '',
  id: '',
  created_at: '',
  end_date: null,
  start_date: null,
  group: '',
  max_points_per_week: null,
  max_points_per_day: 1,
  category_enabled: false,
  comments_enabled: false,
  show_all_members: false,
  category_options: []
};

export const CreateOrUpdateChallengeDialogShadcn = ({
  payload,
  open,
  onClose,
}: DialogProps<CreateChallengePayload, Challenge | null>) => {
  const dialogs = useDialogs();
  const [data, setData] = useState<Challenge>(payload.challenge ?? EMPTY_CHALLENGE);

  const { data: groups = [], isLoading } = useGroups();

  const selectedGroup = useMemo(() => {
    return groups.find((g) => g.id === data.group) ?? null;
  }, [groups, data.group]);

  return (
    <Drawer
      repositionInputs={false}
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose(null);
      }}>
      <DrawerContent className='flex flex-col max-h-[95dvh]'>
        <DrawerHeader className="p-4 pb-2 border-b text-left">
          <DrawerTitle>
            {payload.challenge ? 'Challenge aktualisieren' : 'Neue Challenge erstellen'}
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-4 gap-4 flex flex-col no-scrollbar">
          <Field>
            <FieldLabel htmlFor="challenge-title">Challenge Titel</FieldLabel>
            <Input
              id='challenge-title'
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor="challenge-description">Challenge Beschreibung</FieldLabel>
            <Textarea
              id='challenge-description'
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })} />
          </Field>

          <Field>
            <FieldLabel htmlFor="challenge-group">Challenge Gruppe</FieldLabel>
            <Select
              id='challenge-group'
              value={selectedGroup?.id ?? payload.challenge?.group ?? 'none'}
              onValueChange={async (val) => {
                if (val === 'create') {
                  const result = await dialogs.open(CreateOrUpdateGroupDialog, { user: payload.user });
                  if (result && result !== 'closed') {
                    setData({ ...data, group: result.id });
                  } else {
                    toast.error('Es wurde keine Gruppe erstellt.');
                  }
                } else if (val) {
                  setData({ ...data, group: val });
                }
              }}>
              <SelectTrigger>
                <SelectValue placeholder="Gruppe" className="text-base" >
                  {selectedGroup?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {
                    groups
                      .filter((x) => x.user_group_role === 'admin')
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <div className="text-sm font-semibold">
            Optionale Einstellungen
          </div>

          <div className='flex flex-row w-full justify-between items-center'>
            <div>
              <div className='text-base font-medium'>Maximale Punkte pro Woche</div>
            </div>
            <div className='flex flex-row items-center gap-2'>
              {
                (data.max_points_per_week !== null) &&
                <>
                  <Button variant={"outline"} size="icon"
                    onClick={(event) => {
                      setData({
                        ...data,
                        max_points_per_week: (data.max_points_per_week ?? 0) > 0 ? (data.max_points_per_week ?? 1) - 1 : null,
                      });
                      event.stopPropagation();
                    }}>
                    {
                      data.max_points_per_week === 0 ? <Trash className="h-4 w-4" /> : <Minus className="h-4 w-4" />
                    }
                  </Button>
                  <span className="text-xl font-semibold w-8 text-center">{data.max_points_per_week}</span>
                </>
              }
              <Button
                variant={"outline"} size="icon"
                onClick={(event) => {
                  setData({
                    ...data,
                    max_points_per_week: (data.max_points_per_week ?? 0) + 1,
                  });
                  event.stopPropagation();
                }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className='flex flex-row w-full justify-between items-center'>
            <div>
              <div className='text-base font-medium'>Maximale Punkte pro Tag</div>
            </div>
            <div className='flex flex-row items-center gap-2'>
              {
                (data.max_points_per_day !== null) &&
                <>
                  <Button variant={"outline"} size="icon"
                    onClick={(event) => {
                      setData({
                        ...data,
                        max_points_per_day: (data.max_points_per_day ?? 0) > 0 ? (data.max_points_per_day ?? 1) - 1 : null,
                      });
                      event.stopPropagation();
                    }}>
                    {
                      data.max_points_per_day === 0 ? <Trash className="h-4 w-4" /> : <Minus className="h-4 w-4" />
                    }
                  </Button>
                  <span className="text-xl font-semibold w-8 text-center">{data.max_points_per_day}</span>
                </>
              }
              <Button
                variant={"outline"} size="icon"
                onClick={(event) => {
                  setData({
                    ...data,
                    max_points_per_day: (data.max_points_per_day ?? 0) + 1,
                  });
                  event.stopPropagation();
                }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel className='text-base'>
                Startdatum
              </FieldLabel>
              <FieldDescription className='flex gap-4'>
                <Popover modal={true}>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" id="date-picker-simple" className="flex-1 justify-start font-normal text-base"
                        disabled={data.start_date === null}>
                        {data.start_date ? format(data.start_date, "PPP") : <span>Datum wählen</span>}
                      </Button>
                    }
                  />
                  <PopoverContent align="start"
                    className="w-auto p-0 pointer-events-auto z-[100]">
                    <Calendar
                      required
                      mode="single"
                      selected={formatDateFromDatabase(data.start_date) ?? undefined}
                      onSelect={(val) => setData({
                        ...data,
                        start_date: formatDateToDatabase(val),
                      })}
                      defaultMonth={new Date()}
                      weekStartsOn={1}
                      disabled={(day) => isBefore(day, new Date())}
                      className="[--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)]"
                    />
                  </PopoverContent>
                </Popover>
                <div className='flex flex-col items-center justify-center'>
                  <Switch checked={data.start_date !== null} onCheckedChange={() => setData({
                    ...data,
                    start_date: data.start_date === null ? formatDateToDatabase(Date.now()) : null,
                  })} />
                </div>
              </FieldDescription>
            </FieldContent>
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel className='text-base'>
                Enddatum
              </FieldLabel>
              <FieldDescription className='flex gap-4'>
                <Popover modal={true}>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" id="date-picker-simple" className="flex-1 justify-start font-normal text-base"
                        disabled={data.end_date === null}>
                        {data.end_date ? format(data.end_date, "PPP") : <span>Datum wählen</span>}
                      </Button>
                    }
                  />
                  <PopoverContent align="start"
                    className="w-auto p-0 pointer-events-auto z-[100]">
                    <Calendar
                      required
                      mode="single"
                      selected={formatDateFromDatabase(data.end_date) ?? undefined}
                      onSelect={(val) => setData({
                        ...data,
                        end_date: formatDateToDatabase(val),
                      })}
                      defaultMonth={new Date()}
                      weekStartsOn={1}
                      disabled={(day) => isBefore(day, new Date())}
                      className="[--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)]"
                    />
                  </PopoverContent>
                </Popover>
                <div className='flex flex-col items-center justify-center'>
                  <Switch checked={data.end_date !== null} onCheckedChange={() => setData({
                    ...data,
                    end_date: data.end_date === null ? formatDateToDatabase(Date.now()) : null,
                  })} />
                </div>
              </FieldDescription>
            </FieldContent>
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="switch-all-members" className='text-base'>
                Zeigt alle Teilnehmer der Challenge an (auch mit 0 Punkten)
              </FieldLabel>
            </FieldContent>
            <Switch id="switch-all-members"
              checked={data.show_all_members}
              onCheckedChange={(val) =>
                setData({
                  ...data,
                  show_all_members: val,
                })
              } />
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="switch-comments_enabled" className='text-base'>
                Kommentare aktiviert
              </FieldLabel>
            </FieldContent>
            <Switch id="switch-comments_enabled"
              checked={data.comments_enabled}
              onCheckedChange={(val) =>
                setData({
                  ...data,
                  comments_enabled: val,
                })
              } />
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="switch-category_enabled" className='text-base'>
                Kategorien aktiviert
              </FieldLabel>
            </FieldContent>
            <Switch id="switch-category_enabled"
              checked={data.category_enabled}
              onCheckedChange={(val) =>
                setData({
                  ...data,
                  category_enabled: val,
                })
              } />
          </Field>

          {
            data.category_enabled && <>
              <div className="text-sm font-semibold">
                Kategorien
              </div>
              {
                data.category_options.map((x, index) => <InputGroup key={x}>
                  <InputGroupInput
                    type="text"
                    value={x}
                    onChange={(e) => {
                      setData({
                        ...data,
                        category_options: data.category_options.map((x, i) => index === i ? e.target.value : x)
                      })
                    }}
                  />
                  <InputGroupAddon align="inline-end">
                    <Button variant={"ghost"} size={"icon-lg"} onClick={() => {
                      const newItems = [...data.category_options];
                      newItems.splice(index, 1);
                      setData({
                        ...data,
                        category_options: newItems
                      })
                    }}>
                      <Trash />
                    </Button>
                  </InputGroupAddon>
                </InputGroup>)
              }
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newCategory = formData.get("new-category")?.toString();
                if (newCategory) {
                  e.currentTarget.reset();
                  setData({
                    ...data,
                    category_options: [...data.category_options, newCategory]
                  })
                }
              }}>
                <Field orientation="horizontal">
                  <Input id="new-categoroy" name="new-category" type="text" placeholder="Neue Kategorie..." />
                  <Button type='submit'>
                    <Plus />
                  </Button>
                </Field>
              </form>
            </>
          }
        </div>
        <DrawerFooter className="p-4 pt-2 border-t mt-auto">
          <Button
            onClick={async () => {
              if (!selectedGroup) {
                toast.warning('Der Challenge muss eine Gruppe zugeordnet sein.');
                return;
              }
              if (data.name.length < 6) {
                toast.warning('Der Name der Challenge muss aus mindestens 6 Zeichen bestehen.');
                return;
              }
              if (data.description.length < 6) {
                toast.warning('Die Beschreibung der Challenge muss aus mindestens 6 Zeichen bestehen.');
                return;
              }

              onClose(data);
            }}
          >
            {payload.challenge ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer >
  );
};