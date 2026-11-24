import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useGrants } from '@/features/auth/GrantsContext';
import { useAddCommentMutation } from '@/tanstack/events';
import { eventInThePast, EventsUserView, FullComment } from '@/types/supabaseTypes';
import { getInitials } from '@/utils';
import { MessageSquare, SendHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const Message = ({
  comment,
  time,
  onOpenProfile,
  onReply,
  children,
}: {
  comment: FullComment;
  time: string;
  onOpenProfile: () => void;
  onReply?: () => void;
  children?: React.ReactNode;
}) => {
  const { t } = useTranslation();
  return (
    <article className="flex gap-2.5">
      <button type="button" className="shrink-0 self-start" aria-label={comment.displayName ?? comment.user.name ?? ''} onClick={onOpenProfile}>
        <Avatar>
          <AvatarImage src={comment.user.avatarUrl || ''} />
          <AvatarFallback className="bg-primary text-xs text-primary-foreground">{getInitials(comment.user.name ?? 'User')}</AvatarFallback>
        </Avatar>
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="min-w-0 break-words text-sm font-semibold">{comment.displayName}</p>
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={comment.created_at}>{time}</time>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">{comment.comment}</p>
        {onReply && (
          <Button type="button" variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground" onClick={onReply}>
            {t('events.reply')}
          </Button>
        )}
        {children}
      </div>
    </article>
  );
};

const CommentsTab = ({ event, user, comments, readOnly = false }: { event: EventsUserView; user: User; comments: FullComment[]; readOnly?: boolean }) => {
  const { t, i18n } = useTranslation();
  const dialogs = useDialogs();
  const addCommentMutation = useAddCommentMutation(user);
  const { hasPerm } = useGrants();
  const [replyingTo, setReplyingTo] = useState<FullComment | null>(null);

  const isOver = eventInThePast(event);
  const canComment = !readOnly && !isOver && hasPerm('event.comment');
  const timeFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const time = (c: FullComment) => timeFormat.format(new Date(c.created_at));

  const submit = (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);

    const commentValue = data.get('comment')?.toString();
    if (!commentValue) return;

    addCommentMutation.mutate(
      { event, comment: commentValue, reply_to: replyingTo },
      {
        onSuccess: () => {
          setReplyingTo(null);
        },
        onError: () => {
          toast.error(t('events.commentsTab.addError'));
        },
      }
    );
    formEvent.currentTarget.reset();
  };

  return (
    <TabsContent value="comments" className="m-0 flex flex-col gap-3">
      <Card>
        <CardContent className="flex flex-col gap-4">
          {comments.length > 0 ? (
            comments.map((comment, i) => (
              <div key={comment.id} className={i > 0 ? 'border-t pt-4' : undefined}>
                <Message
                  comment={comment}
                  time={time(comment)}
                  onOpenProfile={() => dialogs.userProfile(comment.user.id)}
                  onReply={canComment ? () => setReplyingTo(comment) : undefined}
                >
                  {comment.replies.length > 0 && (
                    <div className="mt-2 flex flex-col gap-3 border-l-2 pl-3">
                      {comment.replies.map((reply) => (
                        <Message key={reply.id} comment={reply} time={time(reply)} onOpenProfile={() => dialogs.userProfile(reply.user.id)} />
                      ))}
                    </div>
                  )}
                </Message>
              </div>
            ))
          ) : (
            <Empty className="p-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageSquare />
                </EmptyMedia>
                <EmptyTitle>{t('events.commentsTab.emptyTitle')}</EmptyTitle>
                <EmptyDescription>{t('events.commentsTab.emptyDescription')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      {canComment && (
        <Card size="sm">
          <CardContent>
            <form onSubmit={submit} className="flex flex-col gap-2">
              {replyingTo && (
                <div className="flex items-center gap-2 rounded-lg bg-muted py-1 pr-1 pl-2.5">
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {t('events.replyTo', { name: replyingTo.user?.displayName || replyingTo.user?.name })}
                  </span>
                  <Button type="button" variant="ghost" size="icon-lg" aria-label={t('events.commentsTab.cancelReply')} onClick={() => setReplyingTo(null)}>
                    <X />
                  </Button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <label htmlFor="comment" className="sr-only">{t('events.commentsTab.placeholder')}</label>
                <Textarea
                  id="comment"
                  name="comment"
                  rows={1}
                  placeholder={t('events.commentsTab.placeholder')}
                  className="min-h-11 max-h-32 flex-1 resize-none"
                />
                <Button type="submit" size="icon-lg" className="size-11 shrink-0" aria-label={t('events.commentsTab.send')} disabled={addCommentMutation.isPending}>
                  <SendHorizontal />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!readOnly && isOver && (
        <p className="px-1 text-center text-xs text-muted-foreground">{t('events.commentsTab.closed')}</p>
      )}
    </TabsContent>
  );
};

export default CommentsTab;
