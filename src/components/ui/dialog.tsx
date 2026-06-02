"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { cva, VariantProps } from "class-variance-authority"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

const dialogContentVariants = cva(
  "fixed z-50 bg-popover duration-300 data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0 outline-none shadow-lg",
  {
    variants: {
      variant: {
        default:
          "top-1/2 left-1/2 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 sm:max-w-sm data-open:zoom-in-95 data-closed:zoom-out-95",

        drawer:
          "inset-x-0 bottom-0 flex flex-col w-full max-h-[95dvh] rounded-t-xl border-t p-0 sm:max-w-lg sm:mx-auto data-open:slide-in-from-bottom-full data-closed:slide-out-to-bottom-full pb-[env(safe-area-inset-bottom)]",

        fullscreen:
          // HIER GEÄNDERT: pt-safe-top und pb-safe-bottom entfernt. 
          // Der Wrapper ist exakt inset-0, die Paddings übernehmen Header und Footer!
          "inset-0 flex flex-col w-full h-[100dvh] max-w-none rounded-none border-0 p-0 data-open:zoom-in-95 data-closed:zoom-out-95 bg-background text-foreground"
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Popup>,
  VariantProps<typeof dialogContentVariants> {
}

function DialogContent({
  className,
  variant,
  children,
  ...props
}: DialogContentProps) {
  const needsFlexWrapper = variant === "drawer" || variant === "fullscreen";

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(dialogContentVariants({ variant }), className)}
        {...props}
      >
        {needsFlexWrapper ? (
          <div className="flex flex-col overflow-hidden h-full w-full">
            {children}
          </div>
        ) : (
          children
        )}

      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

// --- NEU: Dialog Header mit AppBar Variant ---
const dialogHeaderVariants = cva("flex flex-col", {
  variants: {
    variant: {
      default: "gap-2 p-4",
      appbar: "pt-safe-top sticky top-0 z-50 w-full bg-background/95 supports-[backdrop-filter]:bg-background border-b shadow-sm shrink-0",
    }
  },
  defaultVariants: { variant: "default" }
});

export interface DialogHeaderProps extends React.ComponentProps<"div">, VariantProps<typeof dialogHeaderVariants> {
  showCloseButton?: boolean; // Optionales Prop, um den Close Button anzuzeigen
}

function DialogHeader({ className, variant, children, showCloseButton = true, ...props }: DialogHeaderProps) {
  if (variant === "appbar") {
    return (
      <div data-slot="dialog-header" className={cn(dialogHeaderVariants({ variant }), className)} {...props}>
        {/* Das innere div steuert die 56px (h-14) Höhe und das Padding (wie in deiner AppBar) */}
        <div className="flex h-14 w-full items-center gap-4 px-4 flex-row justify-between">
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              render={
                <Button variant="ghost" className="z-50" size="icon-sm">
                  <XIcon />
                  <span className="sr-only">Close</span>
                </Button>
              }
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-slot="dialog-header" className={cn(dialogHeaderVariants({ variant }), className, "flex flex-row justify-between")} {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close
          data-slot="dialog-close"
          render={
            <Button variant="ghost" className="z-50" size="icon-sm">
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          }
        />
      )}
    </div>
  )
}

// --- NEU: DialogBody für scrollbaren Content ---
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      // flex-1 sorgt dafür, dass sich der Bereich den Platz zwischen Header und Footer nimmt.
      // overflow-y-auto macht genau diesen Zwischenbereich scrollbar.
      className={cn("flex-1 flex flex-col overflow-y-auto p-4", className)}
      {...props}
    />
  )
}

// --- NEU: Dialog Footer mit Fullscreen Variant ---
const dialogFooterVariants = cva("flex", {
  variants: {
    variant: {
      default: "flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
      fullscreen: "mt-auto shrink-0 flex-col-reverse gap-2 border-t bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end",
    }
  },
  defaultVariants: { variant: "default" }
});

export interface DialogFooterProps extends React.ComponentProps<"div">, VariantProps<typeof dialogFooterVariants> {
  showCloseButton?: boolean;
}

function DialogFooter({ className, variant, showCloseButton = false, children, ...props }: DialogFooterProps) {
  return (
    <div data-slot="dialog-footer" className={cn(dialogFooterVariants({ variant }), className)} {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline">Schließen</Button>} />
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      // Etwas dicker und tracking-tight für den AppBar Look
      className={cn("text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody, // Vergiss nicht den Export hier!
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger
}
