'use client'

import { Button } from '@/components/ui/button';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

export interface TableMetadata {
  id?: number; // Optional, falls du die interne Postgres OID mitlieferst
  schema: string;
  name: string;
  rls_enabled: boolean;
  rls_forced?: boolean;
  replica_identity?: "DEFAULT" | "NOTHING" | "FULL" | "INDEX";
  bytes?: number;
  size?: string;
  live_rows_estimate?: number;
  dead_rows_estimate?: number;
  comment: string | null;
  primary_keys: PrimaryKey[];
  relationships: Relationship[];
  columns: Column[];
}

export interface PrimaryKey {
  name: string;
  schema?: string;
  table_name?: string;
  table_id?: number;
}

export interface Relationship {
  id?: number;
  source_schema: string;
  constraint_name: string;
  source_table_name: string;
  target_table_name: string;
  source_column_name: string;
  target_column_name: string;
  target_table_schema: string;
}

export interface Column {
  id?: string; // Oft im Format "table_id.ordinal_position"
  table_id?: number;
  schema: string;
  table: string;
  ordinal_position: number;
  name: string;
  default_value: string | null;
  data_type: string;
  format: string;
  is_identity: boolean;
  identity_generation: "BY DEFAULT" | "ALWAYS" | null;
  is_generated: boolean;
  is_nullable: boolean;
  is_updatable: boolean;
  is_unique: boolean;
  check: string | null;
  enums: string[]; // Falls es ein Custom-Type mit festen Werten ist
  comment: string | null;
}

export function generateColumnsFromMetadata(table: TableMetadata): ColumnDef<any, any>[] {
  return table.columns.map((col) => {
    return {
      meta: col.format,
      accessorKey: col.name,
      // Header-Anzeige (Name groß geschrieben oder formatiert)
      header: ({ column }) => {
        return <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {col.name.charAt(0).toUpperCase() + col.name.slice(1)}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      },

      // Zell-Rendering basierend auf dem Typ
      cell: ({ getValue }) => {
        const value = getValue()
        if (value === null || value === undefined) return <span className="text-muted-foreground italic">null</span>

        // Spezial-Formatierung für Datums-Typen
        if (col.format === 'timestamptz' || col.format === 'timestamp') {
          try {
            return format(new Date(value as string), "dd.MM.yyyy HH:mm")
          } catch {
            return String(value)
          }
        }

        // Booleans als kleine Badges oder Text
        if (typeof value === 'boolean') {
          return value ? "✅" : "❌"
        }

        // Lange Texte kürzen
        if (typeof value === 'string' && value.length > 50) {
          return <span title={value}>{value.substring(0, 50)}...</span>
        }

        return String(value)
      },
    }
  })
}

const ALLOWED_SCHEMAS = new Set(['public', 'games', 'notifications']);

export const useListTables = () => {
  return useQuery<TableMetadata[]>({
    queryKey: ['database', 'tables'],
    queryFn: async () => {
      const result = await supabase.schema("util").rpc("get_table_metadata", {
        target_schemas: Array.from(ALLOWED_SCHEMAS)
      });

      // Guard: drop any entries the DB returned for schemas not in our allowlist
      // (prevents schema-cache errors when PostgREST hasn't exposed that schema).
      const rows = (result.data as unknown) as TableMetadata[] | null;
      return rows?.filter(t => ALLOWED_SCHEMAS.has(t.schema)) ?? [];
    },
  })
}

export function useTableMutations(table: TableMetadata) {
  const queryKey = ['table-data', table.schema, table.name];

  // Primärschlüssel ermitteln
  const pkColumns = table.primary_keys.map(pk => pk.name);

  const updateRow = useMutation({
    mutationFn: async (payload: any) => {
      // Wo-Klausel für den Update-Befehl (unterstützt Composite Keys)
      const match = Object.fromEntries(pkColumns.map(k => [k, payload[k]]));

      const { data, error } = await supabase
        // @ts-expect-error - supabase-js types sind nicht aktuell mit den neuesten Postgres-Features wie json_populate_record
        .schema(table.schema)
        // @ts-expect-error - supabase-js types sind nicht aktuell mit den neuesten Postgres-Features wie json_populate_record
        .from(table.name)
        // @ts-expect-error - supabase-js types sind nicht aktuell mit den neuesten Postgres-Features wie json_populate_record
        .update(payload)
        .match(match)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newRow) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistisches Update
      queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
        return old?.map(row => {
          const isMatch = pkColumns.every(pk => row[pk] === newRow[pk]);
          return isMatch ? { ...row, ...newRow } : row;
        });
      });

      return { previousData };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(queryKey, context?.previousData);
      toast.error(`Update fehlgeschlagen: ${err.message}`);
    },
    onSuccess: () => {
      toast.success('Änderungen gespeichert');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  return { updateRow };
}
