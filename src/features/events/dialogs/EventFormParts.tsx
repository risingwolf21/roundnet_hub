import { LucideIcon, Minus, Plus } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export const FormSection = ({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
    <header className="flex items-center gap-2 text-sm font-semibold">
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      {title}
    </header>
    {children}
  </section>
);

/** A labelled switch that reveals its settings only while it is on. */
export const ToggleRow = ({
  id,
  title,
  description,
  checked,
  onCheckedChange,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3">
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
    {checked && children}
  </div>
);

export const Stepper = ({
  value,
  min = 0,
  onChange,
  label,
}: {
  value: number;
  min?: number;
  onChange: (value: number) => void;
  label: string;
}) => (
  <div className="flex items-center gap-2">
    <Button type="button" variant="outline" size="icon-lg" aria-label={`${label} −`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
      <Minus />
    </Button>
    <Input
      type="number"
      inputMode="numeric"
      aria-label={label}
      className="w-20 text-center"
      value={value}
      onChange={(e) => {
        const parsed = Number.parseInt(e.target.value);
        onChange(Number.isNaN(parsed) ? min : Math.max(min, parsed));
      }}
    />
    <Button type="button" variant="outline" size="icon-lg" aria-label={`${label} +`} onClick={() => onChange(value + 1)}>
      <Plus />
    </Button>
  </div>
);

export const FieldHint = ({ error, children }: { error?: boolean; children: React.ReactNode }) => (
  <p className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>{children}</p>
);
