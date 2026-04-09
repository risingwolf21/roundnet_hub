'use client'

import {
  ChevronLeft,
  ChevronRight,
  Database,
  ScrollText
} from 'lucide-react'
import { ReactNode, useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { useSheetNavigation } from '../SheetNavigationContext'
import { DatabaseManager } from './database'
import { LogsManager } from './logs'

export function DialogView({ projectRef, isMobile }: { projectRef: string; isMobile?: boolean }) {
  const { stack, push, popTo, reset } = useSheetNavigation()

  const handleTopLevelNavigation = (title: string, component: ReactNode) => {
    if (stack.length === 1 && stack[0].title === title) {
      return
    }
    reset()
    push({ title, component })
  }

  const currentView = stack[stack.length - 1]
  const activeManager = stack.length > 0 ? stack[0].title : null

  const navigationItems = useMemo(
    () => [
      {
        title: 'Database',
        icon: Database,
        component: <DatabaseManager projectRef={projectRef} />,
      },
      // {
      //   title: 'Storage',
      //   icon: HardDrive,
      //   component: <StorageManager projectRef={projectRef} />,
      // },
      // {
      //   title: 'Auth',
      //   icon: Shield,
      //   component: <AuthManager projectRef={projectRef} />,
      // },
      // {
      //   title: 'Users',
      //   icon: Users,
      //   component: <UsersManager projectRef={projectRef} />,
      // },
      // {
      //   title: 'Secrets',
      //   icon: KeyRound,
      //   component: <SecretsManager projectRef={projectRef} />,
      // },
      {
        title: 'Logs',
        icon: ScrollText,
        component: <LogsManager projectRef={projectRef} />,
      },
      // {
      //   title: 'Suggestions',
      //   icon: Lightbulb,
      //   component: <SuggestionsManager projectRef={projectRef} />,
      // },
    ],
    [projectRef]
  )

  if (isMobile) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Content Area */}
        <div className="flex flex-col overflow-hidden h-full">
          <div className="grow overflow-y-auto">
            {currentView ? (
              currentView.component
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  Select a manager from the bottom navigation to get started.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="border-t bg-background">
          <div className="overflow-x-auto">
            <div className="flex gap-1 p-2 min-w-max">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.title}
                    variant={activeManager === item.title ? 'secondary' : 'ghost'}
                    className="flex-col h-16 w-20 min-w-16 text-xs gap-1 px-2"
                    onClick={() => handleTopLevelNavigation(item.title, item.component)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] leading-tight text-center">
                      {item.title === 'Auth' ? 'Auth' : item.title}
                    </span>
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[240px_1fr] h-full overflow-hidden">
      {/* Sidebar */}
      <div className="flex flex-col border-r px-3 py-6 pb-3">
        <div className="px-4 mb-4">
          <h2 className="text-muted-foreground font-semibold text-sm">Manage your back-end</h2>
        </div>
        <div className="grow space-y-0.5">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.title}
                variant={activeManager === item.title ? 'secondary' : 'ghost'}
                className="w-full justify-start text-sm"
                onClick={() => handleTopLevelNavigation(item.title, item.component)}
              >
                <Icon className="mr-2 text-muted-foreground" />
                {item.title === 'Auth' ? 'Authentication' : item.title}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col overflow-hidden h-full">
        {/* Header with breadcrumbs */}
        <div className="flex items-center h-12 shrink-0 px-4 relative border-b">
          {stack.length > 1 && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 relative z-10"
              onClick={() => popTo(stack.length - 2)}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          )}
          {/* Breadcrumbs */}
          <div className="ml-4 flex items-center gap-1.5 text-sm text-muted-foreground relative z-10">
            {stack.map((item: { title: string }, index: number) => (
              <div key={`${item.title}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="h-3 w-3" />}
                {index === stack.length - 1 ? (
                  <span className="font-semibold text-foreground">{item.title}</span>
                ) : (
                  <button onClick={() => popTo(index)} className="hover:underline">
                    {item.title}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grow overflow-y-auto">
          {currentView ? (
            currentView.component
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                Select a manager from the sidebar to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}