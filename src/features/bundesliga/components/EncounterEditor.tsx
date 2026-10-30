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
import { BOARDS, type BoardSeats, type Lineup, type Player, type Team } from '../types';
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
  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>— frei —</SelectItem>
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

export interface EncounterEditorProps {
  opponent: Team;
  myPlayers: Player[];
  lineup: Lineup;
  issues: LineupIssue[];
  onChange: (lineup: Lineup) => void;
}

export function EncounterEditor({ opponent, myPlayers, lineup, issues, onChange }: EncounterEditorProps) {
  const playerMap = toPlayerMap(myPlayers);

  const setSeat = (boardId: keyof Lineup, seat: 0 | 1, id: string | null) => {
    const next: BoardSeats = [...lineup[boardId]] as BoardSeats;
    next[seat] = id;
    onChange({ ...lineup, [boardId]: next });
  };

  const boardIssues = (boardId: string) => issues.filter((i) => i.board === boardId);
  const crossIssues = issues.filter((i) => i.board === null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Avatar className="size-6">
          {opponent.logoUrl ? <AvatarImage src={opponent.logoUrl} alt={opponent.name} /> : null}
          <AvatarFallback>{opponent.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground">gegen</span>
        <span className="font-semibold">{opponent.name}</span>
      </div>

      {BOARDS.map((board) => {
        const seats = lineup[board.id];
        const rgx = combinedRgx(seats, playerMap);
        const bIssues = boardIssues(board.id);
        const hasError = bIssues.some((i) => i.level === 'error');
        return (
          <Card key={board.id} className={hasError ? 'border-destructive' : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{board.label}</span>
                <Badge variant={hasError ? 'destructive' : 'secondary'}>RGX {rgx}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <SeatSelect
                value={seats[0]}
                players={myPlayers}
                placeholder="Spieler 1"
                onChange={(id) => setSeat(board.id, 0, id)}
              />
              <SeatSelect
                value={seats[1]}
                players={myPlayers}
                placeholder="Spieler 2"
                onChange={(id) => setSeat(board.id, 1, id)}
              />
              {bIssues.map((i, k) => (
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
            </CardContent>
          </Card>
        );
      })}

      {crossIssues.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-destructive/50 bg-destructive/5 p-3">
          {crossIssues.map((i, k) => (
            <p key={k} className="flex items-start gap-1 text-xs text-destructive">
              <XCircle className="size-3.5 mt-0.5 shrink-0" />
              {i.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
