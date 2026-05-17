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
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const CommentsTab = ({ event, user, comments }: { event: EventsUserView; user: User; comments: FullComment[] }) => {
  const dialogs = useDialogs();
  const addCommentMutation = useAddCommentMutation(user);
  const { hasPerm } = useGrants();

  const submit = (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);

    const commentValue = data.get('comment')?.toString();
    if (!commentValue) return;

    addCommentMutation.mutate(
      { event, comment: commentValue, reply_to: null },
      {
        onError: () => {
          toast.error('Kommentar konnte nicht hinzugefügt werden.');
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
              Kommentare
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
          {comments.length > 0 ? (
            comments.map(comment => (
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

                    {/* Nested Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 space-y-3 pl-4 border-l-2">
                        {comment.replies.map(reply => (
                          <Item key={reply.id} className="flex gap-2">
                            <ItemMedia onClick={() => dialogs.userProfile(reply.user.id)}>
                              <Avatar>
                                <AvatarImage src={reply.user.avatarUrl || ""} />
                                <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(reply.user.name ?? "User")}</AvatarFallback>
                              </Avatar>
                            </ItemMedia>
                            <ItemContent>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold">{reply.displayName}</p>
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(reply.created_at), "HH:mm")}
                                  </span>
                                </div>
                                <div className="text-xs text-foreground/90 mt-0.5">
                                  {reply.comment}
                                </div>
                              </div>
                            </ItemContent>
                          </Item>
                        ))}
                      </div>
                    )}
                  </div>
                </ItemContent>
              </Item>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 text-muted-foreground">
              <MessageSquare className="h-10 w-10 opacity-20" />
              <p>Noch keine Kommentare.<br />Sei der Erste!</p>
            </div>
          )}
        </CardContent>

        {/* Comment Input */}
        <form onSubmit={submit}>
          <div className="p-3 pb-0 border-t bg-background shrink-0 flex items-center gap-2">
            <Avatar>
              <AvatarImage src={user.avatarUrl || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(user.name ?? "User")}</AvatarFallback>
            </Avatar>
            <textarea
              id="comment"
              name="comment"
              placeholder="Kommentar schreiben..."
              className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={1}
            />
            <Button
              type="submit"
              className="shrink-0"
              disabled={eventInThePast(event) || !hasPerm('event.comment')}>Senden</Button>
          </div>
        </form>
      </Card>
    </TabsContent>
  );
};

export default CommentsTab;
