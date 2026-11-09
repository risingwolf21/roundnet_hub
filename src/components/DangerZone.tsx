import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { TriangleAlert } from 'lucide-react';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Separate, red box for one irreversible action. Never put it next to a harmless action. */
export const DangerZone = ({
  description,
  actionLabel,
  onAction,
  loading,
  icon,
}: {
  description: string;
  actionLabel: string;
  onAction: () => void;
  loading?: boolean;
  icon?: ReactNode;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4">
      <div className="flex items-center gap-2 font-medium text-destructive">
        <TriangleAlert className="size-4" />
        {t('profile.account.dangerZone')}
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button variant="destructive" className="max-sm:w-full sm:self-start" disabled={loading} onClick={onAction}>
        {loading ? <Spinner /> : icon}
        {actionLabel}
      </Button>
    </div>
  );
};
