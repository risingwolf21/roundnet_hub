import { ListSkeleton } from '@/components/list/ListParts';
import { Skeleton } from '@/components/ui/skeleton';

export function ChallengeInformationSkeleton() {
  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex h-14 w-full items-center gap-4 border-b bg-background px-4 shadow-sm">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </header>

      <main className="flex-1 size-full pb-safe-bottom">
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
          <Skeleton className="h-11 w-full rounded-lg" />
          <ListSkeleton rows={3} />
        </div>
      </main>
    </div>
  );
}
