import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Relationship } from '../hooks/use-tables';

interface ForeignKeyPickerProps {
  relationship: Relationship;
  value: any;
  onValueChange: (value: any) => void;
  disabled?: boolean;
}

export function ForeignKeyPicker({ relationship, value, onValueChange, disabled }: ForeignKeyPickerProps) {
  const [open, setOpen] = useState(false);

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['fk-options', relationship.target_table_schema, relationship.target_table_name],
    queryFn: async () => {
      const { data, error } = await supabase
        //@ts-expect-error - supabase-js types sind nicht aktuell mit den neuesten Postgres-Features wie json_populate_record
        .schema(relationship.target_table_schema ?? 'public')
        //@ts-expect-error - supabase-js types sind nicht aktuell mit den neuesten Postgres-Features wie json_populate_record
        .from(relationship.target_table_name)
        .select('*')
        .limit(1000); // Höheres Limit für Suche

      if (error) throw error;
      return data as any[];
    },
  });

  // Finde das aktuell ausgewählte Objekt für das Label
  const selectedOption = options.find(
    (opt) => String(opt[relationship.target_column_name]) === String(value)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button
        variant="outline"
        role="combobox"
        className="w-full justify-between font-mono"
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : selectedOption ? (
          // Zeige Name/Title falls vorhanden, sonst den PK-Wert
          selectedOption.name || selectedOption.title || String(value)
        ) : (
          "Eintrag auswählen..."
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>}>

      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Suchen..." />
          <CommandList>
            <CommandEmpty>Keine Ergebnisse.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const optValue = String(option[relationship.target_column_name]);
                const label = option.name || option.title || optValue;

                return (
                  <CommandItem
                    key={optValue}
                    value={label} // Für die Suche innerhalb der Liste
                    onSelect={() => {
                      onValueChange(optValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        String(value) === optValue ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{label}</span>
                      {label !== optValue && (
                        <span className="text-[10px] text-muted-foreground">ID: {optValue}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}