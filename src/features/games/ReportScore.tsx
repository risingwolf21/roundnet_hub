import { useCreateMatch, usePlayers } from '@/tanstack/games';
import { useState } from 'react';
import { v4 as uuid, v4 } from 'uuid';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemHeader, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { DialogProps, useDialogs } from '@/contexts/DialogsProvider';
import { Has } from '@/hooks/useGrants';
import { cn } from '@/lib/utils';
import { formatDateToDatabase } from '@/utils';
import { captureException } from '@sentry/react';
import { t } from 'i18next';
import { Minus, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';

type Props = {
  options: (Player | PlayerWithSimpleUser)[];
  selected: PlayerWithSimpleUser[];
  loading: boolean;
  label: string;
  value: PlayerSelection;
  disabled: boolean;
  onSelect: (value: PlayerSelection) => void;
  onRemove?: () => void;
};
const SelectPlayer = ({ options, selected, loading, label, value, disabled, onSelect, onRemove }: Props) => {
  const dialogs = useDialogs();

  const displayName = value && 'name' in value ? value.name : value?.display_name ?? 'Unknown';
  const avatarUrl = value && 'avatarUrl' in value ? value?.avatarUrl ?? value?.rg_avatar_url ?? '' : '';
  const isGuest = value && value.linked_user_id === null;

  return (
    <Item variant={"outline"} className='pr-1' {...(!disabled && {
      onClick: async () => {
        const result = await dialogs.open(SelectPlayerDialog, {
          options: options,
          selectedPlayers: selected,
        });
        if (result) {
          onSelect(result);
        }
      }
    })}>
      <div className='w-full h-full flex flex-row min-w-0'>
        <ItemMedia>
          <Avatar className={"mr-2"}>
            <AvatarImage src={avatarUrl || undefined} alt={displayName || undefined} />
            <AvatarFallback>{displayName ? displayName[0] : 'U'}</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent className="min-w-0 flex-1">
          <div>
            <div className={cn('truncate', {
              disabled: "text-muted-foreground"
            })}>
              {loading ? "Wird geladen..." : displayName ?? 'Nicht gewählt'}
            </div>
            <div className={cn('text-xs text-muted-foreground truncate', {
              disabled: "text-muted"
            })}>
              {isGuest ? 'Gastspieler' : value?.rg_id ?? label}
            </div>
          </div >
        </ItemContent >
        {
          onRemove && <ItemActions>
            <Button variant={"ghost"} size={"icon-lg"} onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}>
              <Trash2 />
            </Button>
          </ItemActions>
        }

      </div >
    </Item >
  );
};

type PlayerSelection = PlayerWithSimpleUser | Player | null;

const ReportScore = ({ open, onClose, payload }: DialogProps<{ eventId?: string }>) => {
  const { eventId } = payload ?? {};
  const [sets, setSets] = useState<MatchSet[]>([
    { id: '', created_at: '', set_number: 1, match: '', team_a_score: 0, team_b_score: 0 },
  ]);
  const { user } = useGrants();

  const createMatch = useCreateMatch();

  const [rating_enabled, setRatingEnabled] = useState(true);
  const [is_public, setIsPublic] = useState(true);
  const [player1a, setPlayer1a] = useState<PlayerSelection>(null);
  const [player2a, setPlayer2a] = useState<PlayerSelection>(null);
  const [player1b, setPlayer1b] = useState<PlayerSelection>(null);
  const [player2b, setPlayer2b] = useState<PlayerSelection>(null);

  const { data, error, isLoading, refetch } = usePlayers(user);

  if (data?.me && !player1a) {
    setPlayer1a(data.me);
  }

  const saveScores = () => {
    if (!player1a) {
      toast.error('Player 1 of Team A not defined');
      return;
    }
    if (!player2a) {
      toast.error('Player 2 of Team A not defined');
      return;
    }
    if (!player1b) {
      toast.error('Player 1 of Team B not defined');
      return;
    }
    if (!player2b) {
      toast.error('Player 2 of Team B not defined');
      return;
    }
    if (sets.length <= 0) {
      toast.error('Need at least one recorded set of this match');
      return;
    }
    for (const set of sets) {
      if (set.team_a_score === 0 && set.team_b_score === 0) {
        toast.error(`Scores need in ${set.set_number} set`);
        return;
      }
      if (set.team_a_score === set.team_b_score) {
        toast.error(`Cannot have a draw in ${set.set_number} set`);
        return;
      }
    }

    const resolveInfo = (p: Player | PlayerWithSimpleUser) => {
      if ('name' in p) {
        return {
          id: p.id,
          name: p.name,
          rating: p.ka_index
        };
      }
      return {
        id: p.player,
        name: p.display_name || 'Unbekannt',
        rating: p.ka_index
      };
    };

    const p1a = resolveInfo(player1a);
    const p2a = resolveInfo(player2a);
    const p1b = resolveInfo(player1b);
    const p2b = resolveInfo(player2b);

    const getLastName = (fullName: string) => {
      const parts = fullName.trim().split(' ');
      return parts.pop() || fullName;
    };

    const team_a_name = `${getLastName(p1a.name)}/${getLastName(p2a.name)}`;
    const team_b_name = `${getLastName(p1b.name)}/${getLastName(p2b.name)}`;

    const playerNamesMapping: { [key: string]: string } = {};
    [p1a, p2a, p1b, p2b].forEach(p => {
      playerNamesMapping[p.id] = p.name;
    });

    createMatch.mutate(
      {
        sets,
        team_a: {
          name: team_a_name,
          player_1: p1a.id,
          player_1_rating: p1a.rating,
          player_2: p2a.id,
          player_2_rating: p2a.rating,
        },
        team_b: {
          name: team_b_name,
          player_1: p1b.id,
          player_1_rating: p1b.rating,
          player_2: p2b.id,
          player_2_rating: p2b.rating,
        },
        rating_enabled: rating_enabled,
        is_public: is_public,
        created_by: user?.id,
        playerNamesMapping,
        event: eventId
      },
      {
        onSuccess: () => onClose(),
        onError: (error) => {
          captureException(error);
          toast.error(error.message);
        },
      }
    );
  };

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
    <DialogContent variant={"fullscreen"} showCloseButton={false}>
      <DialogHeader variant={"appbar"}>
        <DialogTitle className="flex-1">Spiel erstellen</DialogTitle>
        <DialogClose render={
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full -mr-2">
            <X className="h-5 w-5" />
          </Button>
        } />
      </DialogHeader>
      <DialogBody>
        <div className='flex flex-col w-full gap-2'>

          <div className='flex flex-row w-full px-2 gap-2'>
            <div className='font-bold flex-1'>Team A</div>
            <div className='font-bold flex-1'>Team B</div>
          </div>

          <div className='flex flex-row w-full gap-2'>
            <div className='font-bold flex-1 min-w-0'>
              <SelectPlayer
                options={(data?.players ?? [])}
                selected={[player1a, player2a, player2b, player1b].filter((x): x is PlayerWithSimpleUser => x !== null)}
                loading={isLoading}
                label={'Player 1'}
                value={player1a}
                disabled={data?.me ? true : false}
                onSelect={(value) => setPlayer1a(value)}
              />
            </div>
            <div className='font-bold flex-1 min-w-0'>
              <SelectPlayer
                options={(data?.players ?? [])}
                selected={[player1a, player2a, player2b, player1b].filter((x): x is PlayerWithSimpleUser => x !== null)}
                loading={isLoading}
                label={'Player 1'}
                value={player1b}
                disabled={false}
                onSelect={(value) => setPlayer1b(value)}
                {...(player1b && { onRemove: () => setPlayer1b(null) })}
              />
            </div>
          </div>

          <div className='flex flex-row w-full gap-2'>
            <div className='font-bold flex-1 min-w-0'>
              <SelectPlayer
                options={(data?.players ?? [])}
                selected={[player1a, player2a, player2b, player1b].filter((x): x is PlayerWithSimpleUser => x !== null)}
                loading={isLoading}
                label={'Player 2'}
                value={player2a}
                disabled={false}
                onSelect={(value) => setPlayer2a(value)}
                {...(player2a && { onRemove: () => setPlayer2a(null) })}
              />
            </div>
            <div className='font-bold flex-1 min-w-0'>
              <SelectPlayer
                options={(data?.players ?? [])}
                selected={[player1a, player2a, player2b, player1b].filter((x): x is PlayerWithSimpleUser => x !== null)}
                loading={isLoading}
                label={'Player 2'}
                value={player2b}
                disabled={false}
                onSelect={(value) => setPlayer2b(value)}
                {...(player2b && { onRemove: () => setPlayer2b(null) })}
              />
            </div>
          </div>

          <div className='flex flex-col gap-2'>

            <Item variant={"outline"}>
              <ItemHeader>
                <ItemTitle>Sätze</ItemTitle>
              </ItemHeader>
              <ItemContent>
                {sets.map((x) => (
                  <div key={x.id} className="border-b">
                    <Item className='p-0 pb-2'>
                      <ItemContent className='flex flex-row gap-2'>
                        <div className='flex-1'>
                          <Input
                            type='number'
                            value={x.team_a_score.toString()}
                            onChange={(e) =>
                              setSets(sets.map((y) => (y.id === x.id ? { ...x, team_a_score: Number(e.target.value) } : y)))
                            }
                          />
                        </div>
                        <div className='flex-1'>
                          <Input
                            type='number'
                            value={x.team_b_score.toString()}
                            onChange={(e) =>
                              setSets(sets.map((y) => (y.id === x.id ? { ...x, team_b_score: Number(e.target.value) } : y)))
                            }
                          />
                        </div>
                        <div className='flex-shrink'>
                          <Button variant={"ghost"} onClick={() => setSets([
                            ...sets
                              .filter((y) => y.set_number !== x.set_number)
                              .map((y, i) => ({ ...y, set_number: i + 1 }))
                          ])}>
                            <Trash2 />
                          </Button>
                        </div>
                      </ItemContent>
                    </Item>
                  </div>
                ))}

                <div className='w-full flex justify-center p-2'>
                  <Button
                    onClick={() =>
                      setSets([
                        ...sets,
                        {
                          id: uuid(),
                          created_at: formatDateToDatabase(new Date()),
                          set_number: sets.length + 1,
                          match: '',
                          team_a_score: 0,
                          team_b_score: 0,
                        },
                      ])
                    }
                  >
                    <Plus />
                  </Button>
                </div>
              </ItemContent>
            </Item>


            <Item variant={"outline"}>
              <ItemContent>
                <Field orientation={"horizontal"}>
                  <FieldContent>
                    <FieldLabel htmlFor="switch-index">
                      Index
                    </FieldLabel>
                    <FieldDescription>
                      Soll das Spiel in die Indexwertung eingehen?
                    </FieldDescription>
                  </FieldContent>
                  <Switch id="switch-index" checked={rating_enabled} onCheckedChange={(e) => setRatingEnabled(e)} />
                </Field>
              </ItemContent>
            </Item>

            <Item variant={"outline"}>
              <ItemContent>
                <Field orientation={"horizontal"}>
                  <FieldContent>
                    <FieldLabel htmlFor="switch-public">
                      Sichtbarkeit
                    </FieldLabel>
                    <FieldDescription>
                      Soll das Spiel öffentlich sichtbar sein?
                    </FieldDescription>
                  </FieldContent>
                  <Switch id="switch-public" checked={is_public} onCheckedChange={(e) => setIsPublic(e)} />
                </Field>
              </ItemContent>
            </Item>
          </div>

        </div>
      </DialogBody>
      <DialogFooter variant="fullscreen">
        <div className='flex w-full justify-even gap-4'>
          <DialogClose render={<Button variant="outline">Abbrechen</Button>} />
          <Button onClick={saveScores}>Speichern</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog >
};
export default ReportScore;


const SelectPlayerDialog = ({ open, onClose, payload }: DialogProps<{ options: (Player | PlayerWithSimpleUser)[], selectedPlayers: PlayerWithSimpleUser[] }, PlayerSelection>) => {

  const [searchString, setSearchString] = useState('');
  const dialogs = useDialogs();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant={"fullscreen"} showCloseButton={false}>
        <DialogHeader variant={"appbar"}>
          <DialogTitle className="flex-1">
            <div className="relative w-full max-w-md flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                value={searchString}
                onChange={(e) => setSearchString(e.target.value)}
                className="w-full rounded-full bg-muted/50 pl-9 focus-visible:bg-background"
              />
            </div>
          </DialogTitle>
          <DialogClose render={
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full -mr-2">
              <X className="h-5 w-5" />
            </Button>
          } />
        </DialogHeader>
        <DialogBody>

          <div className='flex-1 min-h-0 overflow-y-auto flex flex-col'>

            <Has perm={"games.create.guest-player"}>
              <Item key={"guestplayer"}>
                <ItemMedia>
                  <Avatar className={"mr-2"}>
                    <AvatarFallback className={"text-xs"}></AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent className='flex flex-row w-full'>
                  <ItemTitle className='flex-1'>
                    Neuer Gastspieler
                  </ItemTitle>
                  <ItemActions className='flex-shrink'>
                    <Button onClick={async () => {
                      const result = await dialogs.open(CreatePlayerDialog, null);
                      if (result) {
                        onClose(result);
                      }
                    }}>
                      Erstellen
                    </Button>
                  </ItemActions>
                </ItemContent>
              </Item>
              <Separator />
            </Has>

            {
              payload.options
                .filter(
                  (x) =>
                    searchString === '' || (('name' in x) ? x.name : x.display_name ?? '').toLowerCase().includes(searchString.toLowerCase())
                )
                .map((user) => {
                  const displayName = 'name' in user ? user.name : user?.display_name ?? 'Unknown';
                  const avatarUrl = 'avatarUrl' in user ? user?.avatarUrl ?? user?.rg_avatar_url ?? '' : '';

                  return <Item key={user.player} onClick={() => onClose(user)}>
                    <ItemMedia>
                      <Avatar className={"mr-2"}>
                        <AvatarImage src={avatarUrl || undefined} alt={displayName || undefined} />
                        <AvatarFallback>{displayName[0]}</AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent>
                      <div>
                        <div className='truncate'>{displayName}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {
                            user.linked_user_id === null ? 'Gastspieler' : t('userName')
                          }
                        </div>
                      </div>
                    </ItemContent>
                  </Item>
                })
            }

          </div>
        </DialogBody>
      </DialogContent>
    </Dialog >
  )
};

const CreatePlayerDialog = ({ open, onClose }: DialogProps<null, Player | null>) => {
  const [name, setName] = useState('');

  const [index, setIndex] = useState(1000);


  const submit = () => {

    onClose({
      created_at: formatDateToDatabase(new Date()),
      gender: 'm',
      rg_avatar_url: null,
      rg_link: null,
      rg_id: null,
      rg_index: null,
      hide_rating: false,
      effective_rating_cached: index,
      matches_played: 0,
      player: v4(),
      pro_status: false,
      display_name: name,
      ka_index: index,
      linked_user_id: null
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant={"fullscreen"} showCloseButton={false}>
        <DialogHeader variant={"appbar"}>
          <DialogTitle className="flex-1">Gastspieler erstellen</DialogTitle>
          <DialogClose render={
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full -mr-2">
              <X className="h-5 w-5" />
            </Button>
          } />
        </DialogHeader>
        <DialogBody>
          <div className='flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 p-1'>
            <Field key={"name"}>
              <FieldLabel htmlFor="name">
                Spielername
              </FieldLabel>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <Has perm={"games.create.guest-player.with_index"}>
              <Field key={"index"}>
                <FieldLabel htmlFor="index">
                  Index
                </FieldLabel>
                <div className='flex flex-row gap-2 w-full'>
                  <Input
                    id="index"
                    value={index}
                    type='number'
                    step={50}
                    onChange={(e) => Number.isInteger(Number(e.target.value)) && setIndex(Number(e.target.value))}
                    required
                    className='flex-1'
                  />
                  <Button onClick={() => index > 600 && setIndex(index - 50)}>
                    <Minus />
                  </Button>
                  <Button onClick={() => index < 2000 && setIndex(index + 50)}>
                    <Plus />
                  </Button>

                </div>
              </Field>
            </Has>
          </div>
        </DialogBody>
        <DialogFooter variant={"fullscreen"}>
          <Button onClick={submit}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}