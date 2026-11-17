import { createContext, use } from 'react';

/** A new version downloading in the background: undefined = none, null = running but progress not known yet, else 0..1. */
export type UpdateDownload = number | null | undefined;

export const UpdateDownloadContext = createContext<UpdateDownload>(undefined);

export const useUpdateDownload = () => use(UpdateDownloadContext);
