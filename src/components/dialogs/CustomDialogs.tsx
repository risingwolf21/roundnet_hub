import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DialogProps } from '@toolpad/core/useDialogs';
import { useState } from 'react';

// --- 1. CONFIRM DIALOG (hast du bereits) ---
export interface ConfirmDialogPayload {
  title?: string;
  message: string;
  okText?: string;
  cancelText?: string;
}

export function ShadcnConfirmDialog({ open, onClose, payload }: DialogProps<ConfirmDialogPayload, boolean>) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{payload.title || "Bist du sicher?"}</AlertDialogTitle>
          <AlertDialogDescription>{payload.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onClose(false)}>{payload.cancelText || "Abbrechen"}</AlertDialogCancel>
          <AlertDialogAction onClick={() => onClose(true)}>{payload.okText || "Bestätigen"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- 2. ALERT DIALOG ---
// Ähnlich wie Confirm, aber nur mit einem OK-Button. Löst ohne Rückgabewert auf (void).
export interface AlertDialogPayload {
  title?: string;
  message: string;
  okText?: string;
}

export function ShadcnAlertDialog({ open, onClose, payload }: DialogProps<AlertDialogPayload, void>) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{payload.title || "Hinweis"}</AlertDialogTitle>
          <AlertDialogDescription>{payload.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onClose()}>{payload.okText || "OK"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- 3. PROMPT DIALOG ---
// Nutzt den normalen Dialog, da Texteingaben im AlertDialog manchmal Fokus-Probleme machen können.
export interface PromptDialogPayload {
  title?: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  okText?: string;
  cancelText?: string;
}

export function ShadcnPromptDialog({ open, onClose, payload }: DialogProps<PromptDialogPayload, string | null>) {
  // Lokaler State für die Texteingabe
  const [value, setValue] = useState(payload.defaultValue || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose(value);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(null); }}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{payload.title || "Eingabe erforderlich"}</DialogTitle>
            <DialogDescription>{payload.message}</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={payload.placeholder}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose(null)}>
              {payload.cancelText || "Abbrechen"}
            </Button>
            <Button type="submit">
              {payload.okText || "Bestätigen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}