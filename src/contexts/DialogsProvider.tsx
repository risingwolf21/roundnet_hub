import SearchAndSelectGroupDialogShadcn from '@/components/dialogs/SearchAndSelectGroupDialog.shadcn';
import SearchAndSelectUserDialogShadcn from '@/components/dialogs/SearchAndSelectUsersDialog.shadcn';
import { SelectSingleOptionDialog } from '@/components/dialogs/SelectSingleOptionDialog.shadcn';
import { ProfileDialogShadcn } from '@/components/ProfileDialog.shadcn';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import React, { createContext, use, useCallback, useState } from 'react';

// 1. Das Toolpad-ähnliche Interface für ALLE Dialoge
export interface DialogProps<Payload = void, Result = void> {
  open: boolean;
  onClose: (result: Result | null) => void;
  payload: Payload;
}

// 2. Interne Typen für den State
interface ActiveDialog<P = any, R = any> {
  id: string;
  Component: React.ComponentType<DialogProps<P, R>>;
  payload?: P;
  open: boolean;
  resolve: (value: R | null) => void;
}

export interface ConfirmOptions {
  title?: string;
  message?: React.ReactNode;
  okText?: string;
  cancelText?: string;
}

export interface AlertOptions {
  title: string;
  message: React.ReactNode;
  okText?: string;
}

export interface SearchAndSelectUserOptions {
  usersToFilter: string[];
  option: "single" | "multiple";
}

export interface SearchAndSelectGroupOptions {
  groupsToFilter: string[]
}

interface DialogsContextType {
  open: <P, R>(Component: React.ComponentType<DialogProps<P, R>>, payload?: P) => Promise<R | null>;
  confirm: (title: string, options?: ConfirmOptions) => Promise<boolean>;
  alert: (content: React.ReactNode, options?: AlertOptions) => Promise<void>;
  selectSingleUser: (usersToFilter?: string[]) => Promise<User | null>;
  selectMultipleUser: (usersToFilter?: string[]) => Promise<User[] | null>;
  selectGroup: (groupsToFilter?: string[]) => Promise<Group | null>;
  selectSingleOption: <T>(options: { value: T, label: string, icon?: React.ReactNode }[], selectedOption?: T) => Promise<T | null>;
  userProfile: (userId: string) => Promise<void>;
}

const DialogsContext = createContext<DialogsContextType | null>(null);

const DialogsProvider = ({ children }: { children: React.ReactNode }) => {
  const [dialogs, setDialogs] = useState<ActiveDialog[]>([]);

  // Die Kern-Logik: Öffnet eine beliebige Komponente
  const open = useCallback(<P, R>(Component: React.ComponentType<DialogProps<P, R>>, payload?: P) => {
    return new Promise<R | null>((resolvePromise) => {
      const id = Math.random().toString(36).substring(7);

      const handleClose = (result: R | null) => {
        resolvePromise(result);
        // Exit Animation starten
        setDialogs((prev) => prev.map((d) => (d.id === id ? { ...d, open: false } : d)));
        // DOM Cleanup nach 300ms
        setTimeout(() => {
          setDialogs((prev) => prev.filter((d) => d.id !== id));
        }, 300);
      };

      setDialogs((prev) => [
        ...prev,
        { id, Component, payload, open: true, resolve: handleClose },
      ]);
    });
  }, []);

  // Bequemlichkeits-Methoden
  const confirm = useCallback((title: string, options?: ConfirmOptions) => {
    const DEFAULT_CONFIRM_OPTIONS: ConfirmOptions = {
      title: "Sind Sie sich sicher?",
      cancelText: "Abbrechen",
      okText: "Bestätigen",
      message: null,
    }
    return open(ConfirmDialogBase, { ...DEFAULT_CONFIRM_OPTIONS, ...options, title }).then((res) => res ?? false);
  }, [open]);

  const alert = useCallback((content: React.ReactNode, options?: AlertOptions) => {
    const DEFAULT_CONFIRM_OPTIONS: AlertOptions = {
      title: "Sind Sie sich sicher?",
      okText: "Schließen",
      message: null,
    }
    return open(AlertDialogBase, { ...DEFAULT_CONFIRM_OPTIONS, ...options, message: content }).then(() => undefined);
  }, [open]);

  const selectSingleUser = useCallback(async (usersToFilter?: string[]) => {
    const result = await open(SearchAndSelectUserDialogShadcn, { option: 'single', usersToFilter: usersToFilter ?? [] });

    return result as User | null;
  }, [open]);

  const selectMultipleUser = useCallback(async (usersToFilter?: string[]) => {
    const result = await open(SearchAndSelectUserDialogShadcn, { option: 'multiple', usersToFilter: usersToFilter ?? [] });

    return result as User[] | null;
  }, [open]);

  const selectGroup = useCallback(async (groupsToFilter?: string[]) => {
    const result = await open(SearchAndSelectGroupDialogShadcn, { groupsToFilter: groupsToFilter ?? [] });

    return result as Group | null;
  }, [open]);

  const selectSingleOption = useCallback(async <T,>(options: { value: T, label: string, icon?: React.ReactNode }[], selectedOption?: T) => {
    const result = await open(SelectSingleOptionDialog, { options, selectedOption });

    return result as T | null;
  }, [open]);

  const userProfile = useCallback(async (userId: string) => {
    await open(ProfileDialogShadcn, { userId });
  }, [open]);

  return (
    <DialogsContext value={{ open, confirm, alert, selectSingleUser, selectMultipleUser, selectGroup, selectSingleOption, userProfile }}>
      {children}
      {dialogs.map(({ id, Component, payload, open, resolve }) => (
        <Component
          key={id}
          open={open}
          payload={payload}
          onClose={resolve}
        />
      ))}
    </DialogsContext>
  );
}

export const useDialogs = () => {
  const context = use(DialogsContext);
  if (!context) throw new Error('useDialogs must be used within a DialogsProvider');
  return context;
};

// ============================================================================
// INTERNE STANDARD-DIALOGE (Confirm & Alert)
// ============================================================================

const ConfirmDialogBase = ({ open, onClose, payload }: DialogProps<ConfirmOptions, boolean>) => (
  <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{payload.title}</DialogTitle>
        <DialogDescription>{payload.message}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={() => onClose(false)}>
          {payload.cancelText ?? 'Abbrechen'}
        </Button>
        <Button onClick={() => onClose(true)}>
          {payload.okText ?? 'Bestätigen'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const AlertDialogBase = ({ open, onClose, payload }: DialogProps<AlertOptions, void>) => (
  <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{payload.title}</DialogTitle>
        <DialogDescription>{payload.message}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="mt-4">
        <Button onClick={() => onClose(null)}>
          {payload.okText ?? 'OK'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default DialogsProvider;