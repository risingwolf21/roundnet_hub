import { useDialogs } from '@toolpad/core';
import { AlertDialogPayload, ConfirmDialogPayload, PromptDialogPayload, ShadcnAlertDialog, ShadcnConfirmDialog, ShadcnPromptDialog } from './CustomDialogs';
import SearchAndSelectUserDialogShadcn from './SearchAndSelectUsersDialog.shadcn';

export function useCustomDialogs() {
  const dialogs = useDialogs();

  return {
    // Behalte alle anderen Methoden von Toolpad (wie .open, .closeAll etc.)
    ...dialogs,
    confirm: (message: string, options?: Omit<ConfirmDialogPayload, 'message'>) => {
      return dialogs.open(ShadcnConfirmDialog, { message, ...options });
    },

    // Überschreibt dialogs.alert()
    alert: (message: string, options?: Omit<AlertDialogPayload, 'message'>) => {
      return dialogs.open(ShadcnAlertDialog, { message, ...options });
    },

    // Überschreibt dialogs.prompt()
    prompt: (message: string, options?: Omit<PromptDialogPayload, 'message'>) => {
      return dialogs.open(ShadcnPromptDialog, { message, ...options });
    },

    selectSingleUser: async (usersToFilter: string[] = []): Promise<User | null> => {
      // TypeScript weiß hier garantiert, dass ein User oder null zurückkommt
      const result = await dialogs.open(SearchAndSelectUserDialogShadcn, {
        option: "single",
        usersToFilter
      });

      return result as User | null;
    },

    selectMultipleUsers: async (usersToFilter: string[] = []): Promise<User[] | null> => {
      // TypeScript weiß hier garantiert, dass ein Array oder null zurückkommt
      const result = await dialogs.open(SearchAndSelectUserDialogShadcn, {
        option: "multiple",
        usersToFilter
      });

      return result as User[] | null
    }

    // Optional: Hier könntest du auch alert() oder prompt() mit shadcn überschreiben!
  };
}