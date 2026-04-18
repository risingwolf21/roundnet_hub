'use client'

import { AlertTriangle, Table, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { z, type ZodTypeAny } from 'zod'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AppBar } from '@/components/ui/appbar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DialogProps, useDialogs } from '@/contexts/DialogsProvider'
import { useGrants } from '@/features/auth/GrantsContext'
import { supabase } from '@/lib/supabase'
import { groupBy, SUPABASE_PROJECT_REF } from '@/utils'
import { useLocalStorageState } from '@toolpad/core/useLocalStorageState'
import React from 'react'
import { useRunQuery } from '../hooks/use-run-query'
import { DynamicForm } from './dynamic-form'
import { ResultsTable } from './results-table'

// Helper to generate a Zod schema from the table's column definitions
function generateZodSchema(table: any): z.ZodObject<any, any, any> {
  if (!table || !table.columns) {
    return z.object({})
  }

  const shape: Record<string, ZodTypeAny> = {}
  for (const column of table.columns) {
    // We can only edit updatable columns that are not generated
    if (!column.is_updatable || column.is_generated) continue

    let fieldSchema: ZodTypeAny
    const dataType = column.data_type.toLowerCase()

    if (dataType.includes('array')) {
      fieldSchema = z.array(z.any())
    } else if (dataType.includes('int') || dataType.includes('numeric')) {
      fieldSchema = z.number()
    } else if (dataType.includes('bool')) {
      fieldSchema = z.boolean()
    } else if (
      dataType === 'user-defined' &&
      column.enums &&
      Array.isArray(column.enums) &&
      column.enums.length > 0
    ) {
      // Handle enum types
      fieldSchema = z.enum(column.enums as [string, ...string[]])
    } else {
      // Default to string for text, varchar, timestamp, uuid, etc.
      fieldSchema = z.string()
    }

    if (column.is_nullable) {
      fieldSchema = fieldSchema.nullish()
    }

    shape[column.name] = fieldSchema
  }
  return z.object(shape)
}

const getPrimaryKeys = (table: any): string[] => {
  if (!table || !table.primary_keys) {
    return []
  }
  return table.primary_keys.map((pk: any) => pk.name)
}

type EditRowViewProps = {
  table: any
  row: any
  onSuccess: () => void
}

function EditRowView({ payload: {
  table,
  row,
  onSuccess,
}, open, onClose }: DialogProps<EditRowViewProps>) {
  const { mutate: runUpdateQuery, isPending: isUpdatePending } = useRunQuery()
  const formSchema = useMemo(() => generateZodSchema(table), [table])

  const columnInfo = useMemo(() => {
    if (!table || !table.columns) return {}

    const info: Record<string, any> = {}
    for (const column of table.columns) {
      // Only include updatable columns that are not generated
      if (!column.is_updatable || column.is_generated) continue

      const dataType = column.data_type.toLowerCase()
      const displayType =
        dataType === 'user-defined' &&
          column.enums &&
          Array.isArray(column.enums) &&
          column.enums.length > 0
          ? 'enum'
          : dataType

      info[column.name] = {
        data_type: displayType,
        is_nullable: column.is_nullable,
      }
    }
    return info
  }, [table])

  const handleFormSubmit = useCallback(
    (formData: any) => {
      const pks = getPrimaryKeys(table)
      if (pks.length === 0) {
        toast.error('Cannot update row. This table does not have a primary key.')
        return
      }

      const setClauses = Object.entries(formData)
        .map(([key, value]) => {
          if (JSON.stringify(row[key]) === JSON.stringify(value)) return null

          // Find the column type to determine formatting
          const column = table.columns.find((col: any) => col.name === key)
          const dataType = column?.data_type?.toLowerCase() || ''
          const isNullable = column?.is_nullable || false

          let formattedValue

          // Handle empty/null values
          if (
            value === null ||
            value === undefined ||
            (typeof value === 'string' && value.trim() === '')
          ) {
            if (isNullable) {
              formattedValue = 'NULL'
            } else if (dataType.includes('array')) {
              // Non-nullable array, set to empty array
              const jsonObj = JSON.stringify({ [key]: [] })
              formattedValue = `(select ${key} from json_populate_record(null::public."${table.name
                }", '${jsonObj.replace(/'/g, "''")}'))`
            } else {
              // Non-nullable text field, set to empty string
              formattedValue = "''"
            }
          } else if (Array.isArray(value) && value.length === 0) {
            // Explicitly empty array (different from null)
            const jsonObj = JSON.stringify({ [key]: [] })
            formattedValue = `(select ${key} from json_populate_record(null::public."${table.name
              }", '${jsonObj.replace(/'/g, "''")}'))`
          } else if (dataType.includes('array')) {
            // Array type with actual values - use json_populate_record syntax
            const jsonObj = JSON.stringify({ [key]: value })
            formattedValue = `(select ${key} from json_populate_record(null::public."${table.name
              }", '${jsonObj.replace(/'/g, "''")}'))`
          } else if (dataType === 'user-defined' && column?.enums) {
            // Handle enum values - treat as strings with proper escaping
            formattedValue = `'${String(value).replace(/'/g, "''")}'`
          } else if (typeof value === 'string') {
            formattedValue = `'${value.replace(/'/g, "''")}'`
          } else {
            formattedValue = value
          }

          return `"${key}" = ${formattedValue}`
        })
        .filter(Boolean)
        .join(', ')

      if (!setClauses) {
        toast.error('No changes to save')
        onSuccess()
        return
      }

      const whereClauses = pks
        .map((pk) => {
          const value = row[pk]
          const formattedValue =
            typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value
          return `"${pk}" = ${formattedValue}`
        })
        .join(' AND ')

      const updateSql = `UPDATE public."${table.name}" SET ${setClauses} WHERE ${whereClauses};`

      runUpdateQuery({ projectRef: SUPABASE_PROJECT_REF, query: updateSql }, { onSuccess })
    },
    [table, row, runUpdateQuery, onSuccess]
  )

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent variant={"fullscreen"}>
        <DialogHeader variant={"appbar"}>
          <DialogTitle className={"flex-1"}>
            Editing row in {table.name}
          </DialogTitle>
          <DialogClose render={
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full -mr-2">
              <X className="h-5 w-5" />
            </Button>
          } />
        </DialogHeader>
        <DialogBody>
          <DynamicForm
            schema={formSchema}
            initialValues={row}
            onSubmit={handleFormSubmit}
            columnInfo={columnInfo}
            isLoading={isUpdatePending}
          />
        </DialogBody>
      </DialogContent>
    </Dialog >
  )
}

type TableRecordsViewProps = {
  table: any
}

function TableRecordsView({ payload: { table }, open, onClose }: DialogProps<TableRecordsViewProps>) {
  const dialogs = useDialogs();

  const { mutate: runQuery, data, isPending, error } = useRunQuery()

  useEffect(() => {
    runQuery({ projectRef: SUPABASE_PROJECT_REF, query: `SELECT * FROM "${table.schema}"."${table.name}" LIMIT 100;` })
  }, [table, runQuery])

  const handleRowClick = (row: any) => dialogs.open(EditRowView, { table, row, onSuccess: () => { } })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent variant={"fullscreen"} showCloseButton={false}>
        <DialogHeader variant={"appbar"}>
          <DialogTitle className={"flex-1"}>
            {table.schema + "." + table.name}
          </DialogTitle>
          <DialogClose render={
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full -mr-2">
              <X className="h-5 w-5" />
            </Button>
          } />
        </DialogHeader>
        <DialogBody>
          <ResultsTable data={data} onRowClick={(row) => handleRowClick(row)} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export type Table = { name: string; schema: string };

const DatabaseManager = () => {
  const { user } = useGrants();
  const dialogs = useDialogs();
  const [error, setError] = useState<string | null>(null)
  const [tables = [], setTables] = useLocalStorageState<Table[]>('supabase_tables', [], {
    codec: {
      stringify: (data: Table[]) => JSON.stringify(data),
      parse: (raw: string): Table[] => {
        try {
          const parsed = JSON.parse(raw);
          if (
            Array.isArray(parsed) &&
            parsed.every((item) => typeof item.name === 'string' && typeof item.schema === 'string')
          ) {
            return parsed as Table[];
          }
        } catch {
          // ignore
        }
        return [];
      },
    },
  });

  React.useEffect(() => {
    (async () => {
      const result = await supabase.schema('util').rpc('get_public_table_names').select('*');
      const data = result.data ?? [];
      setTables(
        data.map((x: { table_name: string; table_schema: string }) => ({ name: x.table_name, schema: x.table_schema }))
      );

    })().catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableClick = (table: any) => {
    dialogs.open(TableRecordsView, { table })
  }

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={"Datenbank Manager"}
        user={user}
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <div className="p-6 pt-4 lg:p-8 lg:pt-8">

          {error && (
            <Alert variant="destructive" className="mt-8">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error loading tables</AlertTitle>
              <AlertDescription>
                There was a problem loading your database tables.
                <div>
                  {error}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {tables && tables.length > 0 ? (
            <div>
              {groupBy(tables, (x: any) => x.schema).entries().map(([key, groupedTables]) => (
                <div key={key}>
                  <div className='text-base font-bold'>{key}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {
                      groupedTables.map(table => <Button
                        variant="outline"
                        key={table.schema + table.name}
                        size="lg"
                        className="flex-row justify-between text-left"
                        onClick={() => handleTableClick(table)}
                      >
                        <Table className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-sm font-medium font-mono truncate flex-1">{table.name}</h2>
                      </Button>)
                    }
                  </div>
                </div>
              ))}
            </div>
          ) : !error && (!tables || tables.length === 0) ? (
            <Alert className="mt-8">
              <Table className="h-4 w-4" />
              <AlertTitle>No database tables</AlertTitle>
              <AlertDescription>Create tables to store and organize your data.</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </main>
    </div>
  )
}

export default DatabaseManager;