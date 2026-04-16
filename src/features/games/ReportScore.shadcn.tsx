import { useCreateMatch, usePlayers } from '@/tanstack/games';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { v4 as uuid } from 'uuid';

import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';

type Props = {
  options: PlayerWithSimpleUser[];
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

  const displayName = value && 'isPending' in value ? value.name : value?.name;
  const avatarUrl = value && 'isPending' in value ? undefined : value?.avatarUrl ?? value?.rg_avatar_url ?? '';
  const isGuest = value && 'isPending' in value;

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

type PendingGuest = {
  isPending: true;
  index: number;
  name: string;
};

type PlayerSelection = PlayerWithSimpleUser | PendingGuest | null;

const ReportScoreShadcn = () => {
  const [sets, setSets] = useState<MatchSet[]>([
    { id: '', created_at: '', set_number: 1, match: '', team_a_score: 0, team_b_score: 0 },
  ]);
  const navigate = useNavigate();
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
    const [name1a, ...surname1a] = player1a.name.split(' ');
    const [name2a, ...surname2a] = player2a.name.split(' ');
    const [name1b, ...surname1b] = player1b.name.split(' ');
    const [name2b, ...surname2b] = player2b.name.split(' ');
    const team_a_name = (surname1a.pop() ?? name1a) + '/' + (surname2a.pop() ?? name2a);
    const team_b_name = (surname1b.pop() ?? name1b) + '/' + (surname2b.pop() ?? name2b);

    const resolveInfo = (p: PendingGuest | PlayerWithSimpleUser) => {
      if ('isPending' in p) {
        const newId = uuid();
        return { id: newId, name: p.name, rating: p.index };
      }
      return { id: p.id, name: p.name, rating: p.ka_index };
    };

    const p1a = resolveInfo(player1a);
    const p2a = resolveInfo(player2a);
    const p1b = resolveInfo(player1b);
    const p2b = resolveInfo(player2b);

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
      },
      {
        onSuccess: () => navigate('/matches'),
        onError: (error) => {
          captureException(error);
          toast.error(error.message);
        },
      }
    );
  };

  return <div className="min-h-screen bg-background text-foreground">
    <AppBar
      className='!border-b !shadow-sm'
      primaryAction="back"
      user={user}
    />
    <main className='flex-1 size-full pb-safe-bottom'>
      <PullToRefresh onRefresh={() => refetch()}>
        <div>

          <div className='flex flex-row w-full'>
            <div className='font-bold p-2 flex-1'>Team A</div>
            <div className='font-bold p-2 flex-1'>Team B</div>
          </div>

          <div className='flex flex-row w-full'>
            <div className='font-bold p-2 flex-1 min-w-0'>
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
            <div className='font-bold p-2 flex-1 min-w-0'>
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

          <div className='flex flex-row w-full'>
            <div className='font-bold p-2 flex-1 min-w-0'>
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
            <div className='font-bold p-2 flex-1 min-w-0'>
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

          <div className='flex flex-col gap-2 p-2'>

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
      </PullToRefresh>
    </main>
  </div>
};
export default ReportScoreShadcn;


const SelectPlayerDialog = ({ open, onClose, payload }: DialogProps<{ options: PlayerWithSimpleUser[], selectedPlayers: PlayerWithSimpleUser[] }, PlayerSelection>) => {

  const [searchString, setSearchString] = useState('');
  const dialogs = useDialogs();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant={"fullscreen"} showCloseButton={false}>
        <div className={"pt-safe-top sticky top-0 flex h-14 w-full items-center gap-4 bg-background/95 px-4 supports-[backdrop-filter]:bg-background md:px-4 transition-shadow border-b shadow-sm"}>

          <div className="flex items-center gap-2 md:gap-4 lg:w-1/3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onClose(null)}
              className="shrink-0 rounded-full -ml-1"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex flex-1 items-center justify-center lg:w-1/3">
            <div className="relative w-full max-w-md flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                value={searchString}
                onChange={(e) => setSearchString(e.target.value)}
                className="w-full rounded-full bg-muted/50 pl-9 focus-visible:bg-background"
              />
            </div>
          </div>
        </div>

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
                (x: PlayerWithSimpleUser) =>
                  searchString === '' || (x.name ?? '').toLowerCase().includes(searchString.toLowerCase())
              )
              .map((user: PlayerWithSimpleUser) => (
                <Item key={user.id} onClick={() => onClose(user)}>
                  <ItemMedia>
                    <Avatar className={"mr-2"}>
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.name || undefined} />
                      <AvatarFallback>{user.name ? user.name[0] : user.display_name ? user.display_name[0] : 'U'}</AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent>
                    <div>
                      <div className='truncate'>{user.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{t('userName')}</div>
                    </div>
                  </ItemContent>
                </Item>
              ))
          }

        </div>
      </DialogContent>
    </Dialog >
  )
};

const CreatePlayerDialog = ({ open, onClose }: DialogProps<null, PendingGuest | null>) => {
  const [name, setName] = useState('');
  const [index, setIndex] = useState(1000);
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant={"fullscreen"}>
        <div className='p-4 flex-1'>
          <DialogHeader>
            <DialogTitle>Gastspieler erstellen</DialogTitle>
          </DialogHeader>
          <div className='flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 p-1 mt-4'>
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
                <Input
                  id="index"
                  value={index}
                  type='number'
                  step={50}
                  onChange={(e) => Number.isInteger(Number(e.target.value)) && setIndex(Number(e.target.value))}
                  required
                />
              </Field>
            </Has>
          </div>
        </div>
        <DialogFooter className="p-4 m-0 border-t">
          <Button onClick={() => onClose({ isPending: true, index, name })}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}