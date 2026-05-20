import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAllUsersAsAdmin, useNotifyEmitMutation } from '@/tanstack/admin';
import { useGroupAllUsers, useGroups } from '@/tanstack/groups';
import { useNotificationTopics } from '@/tanstack/notifications';
import { Send, Users, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';

type TargetMode = 'group' | 'users';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

const NotifyUsersScreen = () => {
  const { t } = useTranslation();
  const { user } = useGrants();

  const [mode, setMode] = useState<TargetMode>('group');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(() => new Set());
  const [topic, setTopic] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'high'>('normal');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');

  const { data: groups = [] } = useGroups();
  const { data: groupUsers = [] } = useGroupAllUsers(mode === 'group' ? selectedGroupId : undefined);
  const { data: allUsers = [] } = useAllUsersAsAdmin();
  const { data: topics = [] } = useNotificationTopics();

  const notifyEmit = useNotifyEmitMutation();

  const recipients =
    mode === 'group'
      ? groupUsers.map((gu: GroupUsers) => gu.user?.id ?? gu.user).filter(Boolean) as string[]
      : Array.from(selectedUserIds);

  const filteredUsers = allUsers.filter(
    u =>
      search === '' ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleUser = (userId: string) =>
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });

  const canSend = recipients.length > 0 && topic && title.trim() && body.trim();

  const handleSend = () => {
    if (!canSend) return;
    notifyEmit.mutate(
      {
        recipients,
        topic,
        title: title.trim(),
        body: body.trim(),
        urgency,
        scopeType: mode === 'group' && selectedGroupId ? 'group' : 'global',
        scopeId: mode === 'group' && selectedGroupId ? selectedGroupId : NIL_UUID,
        sourceId: user!.id,
      },
      {
        onSuccess: count => {
          toast.success(t('admin.notify.success', { count }));
          setTitle('');
          setBody('');
          setSelectedUserIds(new Set());
        },
        onError: err => toast.error(err.message),
      },
    );
  };

  return (
    <div>
      <AppBar title={t('admin.notify.title')} user={user} />
      <main className="flex-1 size-full pb-safe-bottom">
        <div className="p-4 flex flex-col gap-5">

          {/* Mode toggle */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              {t('admin.notify.recipients')}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mode === 'group' ? 'default' : 'outline'}
                className="gap-2"
                onClick={() => setMode('group')}
              >
                <UsersRound className="size-4" />
                {t('admin.notify.targetGroup')}
              </Button>
              <Button
                variant={mode === 'users' ? 'default' : 'outline'}
                className="gap-2"
                onClick={() => setMode('users')}
              >
                <Users className="size-4" />
                {t('admin.notify.targetUsers')}
              </Button>
            </div>
          </div>

          {/* Group picker */}
          {mode === 'group' && (
            <div>
              <Label className="mb-1.5 block text-sm">{t('admin.notify.selectGroup')}</Label>
              <Select value={selectedGroupId} onValueChange={(val) => val && setSelectedGroupId(val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.notify.selectGroup')} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedGroupId && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t('admin.notify.recipientCount', { count: groupUsers.length })}
                </p>
              )}
            </div>
          )}

          {/* User multi-select */}
          {mode === 'users' && (
            <div>
              <Label className="mb-1.5 block text-sm">{t('admin.notify.searchUsers')}</Label>
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('admin.notify.searchUsers')}
                className="mb-2"
              />
              <div className="border rounded-lg divide-y max-h-52 overflow-y-auto">
                {filteredUsers.map(u => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40"
                    onClick={() => toggleUser(u.id)}
                  >
                    <Checkbox checked={selectedUserIds.has(u.id)} onCheckedChange={() => toggleUser(u.id)} />
                    <Avatar className="size-7 shrink-0">
                      <AvatarImage src={u.avatarUrl || undefined} />
                      <AvatarFallback>{(u.displayName || u.name || 'U')[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{u.displayName || u.name}</span>
                  </div>
                ))}
              </div>
              {selectedUserIds.size > 0 && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t('admin.notify.recipientCount', { count: selectedUserIds.size })}
                </p>
              )}
            </div>
          )}

          {/* Topic */}
          <div>
            <Label className="mb-1.5 block text-sm">{t('admin.notify.topic')}</Label>
            <Select value={topic} onValueChange={(topic) => topic && setTopic(topic)}>
              <SelectTrigger>
                <SelectValue placeholder={t('admin.notify.selectTopic')} />
              </SelectTrigger>
              <SelectContent>
                {topics.length === 0 && (
                  <SelectItem value="_none" disabled>{t('admin.notify.noTopics')}</SelectItem>
                )}
                {topics.map(tp => (
                  <SelectItem key={tp.topic} value={tp.topic}>
                    {tp.description ?? tp.topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Urgency */}
          <div>
            <Label className="mb-1.5 block text-sm">{t('admin.notify.urgency')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={urgency === 'normal' ? 'default' : 'outline'} onClick={() => setUrgency('normal')}>
                {t('admin.notify.urgencyNormal')}
              </Button>
              <Button variant={urgency === 'high' ? 'default' : 'outline'} onClick={() => setUrgency('high')}>
                {t('admin.notify.urgencyHigh')}
              </Button>
            </div>
          </div>

          {/* Title */}
          <div>
            <Label className="mb-1.5 block text-sm">{t('admin.notify.titleField')}</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('admin.notify.titleField')}
            />
          </div>

          {/* Body */}
          <div>
            <Label className="mb-1.5 block text-sm">{t('admin.notify.body')}</Label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={t('admin.notify.body')}
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSend}
            disabled={!canSend || notifyEmit.isPending}
            className="gap-2 w-full"
          >
            <Send className="size-4" />
            {notifyEmit.isPending
              ? t('admin.notify.sending')
              : recipients.length > 0
                ? t('admin.notify.sendTo', { count: recipients.length })
                : t('admin.notify.send')}
          </Button>

        </div>
      </main>
    </div>
  );
};

export default NotifyUsersScreen;
