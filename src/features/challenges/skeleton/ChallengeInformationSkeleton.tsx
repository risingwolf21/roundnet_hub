import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
// Passe den Import der AppBar an, falls sie hier als Dummy gebraucht wird, 
// oder nutze das div-Mockup unten.

export function ChallengeInformationSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-full flex-col">
      {/* Mocked AppBar (um Prop-Typ-Fehler bei null-Daten zu vermeiden) */}
      <header className="flex h-14 w-full items-center justify-between border-b px-4 shadow-sm bg-white">
        <div className="flex items-center gap-4">
          {/* Back Button Skeleton */}
          <Skeleton className="h-8 w-8 rounded-full" />
          {/* Title Skeleton */}
          <Skeleton className="h-6 w-48" />
        </div>
        {/* Action Button Skeleton */}
        <Skeleton className="h-10 w-10 rounded-md" />
      </header>

      <main className="flex-1 size-full pb-safe-bottom p-2">
        <div className="gap-2 flex w-full max-w-lg flex-col">
          <div className="text-sm font-semibold">{t('costs.description')}</div>
          {/* Description Lines Skeleton */}
          <div className="flex flex-col gap-2 mt-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[85%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        </div>

        <div className="w-full mt-6">
          {/* TabsList Skeleton */}
          <div className="grid w-full grid-cols-2 bg-white border h-12 shadow-sm rounded-lg p-1 gap-1">
            <Skeleton className="h-full w-full rounded-md" />
            <Skeleton className="h-full w-full rounded-md" />
          </div>

          <div className="mt-2">
            {/* 7-Tage-Ansicht Skeleton (Item variant outline mockup) */}
            <div className="border rounded-xl p-4 bg-card shadow-sm">
              <div className="flex flex-row w-full">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-center items-center gap-2">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            </div>

            {/* Activity List Skeleton (3 Fake-Einträge) */}
            <div className="mt-4 flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-row items-center gap-4 border p-3 rounded-lg bg-card shadow-sm">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex flex-col gap-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button (FAB) Skeleton */}
      <div
        className="fixed right-6 z-50"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <Skeleton className="h-14 w-14 rounded-full shadow-lg" />
      </div>
    </div>
  );
}