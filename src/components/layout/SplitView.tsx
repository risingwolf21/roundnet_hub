import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useIsWide } from "@/hooks/use-mobile";
import React from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useMatches } from "react-router";

/** Wide screens (see useIsWide): a list next to the open item, each scrolling on its own. */
export const SplitView = ({ list, detail }: { list: React.ReactNode; detail: React.ReactNode }) => (
  <div className="flex h-svh">
    <div className="flex w-96 shrink-0 flex-col overflow-y-auto border-r">{list}</div>
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-muted/30">{detail}</div>
  </div>
);

/**
 * Layout route around a list page and its detail pages. Phones and tablets render the matched page;
 * wide screens keep the list on the left and the open item, or an empty state, on the right.
 * `param` is the detail routes' id parameter, `list` gets its value to mark the open row.
 */
export const SplitRoute = ({ param, list, emptyIcon, emptyTitle, emptyDescription }: {
  param: string;
  list: (selectedId?: string) => React.ReactNode;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
}) => {
  const { t } = useTranslation();
  const isWide = useIsWide();
  const selectedId = useMatches().at(-1)?.params[param];

  if (!isWide) return <Outlet />;

  return (
    <SplitView
      list={list(selectedId)}
      detail={selectedId ? <Outlet /> : (
        <Empty className="m-auto">
          <EmptyHeader>
            <EmptyMedia variant="icon">{emptyIcon}</EmptyMedia>
            <EmptyTitle>{t(emptyTitle)}</EmptyTitle>
            <EmptyDescription>{t(emptyDescription)}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    />
  );
};
