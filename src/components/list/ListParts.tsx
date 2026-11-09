import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { ReactNode, useEffect, useRef } from 'react';

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

/**
 * Visible, one-tap choice between a few views of the same list (instead of an icon that opens a picker).
 * Options share the width; when they do not fit (four or five options on a phone) the control scrolls
 * sideways instead of cutting the labels, and keeps the active option in view.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector('[aria-checked="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [value, options.length]);

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'grid auto-cols-[minmax(max-content,1fr)] grid-flow-col gap-1 overflow-x-auto rounded-lg bg-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
              active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="whitespace-nowrap">{option.label}</span>
            {option.count !== undefined && option.count > 0 && (
              <span
                className={cn(
                  'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                  active ? 'bg-primary text-primary-foreground' : 'bg-foreground/10'
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Heading of a group of rows, with an optional count. */
export const ListSectionHeader = ({
  title,
  count,
  icon,
  className,
}: {
  title: string;
  count?: number;
  icon?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'flex items-center gap-2 px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground [&>svg]:size-4',
      className
    )}
  >
    {icon}
    <span>{title}</span>
    {count !== undefined && <span className="font-normal">· {count}</span>}
  </div>
);

export const ListError = ({
  title,
  description,
  retryLabel,
  onRetry,
}: {
  title: string;
  description?: string;
  retryLabel: string;
  onRetry: () => void;
}) => (
  <Empty className="mt-12">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <AlertCircle className="text-destructive" />
      </EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      {description && <EmptyDescription>{description}</EmptyDescription>}
    </EmptyHeader>
    <Button variant="outline" onClick={onRetry}>
      <RefreshCcw className="size-4" />
      {retryLabel}
    </Button>
  </Empty>
);

/** Skeleton rows with the height of a two-line list item. */
export const ListSkeleton = ({ rows = 4, className }: { rows?: number; className?: string }) => (
  <div className={cn('flex flex-col gap-2', className)}>
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
    ))}
  </div>
);

const SIDE_BAR_TONES = {
  primary: 'border-l-primary',
  info: 'border-l-info',
  success: 'border-l-success',
  warning: 'border-l-warning',
  error: 'border-l-error',
  neutral: 'border-l-border',
} as const;

export type SideBarTone = keyof typeof SIDE_BAR_TONES;

/**
 * The one way to show a state or colour on the left edge of a row or card: a 4 px left border that follows the
 * rounded corners. Put it on the `Item`/card itself (never on an inner element) so every list looks the same.
 * Use `sideBar(tone)` for states and `groupSideBar(color)` for a group's colour.
 */
export const sideBar = (tone: SideBarTone = 'neutral') => cn('border-l-4', SIDE_BAR_TONES[tone]);

export const groupSideBar = (color?: string | null) => ({
  className: 'border-l-4',
  style: color ? { borderLeftColor: color } : undefined,
});
