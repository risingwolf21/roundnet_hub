import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Item, ItemContent, ItemMedia } from '@/components/ui/item';
import { TabsContent } from '@/components/ui/tabs';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useGrants } from '@/features/auth/GrantsContext';
import { useAddCommentMutation } from '@/tanstack/events';
import { eventInThePast, EventsUserView, FullComment } from '@/types/supabaseTypes';
import { getInitials } from '@/utils';
import { format } from 'date-fns';
import { MessageSquare, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const CommentsTab = ({ event, user, comments }: { event: EventsUserView; user: User; comments: FullComment[] }) => {
  const { t } = useTranslation();
  const dialogs = useDialogs();
  const addCommentMutation = useAddCommentMutation(user);
  const { hasPerm } = useGrants();
  const [replyingTo, setReplyingTo] = useState<FullComment | null>(null);

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
    <TabsContent value="comments" className="m-0">
      <Card className="pt-0 gap-0">
        <CardHeader className="border-b !py-2">
          <div className="flex justify-between items-center !p-0">
            <CardTitle className="text-lg flex items-center">
              {t('events.commentsTab.title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
          {comments.length > 0 ? (
            comments.map(comment => (
              <div key={comment.id}>
                <Item key={comment.id} className="flex flex-row items-center gap-3 border-b last:border-0 p-0">
                  <ItemMedia onClick={() => dialogs.userProfile(comment.user.id)}>
                    <Avatar>
                      <AvatarImage src={comment.user.avatarUrl || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(comment.user.name ?? "User")}</AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{comment.displayName}</p>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "dd.MM HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 ">{comment.comment}</p>

                      {/* Reply button */}
                      {!eventInThePast(event) && hasPerm('event.comment') && (
                        <Button
                          type="button"
                          variant={"outline"}
                          size={"xs"}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setReplyingTo(comment)}
                        >
                          {t('events.reply')}
                        </Button>
                      )}
                    </div>
                  </ItemContent>
                </Item>


                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="flex flex-col">
                    {comment.replies.map(reply => (
                      <Item key={reply.id} className="flex w-full flex-row gap-4 pr-0">
                        <ItemMedia onClick={() => dialogs.userProfile(reply.user.id)}>
                          <Avatar>
                            <AvatarImage src={reply.user.avatarUrl || ""} />
                            <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(reply.user.name ?? "User")}</AvatarFallback>
                          </Avatar>
                        </ItemMedia>
                        <ItemContent>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold">{reply.displayName}</p>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(reply.created_at), "dd.MM HH:mm")}
                              </span>
                            </div>
                            <div className="text-foreground/90 mt-0.5">
                              {reply.comment}
                            </div>
                          </div>
                        </ItemContent>
                      </Item>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 text-muted-foreground">
              <MessageSquare className="h-10 w-10 opacity-20" />
              <p><Trans i18nKey="events.commentsTab.empty" components={{ br: <br /> }} /></p>
            </div>
          )}
        </CardContent>

        {/* Comment Input */}
        <form onSubmit={submit}>
          {replyingTo && (
            <div className="px-3 py-2 border-t  justify-between w-full flex items-center gap-1 text-xs text-muted-foreground">
              <span>{t('events.replyTo', { name: replyingTo.user?.displayName || replyingTo.user?.name })}</span>
              <Button
                variant={"outline"}
                className="ml-1 hover:text-foreground transition-colors"
                onClick={() => setReplyingTo(null)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="p-3 pb-0 border-t bg-background shrink-0 flex items-center gap-2">
            <Avatar>
              <AvatarImage src={user.avatarUrl || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(user.name ?? "User")}</AvatarFallback>
            </Avatar>
            <textarea
              id="comment"
              name="comment"
              placeholder={t('events.commentsTab.placeholder')}
              className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={1}
            />
            <Button
              type="submit"
              className="shrink-0"
              disabled={eventInThePast(event) || !hasPerm('event.comment')}>{t('admin.notify.send')}</Button>
          </div>
        </form>
      </Card>
    </TabsContent>
  );
};

export default CommentsTab;
