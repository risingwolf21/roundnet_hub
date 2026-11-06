import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent } from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { useModerateReport, useOpenReports } from '@/tanstack/moderation';
import { format } from 'date-fns';
import { Check, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';
import { useDialogs } from '@/contexts/DialogsProvider';

const ModerationScreen = () => {
  const { t } = useTranslation();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const { data: reports = [], isLoading, refetch } = useOpenReports();
  const moderate = useModerateReport();

  const decide = async (reportId: string, action: 'dismiss' | 'remove') => {
    if (action === 'remove' && !(await dialogs.confirm(t('admin.moderation.removeConfirm')))) return;
    moderate.mutate(
      { reportId, action },
      {
        onSuccess: () => toast.success(t(action === 'remove' ? 'admin.moderation.removed' : 'admin.moderation.dismissed')),
        onError: () => toast.error(t('admin.moderation.error')),
      }
    );
  };

  return (
    <div>
      <AppBar title={t('admin.moderation.title')} user={user} />
      <main className="flex-1 size-full pb-safe-bottom">
        <PullToRefresh onRefresh={() => refetch()}>
          {isLoading && <Skeleton className="m-4 h-24" />}
          {!isLoading && reports.length === 0 && (
            <p className="p-6 text-center text-muted-foreground">{t('admin.moderation.empty')}</p>
          )}
          {reports.map((report) => (
            <Item key={report.id} className="flex-col items-stretch rounded-none border-b-border">
              <ItemContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t(`moderation.reasons.${report.reason}`)}</span>
                  <span>{format(new Date(report.created_at), 'dd.MM.yyyy HH:mm')}</span>
                </div>
                <blockquote className="border-l-2 pl-3 text-sm">{report.comment_text}</blockquote>
                {report.details && <p className="text-xs text-muted-foreground">{report.details}</p>}
              </ItemContent>
              <ItemActions className="justify-end">
                <Button variant="outline" size="sm" disabled={moderate.isPending} onClick={() => decide(report.id, 'dismiss')}>
                  <Check /> {t('admin.moderation.dismiss')}
                </Button>
                <Button variant="destructive" size="sm" disabled={moderate.isPending} onClick={() => decide(report.id, 'remove')}>
                  <Trash2 /> {t('admin.moderation.remove')}
                </Button>
              </ItemActions>
            </Item>
          ))}
        </PullToRefresh>
      </main>
    </div>
  );
};

export default ModerationScreen;
