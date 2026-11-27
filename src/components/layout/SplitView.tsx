import React from "react";

/** Wide screens (see useIsWide): a list next to the open item, each scrolling on its own. */
export const SplitView = ({ list, detail }: { list: React.ReactNode; detail: React.ReactNode }) => (
  <div className="flex h-svh">
    <div className="flex w-96 shrink-0 flex-col overflow-y-auto border-r">{list}</div>
    <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-muted/30">{detail}</div>
  </div>
);
