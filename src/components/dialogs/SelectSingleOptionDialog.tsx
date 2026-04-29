import { DialogProps } from "@/contexts/DialogsProvider"
import React from "react"
import { v4 } from "uuid"
import { Dialog, DialogBody, DialogContent } from "../ui/dialog"
import { Item, ItemContent, ItemTitle } from "../ui/item"

type Props<T> = {
  options: { value: T, label: string, icon?: React.ReactNode }[]
  selectedOption?: T
}

export const SelectSingleOptionDialog = <T,>({ open, onClose, payload }: DialogProps<Props<T>, T | null>) => {

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent variant={"drawer"}>
      <DialogBody>
        <div className={"p-8 flex flex-col gap-4"}>
          {
            payload.options.map((option) => (
              <Item
                key={v4()}
                variant={"outline"}
                className={payload.selectedOption === option.value ? "border-primary bg-primary/10 text-primary" : ""}
                onClick={() => onClose(option.value)}>
                <ItemContent>
                  <ItemTitle>
                    {option.icon}
                    {option.label}
                  </ItemTitle>
                </ItemContent>
              </Item>
            ))
          }
        </div>
      </DialogBody>
    </DialogContent>
  </Dialog>
}