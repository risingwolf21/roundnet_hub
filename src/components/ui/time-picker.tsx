import { format, isValid, parse, set } from "date-fns"
import { useState } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"


type Props = {
  id?: string;
  name?: string;
  value: Date | undefined;
  onValueChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const TimePicker = ({
  value,
  onValueChange,
  placeholder = "12:30",
  id,
  name,
  className,
  disabled
}: Props) => {
  // 1. Speichere den Prop-Wert des letzten Renders, um Änderungen zu erkennen
  const [prevValue, setPrevValue] = useState<Date | undefined>(value);

  // 2. Lokaler State für flüssiges Tippen
  const [localTime, setLocalTime] = useState<string>(
    value ? format(value, "HH:mm") : ""
  );

  // 3. State-Sync DIREKT im Render (Kein useEffect, kein Double-Render!)
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalTime(value ? format(value, "HH:mm") : "");
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTimeStr = e.target.value;

    // UI sofort aktualisieren
    setLocalTime(newTimeStr);

    if (!newTimeStr) return;

    // String zu einem validen Datum parsen
    const parsedDate = parse(newTimeStr, "HH:mm", new Date());

    if (isValid(parsedDate)) {
      // Existierendes Datum nehmen (oder das heutige, falls noch keines gewählt wurde)
      const baseDate = value ? new Date(value) : new Date();

      // Nur die Uhrzeit auf das Datum anwenden
      const updatedDate = set(baseDate, {
        hours: parsedDate.getHours(),
        minutes: parsedDate.getMinutes(),
        seconds: 0,
        milliseconds: 0,
      });

      // Das fertige Date-Objekt an den Parent zurückgeben
      onValueChange(updatedDate);
    }
  };

  return (
    <Input
      type="time"
      id={id}
      name={name}
      step="60"
      placeholder={placeholder}
      disabled={disabled}
      value={localTime}
      onChange={handleTimeChange}
      className={cn(
        "appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none w-[120px]",
        className
      )}
    />
  )
}