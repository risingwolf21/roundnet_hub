import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  BOARDS,
  type BoardId,
  type BoardSeats,
  type Lineup,
  type Player,
  type Team,
} from '../types';
import { combinedRgx, type LineupIssue, toPlayerMap } from '../lineup';

const NONE = '__none__';

const genderDot = (g: Player['gender']) =>
  g === 'female' ? 'bg-pink-500' : g === 'male' ? 'bg-blue-500' : 'bg-muted-foreground';

function SeatSelect({
  value,
  players,
  onChange,
  placeholder,
}: {
  value: string | null;
  players: Player[];
  onChange: (id: string | null) => void;
  placeholder: string;
}) {
  const { t } = useTranslation();
  const items = {
    [NONE]: t('bundesliga.freeSeat'),
    ...Object.fromEntries(players.map((p) => [p.id, `${p.name} (${p.rgIndex ?? '—'})`])),
  };
  return (
    <Select
      items={items}
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger className="w-full h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t('bundesliga.freeSeat')}</SelectItem>
        {players.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <span className="flex items-center gap-2">
              <span className={`inline-block size-2 rounded-full ${genderDot(p.gender)}`} />
              {p.name}
              <span className="text-muted-foreground">{p.rgIndex ?? '—'}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** One side (us or them) of a single board: two seats + this board's issues. */
function BoardSide({
  label,
  seats,
  players,
  rgx,
  issues,
  onSeat,
  accent,
}: {
  label: string;
  seats: BoardSeats;
  players: Player[];
  rgx: number;
  issues: LineupIssue[];
  onSeat: (seat: 0 | 1, id: string | null) => void;
  accent: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${accent}`}>{label}</span>
        <Badge variant={issues.some((i) => i.level === 'error') ? 'destructive' : 'secondary'}>
          RGX {rgx}
        </Badge>
      </div>
      <SeatSelect value={seats[0]} players={players} placeholder={t('bundesliga.player1')} onChange={(id) => onSeat(0, id)} />
      <SeatSelect value={seats[1]} players={players} placeholder={t('bundesliga.player2')} onChange={(id) => onSeat(1, id)} />
      {issues.map((i, k) => (
        <p
          key={k}
          className={`flex items-start gap-1 text-xs ${i.level === 'error' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}
        >
          {i.level === 'error' ? (
            <XCircle className="size-3.5 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
          )}
          {i.message}
        </p>
      ))}
    </div>
  );
}

export interface EncounterEditorProps {
  opponent: Team;
  myPlayers: Player[];
  opponentPlayers: Player[];
  lineup: Lineup;
  opponentLineup: Lineup;
  issues: LineupIssue[];
  opponentIssues: LineupIssue[];
  onChange: (lineup: Lineup) => void;
  onOpponentChange: (lineup: Lineup) => void;
}

export function EncounterEditor({
  opponent,
  myPlayers,
  opponentPlayers,
  lineup,
  opponentLineup,
  issues,
  opponentIssues,
  onChange,
  onOpponentChange,
}: EncounterEditorProps) {
  const { t } = useTranslation();
  const myMap = toPlayerMap(myPlayers);
  const oppMap = toPlayerMap(opponentPlayers);

  const setSeat = (
    current: Lineup,
    emit: (l: Lineup) => void,
    boardId: BoardId,
    seat: 0 | 1,
    id: string | null
  ) => {
    const next: BoardSeats = [...current[boardId]] as BoardSeats;
    next[seat] = id;
    emit({ ...current, [boardId]: next });
  };

  const forBoard = (list: LineupIssue[], boardId: BoardId) => list.filter((i) => i.board === boardId);
  const crossMine = issues.filter((i) => i.board === null);
  const crossOpp = opponentIssues.filter((i) => i.board === null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Avatar className="size-6">
          {opponent.logoUrl ? <AvatarImage src={opponent.logoUrl} alt={opponent.name} /> : null}
          <AvatarFallback>{opponent.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground">{t('bundesliga.versus')}</span>
        <span className="font-semibold">{opponent.name}</span>
      </div>

      {BOARDS.map((board) => (
        <Card key={board.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{board.label}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <BoardSide
              label={t('bundesliga.we')}
              accent="text-primary"
              seats={lineup[board.id]}
              players={myPlayers}
              rgx={combinedRgx(lineup[board.id], myMap)}
              issues={forBoard(issues, board.id)}
              onSeat={(seat, id) => setSeat(lineup, onChange, board.id, seat, id)}
            />
            <BoardSide
              label={opponent.name}
              accent="text-muted-foreground"
              seats={opponentLineup[board.id]}
              players={opponentPlayers}
              rgx={combinedRgx(opponentLineup[board.id], oppMap)}
              issues={forBoard(opponentIssues, board.id)}
              onSeat={(seat, id) => setSeat(opponentLineup, onOpponentChange, board.id, seat, id)}
            />
          </CardContent>
        </Card>
      ))}

      {(crossMine.length > 0 || crossOpp.length > 0) && (
        <div className="flex flex-col gap-1 rounded-md border border-destructive/50 bg-destructive/5 p-3">
          {crossMine.map((i, k) => (
            <p key={`m${k}`} className="flex items-start gap-1 text-xs text-destructive">
              <XCircle className="size-3.5 mt-0.5 shrink-0" />
              {t('bundesliga.issuePrefixed', { team: t('bundesliga.we'), message: i.message })}
            </p>
          ))}
          {crossOpp.map((i, k) => (
            <p key={`o${k}`} className="flex items-start gap-1 text-xs text-destructive">
              <XCircle className="size-3.5 mt-0.5 shrink-0" />
              {t('bundesliga.issuePrefixed', { team: opponent.name, message: i.message })}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
