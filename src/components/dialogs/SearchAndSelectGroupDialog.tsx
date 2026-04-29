import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { DialogProps } from '@/contexts/DialogsProvider';
import { Search, Users, X } from 'lucide-react';
import { AlertDialog, AlertDialogContent } from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';

type BasePayload = {
  groupsToFilter: string[];
};


const SearchAndSelectGroupDialog = (props: DialogProps<BasePayload, Group | null>) => {

  const { open, payload: { groupsToFilter } } = props;

  const [selectedUsers, setSelectedUsers] = useState<User[]>(Array.from<User>([]));
  const [searchString, setSearchString] = useState<string>('');

  const { data: users = [], isLoading } = useQuery<Group[]>({
    queryKey: ['group', 'searchAndSelectDialog', ...groupsToFilter],
    queryFn: async () => {
      const result = await supabase
        .schema('public')
        .from('event_group')
        .select('*')
        .not('id', 'in', `(${groupsToFilter.join(',')})`)
        .throwOnError();

      return result.data ?? [];
    },
  });

  const handleChange = (user: User) => {
    if (selectedUsers.some((x: User) => x.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((y) => y.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  return <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && props.onClose(null)}>
    <AlertDialogContent variant={"fullscreen"} className={"p-0 flex flex-col"}>
      <div className={"pt-safe-top sticky top-0 flex h-14 w-full items-center gap-4 bg-background/95 px-4 supports-[backdrop-filter]:bg-background md:px-4 transition-shadow border-b shadow-sm"}>

        <div className="flex items-center gap-2 md:gap-4 lg:w-1/3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => props.onClose(null)}
            className="shrink-0 rounded-full -ml-1"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-1 items-center justify-center lg:w-1/3">
          <div className="relative w-full max-w-md flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              className="w-full rounded-full bg-muted/50 pl-9 focus-visible:bg-background"
            />
          </div>
        </div>
      </div>

      {isLoading && <Spinner className="m-4" />}

      <div className='flex-1 min-h-0 overflow-y-auto flex flex-col'>

        {
          users.length === 0 && <div className='flex-1 flex flex-col items-center justify-center p-4'>
            <div className='rounded-md border border-dashed p-6 text-center'>
              <Users className='text-muted-foreground mx-auto size-12' />
              <p className='mt-2 text-sm font-medium'>Keine Gruppen gefunden</p>
            </div>
          </div>
        }
        {users.length > 0 &&
          users
            .filter((group) => group.name.toLowerCase().includes(searchString.toLowerCase()))
            .map((group: Group) => (
              <div key={group.id} className=" flex flex-row w-full justify-between px-4 py-2 border-b"
                onClick={() => props.onClose(group)}>
                <div className="flex flex-row items-center gap-2">
                  <div>
                    <div>{group.name}</div>
                    <div className="text-xs text-muted-foreground">{group.description}</div>
                  </div>
                </div>
              </div>
            ))}
      </div>

    </AlertDialogContent>
  </AlertDialog>
};

export default SearchAndSelectGroupDialog;
