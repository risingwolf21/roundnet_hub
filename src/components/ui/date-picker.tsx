"use client"

import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { de } from "date-fns/locale"

type Props = {
  id?: string;
  name?: string;
  value: Date | undefined;
  onValueChange: (date: Date | undefined) => void;
  placeholder?: string;
  dateFormat?: string;
  className?: string;
}

export const DatePicker = ({ value, onValueChange, placeholder, dateFormat, id, name, className }: Props) => {

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            data-empty={!value}
            className={cn("justify-start text-left font-normal",
              !value && "text-muted-foreground",
              className)}
          />
        }
      >
        <CalendarIcon />
        {value ? format(value, dateFormat ?? "PPP", { locale: de }) : <span>{placeholder ?? 'Pick a date'}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar id={id} mode="single" selected={value} onSelect={(date) => onValueChange(date)} />
      </PopoverContent>
    </Popover>
  )
}