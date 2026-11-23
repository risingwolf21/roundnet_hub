import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

/** A row of the event hero: icon chip, title, optional subtitle and action. Tinted chips use `--group-color`. */
export const InfoRow = ({
  icon: Icon,
  title,
  subtitle,
  action,
  tinted = false,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  tinted?: boolean;
}) => (
  <div className="flex items-center gap-3">
    <div
      aria-hidden="true"
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-lg',
        tinted ? 'bg-[color:var(--group-color)]/10 text-[color:var(--group-color)]' : 'bg-muted text-muted-foreground'
      )}
    >
      <Icon className="size-5" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold">{title}</p>
      {subtitle && <p className="truncate text-xs text-muted-foreground tabular-nums">{subtitle}</p>}
    </div>
    {action}
  </div>
);
